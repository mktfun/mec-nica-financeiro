# Design: Correções de Produção (CORS VPS e Schema Cache) (bot-production-fixes)

## Arquitetura Técnica
1. **Script Headless (Supabase Admin)**: Um script em Node.js (`scratch/apply_bot_logs_migration.cjs`) instanciará o Supabase Client usando `SUPABASE_SERVICE_ROLE_KEY` e enviará um comando RAW de SQL via `supabase.rpc()` ou criará a tabela via PostgREST para ignorar RLS provisoriamente (já que DDL direto por SDK é bloqueado, o ideal é instruir a chamada à API Postgres ou usar query extensions). Como DDL não pode ser executado via Supabase JS Client em tabelas existentes sem uma RPC de execução customizada, caso não haja `exec_sql`, vamos instruir a execução via psql ou via Supabase CLI, caso configurado, ou melhor: fornecer a query exata para colar no Editor SQL da nuvem.

## Interfaces TypeScript
*Nenhuma nova interface de banco de dados ou frontend criada.*

## Componentes / Hooks / Funções
- Criação e execução de DDL (Data Definition Language) de `bot_audit_logs`.

## Infra / Deploy
Para que a correção do CORS do passo anterior funcione, você precisará efetuar deploy da pasta `mcp-oficina-standalone` na sua VPS:
```bash
cd /opt/tork-stack/mcp-oficina-standalone
git pull origin main
npm install
pm2 restart mcp-bot  # (ou docker-compose restart bot)
```

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1:** Acessar a tela do Agente.
  - *Estado Inicial:* Erro `404 (Not Found)` para `bot_audit_logs` no console.
  - *Ação:* Injetar a tabela no Supabase via script/SQL e recarregar schema.
  - *Resultado Esperado:* A tela carrega o card vazio sem erros 404 e badge `bot_audit_logs` aparece normal.
