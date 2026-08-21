# Design: Atualização de OSs Pendentes & Conciliação Automática com Transações Órfãs (260)

## Arquitetura Técnica

```
[Importação de Extrato OFX + Planilhas de OS do Dia]
                      │
                      ▼
[CentralImportWizard: Gravação das Transações e OSs]
                      │
                      ▼
[Supabase RPC: auto_match_transactions(p_date)]
                      │
         ┌────────────┴─────────────────────────────┐
         │                                          │
         ▼                                          ▼
[Filtro 1: OFX x OSs Pendentes]            [Filtro 2: OFX x Rede / Maquininha]
- Busca patio_os com status em_aberto/pago_parcial - Acumula lotes de cartões
- Match por total_value, pix_transfer,             - Match por valor total de lote
  ou saldo_pendente (total - paid)                 - Atualiza pos_transactions.matched_os_number
- store_id estrito (mesma filial)
         │                                          │
         └────────────┬─────────────────────────────┘
                      │
                      ▼
[Atualização em Cascata]:
1. INSERT INTO conciliation_matches (store_id, target_date, system_os_number, ofx_transaction_id...)
2. UPDATE ofx_transactions SET matched_os_number = os.os_number
3. UPDATE patio_os SET 
     paid_value = LEAST(os.total_value, os.paid_value + ofx.amount),
     status = CASE WHEN os.paid_value + ofx.amount >= os.total_value THEN 'finalizado' ELSE 'pago_parcial' END,
     closed_at = CASE WHEN os.paid_value + ofx.amount >= os.total_value THEN p_date ELSE os.closed_at END,
     matched_ofx_id = ofx.id
```

## Migration SQL Proposta (`20260821000010_auto_match_pending_os.sql`)

