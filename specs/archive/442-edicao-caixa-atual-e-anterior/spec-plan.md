# Spec Plan 442: Edição Manual de Caixa Atual e Caixa Anterior

## Checklist de Tarefas de Implementação

### Task 1: Migration Postgres para `get_daily_reconciliation_summary`
- [x] Criar migration `supabase/migrations/20260925000001_allow_caixa_manual_override_in_rpc.sql`
- [x] Aplicar no Ramal 2 a verificação de `is_caixa_atual_override` e leitura de `metadata.caixa_anterior`
- [x] Aplicar migration no banco via MCP Supabase / CLI

### Task 2: Atualização do Hook `useBackendConciliacao.ts`
- [x] Modificar linhas 495–502 para reconhecer `snapMeta.is_caixa_atual_override` e dias fechados com snapshot existente
- [x] Manter integridade do cálculo do fluxo de caixa e valor disponível para contas

### Task 3: Implementação de Estados e Inputs no `ResumoDiaPanel.tsx`
- [x] Declarar `caixaAtualInput`, `caixaAnteriorInput`, `hasCaixaAtualOverride` e `hasCaixaAnteriorOverride`
- [x] Sincronizar no `useEffect` quando `!isEditing`
- [x] Derivar `effectiveCaixaAtual` e `effectiveCaixaAnterior` reativamente nas equações contábeis
- [x] Substituir tags estáticas por inputs numéricos quando `isEditing === true` nos cards de Caixa Atual e Caixa Anterior
- [x] Adicionar botão "Restaurar" para resetar rapidamente ao cálculo dos 5 Pilares ou fallback do dia anterior
- [x] Atualizar payload de `saveSnapshot.mutateAsync` para persistir os valores consolidados e flags no `metadata`

### Task 4: Verificação e Validação Terminal Gate
- [x] Executar `npm run build`
- [x] Validar ausência de erros de lint e typecheck
- [x] Testar fechamento e reatividade com valores reais
