# Proposal: Expurgo de OSs Zumbis/Antigas e Blindagem de Consulta do Pátio Ativo (355)

## Problema
O grid de Gestão de Pátio e o Wizard de Importação estavam listando OSs espúrias de meses/anos anteriores (ex: `#1868` de 2020, `#386` de janeiro/2026, `#8889` de julho/2026 e OSs artificiais com sufixo `#386Faturamento`, `#8659Faturamento`, `#8768Faturamento`). Isso polui a tela do operador com dados inexistentes na conciliação real e distorce os totais de pátio em aberto.

---

## Solução Proposta (Foco em Higienização de Dados e Blindagem de Schema)

### 1. Migration de Limpeza no Supabase (`20260902000022_cleanup_patio_os_zombies.sql`)
- Deletar fisicamente registros com `os_number ILIKE '%faturamento%'` da tabela `patio_os`.
- Deletar registros com datas anteriores a `2026-07-01` ou anos anteriores (`2020`, etc.) que não constam nas conciliações ativas.
- Garantir que apenas as 53 OSs legítimas da planilha oficial `CONCILIAÇÃO 0109.xlsx` permaneçam ativas no pátio de 01/09/2026.

### 2. Blindagem da RPC `get_pending_patio_os_for_ocr`
- Adicionar cláusula defensiva `AND p.os_number NOT ILIKE '%faturamento%'`.
- Adicionar filtro de janela temporal razoável (`opened_at >= (p_target_date - INTERVAL '90 days')`).
- Retornar estritamente as OSs válidas para o operador.

---

## Investigação e Análise de Reuso (Relatório dos Subagentes)
- **Tabelas / RPCs Existentes:**
  - `patio_os`: Continha 8 registros espúrios identificados.
  - `get_pending_patio_os_for_ocr`: Será atualizada via `CREATE OR REPLACE FUNCTION` com os novos guardrails.

---

## Contratos de Dados & SQL (Supabase)
- Criação do script de migration `supabase/migrations/20260902000022_cleanup_patio_os_zombies.sql`.

---

## Risco Principal e Mitigação
- **Risco:** Apagar inadvertidamente uma OS recente em aberto.
- **Mitigação:** O filtro de deleção é ultra restritivo: apenas `os_number ILIKE '%faturamento%'` e `opened_at < '2026-07-01'`. As 53 OSs de agosto/setembro são 100% preservadas.
