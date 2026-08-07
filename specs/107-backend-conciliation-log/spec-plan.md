# Spec Plan: Backend Conciliation Math & Audit Logs (107-backend-conciliation-log)

## Tasks

- [ ] [BACKEND] Criar nova migration Supabase (`create_conciliation_daily_logs.sql`) para a tabela `conciliation_daily_logs` com RLS.
- [ ] [BACKEND] Criar função RPC `calculate_daily_conciliation(p_date date)` no mesmo script SQL, agrupando `transactions`, `patio_os`, e gravando o snapshot 1-dia na tabela de log com a fórmula corrigida para Diferença.
- [ ] [FRONTEND] Criar hook TypeScript `src/hooks/useBackendConciliacao.ts` para chamar a nova RPC.
- [ ] [FRONTEND] Refatorar `src/routes/conciliacao.index.tsx` para consumir o hook e remover a matemática complexa (`diferenca = saldoItau - previstoPlanilhas`).
- [ ] [TEST] Verificar se a "Diferença" agora calcula exatamente `Previsto - (PIX + Maquininha)`.
- [ ] [TEST] Validar que mudar de dia recalcula no backend e gera um novo log na tabela para auditoria.
