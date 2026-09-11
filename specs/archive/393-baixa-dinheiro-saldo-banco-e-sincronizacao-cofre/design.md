# Design: Spec 393 — Sincronização de Baixa de Dinheiro no Saldo Bancário e Correção Canônica do Dinheiro no Cofre

## 1. Arquitetura e Fluxo de Dados

```mermaid
flowchart TD
    subgraph "1. Estado Inicial (Dinheiro no Cofre)"
        OS[OS Paga em Dinheiro no Balcão] --> Vault[store_cash_vault: status 'em_transito']
        Vault --> RPC1[get_daily_reconciliation_summary: dinheiro_loja > 0]
        RPC1 --> Modal[SaldoBancosDetailModal: Botão 'Dar Baixa']
        RPC1 --> CardCofre[ResumoDiaPanel: Dinheiro no Cofre]
    end

    subgraph "2. Ação do Usuário"
        Modal --> BaixaModal[BaixaDinheiroModal: Seleciona Itens / Confirma Depósito]
        BaixaModal --> CallRPC[RPC dar_baixa_dinheiro(vault_id, amount, deposit_date)]
    end

    subgraph "3. Efeito Fiduciário Atômico no Banco"
        CallRPC --> UpdateVault[store_cash_vault: status = 'depositado', deposited_at = deposit_date]
        CallRPC --> UpdateRecon[reconciliations: bank_total = bank_total + amount_deposited]
        CallRPC --> UpdateSnap[daily_snapshots: recalcula saldo_bancario, dinheiro_lojas, caixa_atual]
    end

    subgraph "4. Reatividade Imediata no Frontend"
        CallRPC --> Invalidate[queryClient.invalidateQueries]
        Invalidate --> RefreshRPC[get_daily_reconciliation_summary]
        RefreshRPC --> ResultCard[Hero Card: Saldo Bancos + Dinheiro Consolidado Atualizado]
        RefreshRPC --> ResultModal[Raio-X: Linha da Filial com Saldo Banco Incrementado e Cofre Zerado]
    end
```

---

## 2. Detalhamento das Mutações no Banco de Dados

### 2.1 RPC `dar_baixa_dinheiro`
```sql
CREATE OR REPLACE FUNCTION public.dar_baixa_dinheiro(
    p_vault_id UUID DEFAULT NULL,
    p_os_number TEXT DEFAULT NULL,
    p_store_id TEXT DEFAULT NULL,
    p_amount_to_deposit NUMERIC DEFAULT NULL,
    p_deposit_date DATE DEFAULT CURRENT_DATE,
    p_ofx_id UUID DEFAULT NULL,
    p_user_email TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_updated_count INT := 0;
    v_target_vault store_cash_vault%ROWTYPE;
    v_remaining NUMERIC;
    v_amount_deposited NUMERIC := 0;
    v_target_store TEXT;
    v_dep_date DATE := COALESCE(p_deposit_date, CURRENT_DATE);
BEGIN
    IF p_vault_id IS NOT NULL THEN
        SELECT * INTO v_target_vault FROM store_cash_vault WHERE id = p_vault_id;
        IF NOT FOUND THEN
            RETURN jsonb_build_object('success', false, 'error', 'Registro de cofre nao encontrado');
        END IF;

        v_target_store := v_target_vault.store_id;

        IF p_amount_to_deposit IS NOT NULL AND p_amount_to_deposit > 0 AND p_amount_to_deposit < v_target_vault.amount THEN
            v_remaining := v_target_vault.amount - p_amount_to_deposit;
            v_amount_deposited := p_amount_to_deposit;
            
            UPDATE store_cash_vault 
            SET amount = v_remaining
            WHERE id = v_target_vault.id;

            INSERT INTO store_cash_vault (
                store_id, amount, description, entry_date, status, deposited_at, deposited_by, os_number_ref, patio_os_id, matched_ofx_id
            ) VALUES (
                v_target_vault.store_id, p_amount_to_deposit, 
                COALESCE(v_target_vault.description, 'Depósito Caixa Loja') || ' (Baixa Parcial)',
                v_target_vault.entry_date, 'depositado', 
                COALESCE(v_dep_date::timestamptz, now()), p_user_email,
                v_target_vault.os_number_ref, v_target_vault.patio_os_id, p_ofx_id
            );
            v_updated_count := 1;
        ELSE
            v_amount_deposited := COALESCE(p_amount_to_deposit, v_target_vault.amount);
            UPDATE store_cash_vault
            SET status = 'depositado',
                deposited_at = COALESCE(v_dep_date::timestamptz, now()),
                deposited_by = p_user_email,
                matched_ofx_id = COALESCE(p_ofx_id, matched_ofx_id)
            WHERE id = p_vault_id
            RETURNING * INTO v_target_vault;
            v_updated_count := 1;
        END IF;

    ELSIF p_store_id IS NOT NULL AND p_os_number IS NOT NULL THEN
        v_target_store := p_store_id;
        v_amount_deposited := COALESCE(p_amount_to_deposit, 0);

        SELECT * INTO v_target_vault 
        FROM store_cash_vault 
        WHERE store_id = p_store_id AND os_number_ref = p_os_number AND status = 'em_transito'
        ORDER BY created_at DESC LIMIT 1;

        IF NOT FOUND THEN
            INSERT INTO store_cash_vault (
                store_id, amount, description, entry_date, status, deposited_at, deposited_by, os_number_ref, matched_ofx_id
            ) VALUES (
                p_store_id, v_amount_deposited,
                'Depósito Dinheiro OS #' || p_os_number,
                v_dep_date,
                'depositado', COALESCE(v_dep_date::timestamptz, now()),
                p_user_email, p_os_number, p_ofx_id
            ) RETURNING * INTO v_target_vault;
            v_updated_count := 1;
        ELSE
            UPDATE store_cash_vault
            SET status = 'depositado',
                deposited_at = COALESCE(v_dep_date::timestamptz, now()),
                deposited_by = p_user_email,
                matched_ofx_id = COALESCE(p_ofx_id, matched_ofx_id)
            WHERE id = v_target_vault.id
            RETURNING * INTO v_target_vault;
            v_updated_count := 1;
        END IF;
    ELSE
        RAISE EXCEPTION 'Informe p_vault_id ou (p_store_id + p_os_number) para efetuar a baixa.';
    END IF;

    -- EFETIVAÇÃO FIDUCIÁRIA NO SALDO BANCÁRIO DA FILIAL:
    -- Quando o dinheiro é depositado, ele passa a compor o saldo bancário da loja na data do depósito
    IF v_amount_deposited > 0 AND v_target_store IS NOT NULL THEN
        UPDATE public.reconciliations
        SET bank_total = COALESCE(bank_total, 0) + v_amount_deposited
        WHERE store_id = v_target_store AND date = v_dep_date;

        -- Sincroniza também o snapshot se existente
        UPDATE public.daily_snapshots
        SET saldo_bancario = COALESCE(saldo_bancario, 0) + v_amount_deposited,
            dinheiro_lojas = GREATEST(0, COALESCE(dinheiro_lojas, 0) - v_amount_deposited),
            updated_at = now()
        WHERE date = v_dep_date;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'updated_count', v_updated_count,
        'store_id', v_target_store,
        'amount_deposited', v_amount_deposited,
        'deposit_date', v_dep_date
    );
END;
$$;
```

