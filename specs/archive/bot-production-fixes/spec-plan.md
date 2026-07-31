# Spec Plan: Correções de Produção (CORS VPS e Schema Cache) (bot-production-fixes)

## Tasks

- [x] [BACKEND] Escrever um script (ex: `scratch/apply_bot_logs_migration.cjs`) ou instrução SQL isolada para criar a tabela `bot_audit_logs` e aplicar a RLS (já existe no código fonte, mas não na nuvem).
- [x] [TEST] Executar o script no Supabase da nuvem do projeto (ou instruir você a colar a Query SQL na interface da nuvem).
- [x] [INFRA] Orientar os comandos exatos de `git pull` ou `npm run build` na VPS para refletir o CORS que codificamos na tarefa anterior no repositório do bot.
