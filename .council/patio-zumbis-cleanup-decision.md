# 🏛️ Conselho Deliberativo: Expurgo de OSs Zumbis e Blindagem do Pátio Ativo

**Data:** 02/09/2026  
**Tema:** OSs antigas/zumbis (ex: ano 2020, janeiro/2026, sufixo "Faturamento") aparecendo indevidamente no Pátio Manual e Wizard.

---

## Rodada 1 — Diagnóstico das Personas

1. **O Pragmático:**
   - Existem exatamente 8 registros espúrios em `patio_os` criados por testes passados ou importações incorretas (ex: `#1868` de 2020, `#386` de janeiro, `#8659Faturamento`).
   - A planilha oficial de 01/09/2026 possui exatamente as 53 OSs que compõem o pátio real. Limpar o lixo do banco e alinhar a consulta resolve a raiz do problema.

2. **O Cético:**
   - Se a RPC `get_pending_patio_os_for_ocr` continuar usando apenas `WHERE opened_at <= p_target_date AND status IN ('em_aberto')`, qualquer OS esquecida em aberto há 6 anos continuará poluindo a tela.
   - Precisamos de uma migration corretiva para expurgar registros espúrios (`%Faturamento%`, datas < 2026 ou OSs inexistentes na conciliação) e blindar a RPC.

3. **O Arquiteto:**
   - O modelo de domínio estabelece que `patio_os` representa veículos físicos em loja aguardando liberação ou pagamento. "Faturamento" é métrica contábil, jamais uma OS.
   - As OSs ativas devem refletir a fotografia canônica da planilha de conciliação.

4. **O Advogado do Diabo:**
   - A limpeza deve preservar qualquer OS real aberta nos últimos 45 dias que esteja legitimamente em reparo, mas aniquilar registros de teste e anos anteriores.

---

## Rodada 2 — Consenso e Decisão

1. **Migration de Limpeza e Saneamento (`20260902000022_cleanup_patio_os_zombies.sql`):**
   - Deletar registros espúrios contendo `'Faturamento'` no `os_number`.
   - Deletar registros com datas anômalas (`opened_at < '2026-07-01'` ou anos anteriores).
   - Marcar como `finalizada` OSs antigas que já foram quitadas ou descontinuadas.
2. **Sincronização Canônica com a Planilha Oficial:**
   - Garantir que a tabela `patio_os` contenha exatamente as 53 OSs ativas mapeadas em `CONCILIAÇÃO 0109.xlsx`.
3. **Blindagem da RPC `get_pending_patio_os_for_ocr`:**
   - Adicionar cláusula `AND p.os_number NOT ILIKE '%faturamento%'` e `AND p.opened_at >= (p_target_date - INTERVAL '90 days')` como guardrail de segurança.