### 2.2 Correção da CTE `vault_agg` em `get_daily_reconciliation_summary`
```sql
vault_agg AS (
    SELECT 
        TRIM(store_id::text) as store_id,
        COALESCE(SUM(amount), 0) as vault_total
    FROM store_cash_vault
    WHERE entry_date <= v_target_date::date
      AND (
          status IN ('em_transito', 'pending') 
          OR (status = 'depositado' AND deposited_at::date > v_target_date::date)
      )
    GROUP BY TRIM(store_id::text)
)
```

E a apuração de `v_dinheiro_lojas`:
```sql
SELECT COALESCE(SUM(amount), 0) INTO v_dinheiro_lojas
FROM store_cash_vault
WHERE entry_date <= v_target_date::date
  AND (
      status IN ('em_transito', 'pending') 
      OR (status = 'depositado' AND deposited_at::date > v_target_date::date)
  );
```

---

## 3. Mutações em Arquivos Existentes [MODIFY]

- `supabase/migrations/20260910000046_fix_cash_vault_deposit_and_summary_alignment.sql`:
  - Recriação de `dar_baixa_dinheiro` com atualização de saldo bancário.
  - Recriação de `get_daily_reconciliation_summary` com apuração temporal e status fiduciário estrito de `store_cash_vault`.
  - Backfill corretivo para 10/09/2026 (incorporando os R$ 3.000,00 de Santo André e R$ 220,00 de Jorge Beretta ao `bank_total`).
- `src/components/conciliacao/ResumoDiaPanel.tsx`:
  - Alinhar o Hero Card `SALDO BANCOS + DINHEIRO` com o valor consolidado líquido do Raio-X.
  - Exibir chip "Dinheiro no Cofre" lendo diretamente o valor acumulado em trânsito.
- `src/components/conciliacao/BaixaDinheiroModal.tsx`:
  - Garantir invalidação de queryKeys completas e feedback visual pós-baixa.

---

## 4. Cenários de Verificação (SCAN → INFER → VERIFY → FIX)

### Cenário 1: Consulta ao Resumo Diário de 10/09/2026
- **Estado Inicial:** Card exibia R$ 188.903,12 e Dinheiro no cofre R$ 380,00; Raio-X exibia R$ 178.949,44 e Dinheiro R$ 880,00.
- **Ação:** Aplicar migration com filtros canônicos e backfill.
- **Resultado Esperado:** 
  - Saldo banco de Santo André passa para R$ 6.324,97 (R$ 3.324,97 + R$ 3.000,00).
  - Saldo banco de Jorge Beretta passa para R$ 55.620,75 (R$ 55.400,75 + R$ 220,00).
  - Dinheiro no cofre consolidado exibe exatamente R$ 880,00 (Mauá R$ 380 + Jabaquara R$ 500).
  - O valor do Hero Card reflete com perfeição o valor consolidado do Raio-X.

### Cenário 2: Dar Baixa em Dinheiro Restante (ex: Mauá R$ 380,00)
- **Estado Inicial:** Mauá possui R$ 380,00 no cofre e R$ 3.756,96 no banco.
- **Ação:** Clicar em "Dar Baixa" no modal de Raio-X para Mauá.
- **Resultado Esperado:**
  - O dinheiro no cofre de Mauá zera.
  - O saldo bancário de Mauá sobe imediatamente para R$ 4.136,96 (3.756,96 + 380,00).
  - O patrimônio total permanece preservado (o dinheiro não evapora, apenas migra da coluna de cofre para a coluna de banco).
