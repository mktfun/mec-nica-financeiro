# Spec Plan: ReestruturaçÁo da UX do Agente IA e Custos Reais (058-ai-agent-ux-costs)

## Tasks

- [x] [FRONTEND] Remover rota `/custos` de `src/components/layout/Sidebar.tsx`.
- [x] [FRONTEND] Modificar `src/routes/custos.tsx` para exportar `CustosPanel` sem o `AppShell`.
- [x] [FRONTEND] Atualizar `CustosPanel` para consultar a tabela `ai_execution_logs` no Supabase e calcular custos dinamicamente por período.
- [x] [FRONTEND] Modificar `src/routes/configuracoes.tsx` para exportar `ConfiguracoesPanel` sem o `AppShell`.
- [x] [FRONTEND] Atualizar `src/routes/agente.tsx` com estado `activeView` para alternar fluidamente entre Chat, Configurações e Custos sem sair do Workspace IA.
- [x] [BACKEND] Atualizar a Edge Function `supabase/functions/ai-chat/index.ts` para extrair os `usage.promptTokens` e `usage.completionTokens` no `onFinish`.
- [x] [BACKEND] Implementar na Edge Function `ai-chat` o cálculo de `estimated_cost` e registrar os dados na tabela `ai_execution_logs`.
- [x] [TEST] Verificar cenário 1: Sidebar nÁo mostra mais "Custos IAS".
- [x] [TEST] Verificar cenário 2: Clicar em "Custos" ou "Configurações" na sidebar do agente exibe os respectivos painéis de forma unificada.
- [x] [TEST] Verificar cenário 3: Enviar mensagem à IA e confirmar que custos reais foram gerados.
