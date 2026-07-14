# E2E Test: Health Check Component

## Deep Research (AST Skeletons)
- Lidos os skeletons em `src/components/`. Não há duplicação.
- O projeto usa React + Vite + Tailwind.

## Infra Topology Proposal
- **Frontend**: Publicado via Lovable em `app.e2e-test.com`.
- **Backend**: Supabase remote API em `api.e2e-test.com`.
- **Environment**: O componente testará a conexão `VITE_SUPABASE_URL`.

## Visual QA Planning
- Este componente renderiza dados críticos. Será protegido.
- Foi garantido no `.agent/.env_agent` um `TEST_USER_EMAIL` e `TEST_USER_PASSWORD` para que o VLM passe do Auth Guard.
