# Spec Plan: Remediação de Segurança AppSec — Vault Criptográfico, RLS Multi-Tenant e Hardening do Bot (390)

## Tasks

- [x] [BACKEND] Criar migration `20260909000043_harden_rls_financial_tables.sql` revogando acessos públicos permissivos e estabelecendo políticas RLS com verificação de perfil autenticado em `store_cash_vault`, `daily_manual_bills`, `daily_revenue_adjustments`, `ofx_transactions` e `pos_transactions`
- [x] [FRONTEND] Omitir `encrypted_password` da query de listagem em `src/hooks/useBankBotCredentials.ts` tornando o campo de senha estritamente write-only no cliente
- [x] [FRONTEND] Sanitizar `src/lib/credentialCrypto.ts` removendo a chave estática hardcoded e expurgando funções de decifragem do bundle do navegador
- [x] [BACKEND] Atualizar `bot/src/lib/credentialCrypto.ts` para exigir `BANK_VAULT_SECRET_KEY` via variável de ambiente, abortando com erro defensivo caso ausente
- [x] [BACKEND] Endurecer `bot/src/server.ts` bloqueando fallback de chave padrão em produção e restringindo o bind de rede padrão para `127.0.0.1`
- [x] [SUPPLY-CHAIN] Configurar overrides de segurança em `package.json` para neutralizar CVEs de `nanoid` e `js-yaml` e auditar mitigações do `xlsx`
- [x] [TEST] Validar que o payload retornado na listagem de credenciais não contém `encrypted_password`
- [x] [TEST] Validar que o servidor de bots inicia em localhost e rejeita requisições sem API key válida
- [x] [TEST] Executar build de produção (`npm run build`) para assegurar integridade de tipos e ausência de regressões
