# Proposal: Guia Ativo de Cobrança de Prints de OS por Loja (Feature 346)

## Problema
No fluxo atual de importação de virada de mês, ao abrir o modal de OCR, as lojas apareciam com "0 pátio / R$ 0,00", e o modal agia como um receptor passivo de prints (mostrando apenas o que já foi importado). 

O operador da conciliação precisa do **oposto**: o sistema deve ser um **Guia Ativo de Cobrança**, indicando para cada uma das 10 filiais **quais são exatamente as Ordens de Serviço (Nº OS, Placa, Cliente, Valor e Dias em Pátio) que o operador precisa ir no ERP Oficina Inteligente, abrir na tela e tirar o print da aba Pagamentos**.

---

## Solução Proposta (Foco em Reuso e Guia Ativo)

Transformar a esteira de OCR em um **Guia Ativo de Missão e Cobrança por Filial**:
1. **RPC `get_pending_patio_os_for_ocr(p_target_date)`**: Consulta inteligente e tolerante a casing no banco que mapeia todas as OSs em aberto até a data alvo para as 10 lojas.
2. **Guia de Missão por Filial (`OcrBatchStoreCarryoverList.tsx`)**:
   - Para cada filial, exibe o checklist de OSs a cobrar: `[⚠️ Aguardando Print]` $\to$ `[✅ Print Capturado]`.
   - Contador em tempo real: `Mauá: 3 OSs para buscar (1 capturada, 2 pendentes)`.
   - **Botão "Copiar Lista WhatsApp"**: Gera texto formatado com as OSs da loja para enviar no WhatsApp da equipe da filial.
   - **Botão "+ Adicionar OS Extra"**: Permite incluir OSs adicionais descobertas no ERP durante a virada.
3. **Auto-Pareamento Visual no Modal (`OcrBatchOsModal.tsx`)**:
   - Ao colar o print (`Ctrl+V`), o sistema identifica o `os_number` extraído pelo Mistral Vision e **marca imediatamente como concluída no checklist da loja correspondente**.

---

## Investigação e Análise de Reuso (Relatório dos Subagentes)

- **Tabelas / RPCs Existentes Encontradas:**
  - `public.patio_os` possui colunas `store_id`, `os_number`, `client_name`, `plate`, `total_value`, `paid_value`, `status`, `opened_at`, `days_open`.
  - Reutilizamos a RPC `batch_upsert_patio_os` recém-criada na migration 20 para o salvamento atômico e `auto_match_daily_transactions` para o pareamento bancário.
  - Criamos a RPC `get_pending_patio_os_for_ocr` para entregar os dados consolidados para a UI sem recálculo manual.
- **Componentes / Hooks Existentes Encontrados:**
  - `src/components/importacoes/OcrBatchStoreCarryoverList.tsx`: Reestruturado de lista passiva para o **Guia Ativo de Cobrança**.
  - `src/components/importacoes/OcrBatchOsModal.tsx`: Atualizado com orquestração do checklist ativo e layout ampliado.
  - `src/hooks/useOcrOsProcessor.ts`: Reutilizado com o motor Mistral Pixtral-12B e JSON Mode.

---

## Contratos de Dados & SQL (Supabase)

### RPC: `public.get_pending_patio_os_for_ocr(p_target_date DATE)`
```sql
CREATE OR REPLACE FUNCTION public.get_pending_patio_os_for_ocr(
    p_target_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_object_agg(
        st.id,
        COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', p.id,
                        'os_number', p.os_number,
                        'store_id', p.store_id,
                        'store_name', st.name,
                        'client_name', COALESCE(p.client_name, 'Cliente'),
                        'plate', COALESCE(p.plate, 'S/ Placa'),
                        'total_value', COALESCE(p.total_value, 0),
                        'paid_value', COALESCE(p.paid_value, 0),
                        'open_value', GREATEST(0, COALESCE(p.total_value, 0) - COALESCE(p.paid_value, 0)),
                        'status', p.status,
                        'days_open', COALESCE(p.days_open, 1),
                        'opened_at', p.opened_at
                    ) ORDER BY p.os_number
                )
                FROM public.patio_os p
                WHERE p.store_id = st.id
                  AND p.opened_at::date <= p_target_date
                  AND (
                      LOWER(p.status) NOT IN ('finalizada', 'finalizado', 'faturado', 'concluida', 'cancelada')
                      OR (p.total_value - p.paid_value) > 0.05
                  )
            ),
            '[]'::jsonb
        )
    ) INTO v_result
    FROM public.stores st
    WHERE st.active = true;

    RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;
```

---

## API & Componentes (Frontend)

- `[MODIFY] OcrBatchStoreCarryoverList.tsx`: Transforma-se no Guia Ativo com cards de OSs, checklist `[⚠️ Pendente] -> [✅ Capturada]`, botão de cópia para WhatsApp e modal rápido de OS extra.
- `[MODIFY] OcrBatchOsModal.tsx`: Integração da RPC `get_pending_patio_os_for_ocr`, tracking em tempo real de OSs capturadas vs pendentes por filial e injeção atômica.
- `[MODIFY] OcrBatchDropzoneAndPaste.tsx`: Foco na loja selecionada e gatilho com feedback sonoro/visual de match.

---

## Risco Principal e Mitigação
- **Risco:** Ausência de registros prévios no banco durante a implantação inicial deixar a lista de OSs vazia.
- **Mitigação:** Suporte completo ao botão **"+ Adicionar OS Extra"** diretamente na interface de cada loja e sincronização com snapshots anteriores de fechamento.
