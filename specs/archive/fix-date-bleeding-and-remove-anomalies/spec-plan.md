# Spec Plan: Correção de Vazamento de Datas na Conciliação Diária & Remoção de Observações Críticas (fix-date-bleeding-and-remove-anomalies)

## Tasks

- [ ] [FRONTEND] Ajustar `useModulo1StoresData` em `src/hooks/useConciliacao.ts`:
  - [ ] Filtrar a busca na tabela `patio_os` por `target_date` (ou `closed_at` / `entry_date` correspondente ao dia selecionado).
  - [ ] Filtrar a busca na tabela `receivables` por `target_date` da data selecionada.
- [ ] [FRONTEND] Reformular `src/components/conciliacao/ResumoDiaPanel.tsx`:
  - [ ] Remover a consulta de `anomalies` e a renderização do bloco "Observações Críticas (Sem OS)".
- [ ] [TEST] Verificar compilação limpa com `npm run build`.