```sql
CREATE OR REPLACE FUNCTION auto_match_transactions(p_date date)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    ofx_record RECORD;
    rede_record RECORD;
    os_record RECORD;
    v_target_amount numeric;
    v_accumulated numeric;
    v_rede_ids uuid[];
    v_count_matched_os int := 0;
    v_count_matched_rede int := 0;
BEGIN
    IF p_date IS NULL THEN
        RAISE EXCEPTION 'Data obrigatória para conciliação.';
    END IF;

    -- Loop em cada transação OFX de entrada órfã (matched_os_number IS NULL)
    FOR ofx_record IN 
        SELECT id, amount, store_id, matched_os_number
        FROM public.ofx_transactions 
        WHERE (target_date = p_date OR DATE(occurred_at) = p_date)
          AND type = 'in' 
          AND matched_os_number IS NULL
    LOOP
        v_target_amount := ofx_record.amount;

        -- 1. Tentativa 1: Parear com OSs Pendentes do Pátio (em aberto ou pago parcial) da mesma filial
        -- Prioridade A: Saldo Pendente Exato (total_value - paid_value)
        -- Prioridade B: Valor Total / PIX (total_value ou pix_transfer_value)
        SELECT id, os_number, total_value, paid_value, (total_value - COALESCE(paid_value, 0)) as pending_balance
        INTO os_record
        FROM public.patio_os
        WHERE store_id = ofx_record.store_id
          AND matched_ofx_id IS NULL
          AND status IN ('em_aberto', 'pago_parcial')
          AND (
              ABS((total_value - COALESCE(paid_value, 0)) - v_target_amount) < 0.05
              OR ABS(COALESCE(pix_transfer_value, total_value, 0) - v_target_amount) < 0.05
          )
        ORDER BY 
          -- Prioriza o que tem saldo pendente mais próximo
          ABS((total_value - COALESCE(paid_value, 0)) - v_target_amount) ASC,
          opened_at DESC
        LIMIT 1;

        IF FOUND THEN
            -- Atualiza a OS no Pátio com a baixa financeira
            UPDATE public.patio_os 
            SET 
                paid_value = LEAST(total_value, COALESCE(paid_value, 0) + v_target_amount),
                status = CASE 
                    WHEN (COALESCE(paid_value, 0) + v_target_amount) >= (total_value - 0.05) THEN 'finalizado' 
                    ELSE 'pago_parcial' 
                END,
                closed_at = CASE 
                    WHEN (COALESCE(paid_value, 0) + v_target_amount) >= (total_value - 0.05) THEN p_date 
                    ELSE closed_at 
                END,
                matched_ofx_id = ofx_record.id
            WHERE id = os_record.id;

            -- Vincula no OFX
            UPDATE public.ofx_transactions 
            SET matched_os_number = os_record.os_number 
            WHERE id = ofx_record.id;

            -- Registra o pareamento na tabela de conciliação
            INSERT INTO public.conciliation_matches (
                store_id,
                target_date,
                system_os_number,
                ofx_transaction_id,
                status,
                divergence_amount
            ) VALUES (
                ofx_record.store_id,
                p_date,
                os_record.os_number,
                ofx_record.id,
                'matched',
                0
            ) ON CONFLICT DO NOTHING;

            v_count_matched_os := v_count_matched_os + 1;
            CONTINUE;
        END IF;

        -- 2. Tentativa 2: Parear com Lotes de Cartão (Rede) da mesma loja
        v_accumulated := 0;
        v_rede_ids := '{}'::uuid[];

        FOR rede_record IN
            SELECT id, net_amount, matched_os_number 
            FROM public.pos_transactions 
            WHERE (target_date = p_date OR DATE(occurred_at) = p_date)
              AND matched_os_number IS NULL 
              AND store_id = ofx_record.store_id
            ORDER BY occurred_at DESC, net_amount DESC
        LOOP
            v_accumulated := v_accumulated + rede_record.net_amount;
            v_rede_ids := array_append(v_rede_ids, rede_record.id);

            IF ABS(v_accumulated - v_target_amount) < 0.05 THEN
                UPDATE public.pos_transactions SET matched_os_number = ofx_record.id::text WHERE id = ANY(v_rede_ids);
                UPDATE public.ofx_transactions SET matched_os_number = 'LOTE_REDE_' || ofx_record.id::text WHERE id = ofx_record.id;
                v_count_matched_rede := v_count_matched_rede + 1;
                EXIT;
            END IF;

            IF v_accumulated > v_target_amount THEN
                v_accumulated := v_accumulated - rede_record.net_amount;
                v_rede_ids := array_remove(v_rede_ids, rede_record.id);
            END IF;
        END LOOP;

    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'date', p_date,
        'matched_os_count', v_count_matched_os,
        'matched_rede_count', v_count_matched_rede
    );
END;
$$;
```

## Melhorias na UI (`CentralImportWizard.tsx`)
- Card de OS no topo: Exibir o **Delta do Dia** (novos pagamentos) e o **Estoque Total em Pátio (OSs Ativas)**.
- Notificação de auto-healing exibindo quantas OSs foram baixadas e integradas.

## Cenários de Verificação
- **Cenário 1 (OS aberta no pátio há 10 dias com saldo de R$ 1.500,00):**
  - Extrato OFX traz PIX de R$ 1.500,00 daquela filial no dia 21.
  - O motor encontra a OS pelo saldo pendente, baixa o status para `finalizado`, preenche `closed_at = 21/08/2026` e cria o match.
- **Cenário 2 (OS com valor parcial):**
  - OS de R$ 3.000 com R$ 1.000 pago anteriormente (saldo pendente de R$ 2.000).
  - Entra PIX de R$ 2.000.
  - OS é quitada com `paid_value = 3000` e status `finalizado`.
- **Cenário 3 (Lote de cartões Rede):**
  - Grupo de 3 transações Rede somando R$ 3.357,88 recebido em 1 crédito bancário no OFX.
  - Match automático de lote é criado sem deixar transação órfã.
