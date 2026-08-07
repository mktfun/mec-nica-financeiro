# Spec Plan: Acionamento Automático em Background do Motor de IA & Registro de Logs (auto-background-ai-reconciler)

## Tasks

- [ ] [FRONTEND] Criar hook `src/hooks/useBackgroundAiReconciler.ts`:
  - [ ] Implementar trava de hash (`processedHashRef`) para evitar chamadas duplicadas.
  - [ ] Invocar `generateTripleMatchSuggestions()` de forma imperceptível em background quando houver chave de API e lançamentos sem par.
  - [ ] Gravar automaticamente matches com confiança $\ge 90\%$ na tabela `conciliation_matches` do Supabase.
  - [ ] Invalidar as queries `['ai_execution_logs']` e `['conciliacao_detalhes']`.
- [ ] [FRONTEND] Integrar o hook `useBackgroundAiReconciler` em `src/hooks/useConciliacao.ts` (na conciliação da loja):
  - [ ] Passar os itens não pareados das OSs, Maquininha e OFX para acionar a IA silenciosa automaticamente.
- [ ] [TEST] Verificar compilação limpa com `npm run build`.
