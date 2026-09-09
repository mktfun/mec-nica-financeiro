# Proposal: Remediação de Segurança AppSec — Vault Criptográfico, RLS Multi-Tenant e Hardening do Bot (390)

## 1. Problema

A auditoria de segurança (`/security`) identificou 5 vulnerabilidades de alta criticidade e severidade na aplicação financeira:

1. **🔴 Falha Criptográfica Grave (OWASP A02:2021) — Seed de Cifragem Hardcoded no Frontend:**
   - [`src/lib/credentialCrypto.ts`](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/src/lib/credentialCrypto.ts) e [`bot/src/lib/credentialCrypto.ts`](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/bot/src/lib/credentialCrypto.ts) utilizam uma chave estática compartilhada (`SECRET_SEED = 'conciliamec-bank-vault-secret-key-2026'`).
   - O hook [`useBankBotCredentials.ts`](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/src/hooks/useBankBotCredentials.ts) executa `select('*')` na tabela `bank_bot_credentials`, entregando o payload `encrypted_password` diretamente ao navegador do usuário.
   - Qualquer usuário com acesso à aplicação ou que inspecione o bundle JavaScript do frontend consegue derivar a chave AES-GCM e decifrar as senhas das contas bancárias de todas as lojas.

2. **🔴 Quebra de Controle de Acesso e Isolamento Multi-Tenant (OWASP A01:2021) — Políticas RLS `USING (true)`:**
   - As tabelas [`store_cash_vault`](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/supabase/migrations/20260821000002_store_cash_vault.sql), [`daily_manual_bills`](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/supabase/migrations/20260821000003_manual_bills_revenue_and_pos_fix.sql), [`daily_revenue_adjustments`](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/supabase/migrations/20260821000003_manual_bills_revenue_and_pos_fix.sql), [`ofx_transactions`](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/supabase/migrations/20260807000009_schema_cleanup_and_split.sql) e [`pos_transactions`](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/supabase/migrations/20260807000009_schema_cleanup_and_split.sql) possuem políticas permissivas com `FOR ALL USING (true) WITH CHECK (true)` ou abertas para o papel `public`.
   - Isso permite que qualquer usuário autenticado (e em alguns casos até requisições anônimas) possa alterar o saldo de cofre de qualquer filial, excluir contas a pagar manuais ou manipular transações do extrato bancário.

3. **🟠 Exposição de Rede e Fallback de API Key Previsível no Bot Server (OWASP A05 / A07):**
   - [`bot/src/server.ts`](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/bot/src/server.ts) adota fallback inseguro `process.env.BOT_API_KEY || 'conciliamec-bot-key-change-me'` e escuta na interface aberta `0.0.0.0`.
   - Sem configuração explícita de ambiente, o endpoint `POST /api/sync/itau` fica acessível na rede local com credenciais padrão, permitindo acionamento indevido de scrapers com navegadores headless Playwright.

4. **🟠 Vulnerabilidades Críticas de Dependências (OWASP A06:2021 — Supply Chain):**
   - A biblioteca `xlsx@^0.18.5` possui vulnerabilidades ativas de **Prototype Pollution** ([GHSA-4r6h-8v6p-xvw6](https://github.com/advisories/GHSA-4r6h-8v6p-xvw6), CVSS 7.8) e **ReDoS** ([GHSA-5pgg-2g8v-p4x9](https://github.com/advisories/GHSA-5pgg-2g8v-p4x9), CVSS 7.5).
   - Dependências transitivas como `nanoid` e `js-yaml` possuem alertas conhecidos de travamento de CPU (DoS).

---

## 2. Solução Proposta (Foco em Reuso e Hardening Defensivo)

A remediação será cirúrgica, reaproveitando as estruturas existentes e blindando as camadas vulneráveis sem interromper o fluxo funcional do ERP financeiro:

1. **Blindagem do Vault de Credenciais Bancárias:**
   - **Frontend:**
     - Modificar [`src/hooks/useBankBotCredentials.ts`](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/src/hooks/useBankBotCredentials.ts) para **NUNCA** trazer `encrypted_password` no `.select()`.
     - O frontend passa a tratar senhas como campo **Write-Only** (apenas input para inserção/atualização).
     - Remover a lógica de decifragem (`decryptBankPassword`) do bundle do cliente.
     - Remover a chave estática do código-fonte: a chave de cifragem passa a ser injetada via variável de ambiente do Vite (`VITE_BANK_VAULT_PUBLIC_SALT` ou derivada com segredo de sessão), enquanto a decifragem real reside exclusivamente no worker/bot isolado.
   - **Bot Server:**
     - Modificar [`bot/src/lib/credentialCrypto.ts`](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/bot/src/lib/credentialCrypto.ts) para exigir `BANK_VAULT_SECRET_KEY` via `process.env`. Se ausente, abortar com erro fatal seguro em vez de usar fallback hardcoded.

2. **Blindagem de Políticas RLS no Supabase:**
   - Criar migration `20260909000043_harden_rls_financial_tables.sql`:
     - Revogar acesso de roles anônimas (`TO public`) nas tabelas financeiras `store_cash_vault`, `daily_manual_bills`, `daily_revenue_adjustments`, `ofx_transactions` e `pos_transactions`.
     - Definir políticas restritas `TO authenticated` com validação de perfil ativo em `profiles` (`EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid())`).
     - Para `bank_bot_credentials`, garantir que a coluna `encrypted_password` só possa ser atualizada via mutação autenticada por admins (`profiles.role = 'admin'`).

3. **Hardening do Servidor de Automação de Bots:**
   - Modificar [`bot/src/server.ts`](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/bot/src/server.ts):
     - Bloquear inicialização se `BOT_API_KEY` for vazia ou mantiver o valor padrão em ambiente de produção/stage.
     - Configurar bind padrão para `127.0.0.1` (localhost), liberando `0.0.0.0` apenas sob flag explícita `BOT_HOST=0.0.0.0`.

4. **Remediação de Supply Chain & Overrides no `package.json`:**
   - Adicionar cláusula de `overrides` em `package.json` para forçar versões seguras de pacotes transitivos (`nanoid: "^3.3.18"`, `js-yaml: "^4.3.2"`).
   - Atualizar a biblioteca `xlsx` para distribuição segura ou proteger parsers contra protótipo poluidor antes de ler buffers de arquivos desconhecidos.

---

## 3. Investigação e Análise de Reuso

- **Tabelas / RPCs Existentes Reaproveitadas:**
  - `bank_bot_credentials` (tabela existente criada na migration `20260908000037`). Mantida intacta em estrutura, com RLS endurecido.
  - `store_cash_vault`, `daily_manual_bills`, `daily_revenue_adjustments`, `ofx_transactions`, `pos_transactions`. Mantidas intactas; alteradas apenas as policies de segurança RLS.
  - Tabela `public.profiles`: reaproveitada para validação de `auth.uid()` e `profiles.role = 'admin'`.
- **Componentes / Hooks Existentes Reaproveitados:**
  - `src/hooks/useBankBotCredentials.ts`: reaproveitado com adequação da projeção de campos (`select`) para exclusão de senhas e tratamento write-only.
  - `src/lib/credentialCrypto.ts`: reaproveitado com remoção da chave hardcoded e expurgo de funções de decifragem do lado cliente.
  - `bot/src/server.ts`: reaproveitado com adição de fail-fast security checks e interface de rede segura.
- **Justificativa para Artefatos Novos:**
  - Apenas 1 nova migration SQL (`20260909000043_harden_rls_financial_tables.sql`) necessária para aplicar a revogação de políticas antigas e criação de políticas restritas.

---

## 4. Contratos de Dados & SQL (Supabase)

### Migration: `20260909000043_harden_rls_financial_tables.sql`

```sql
-- 1. store_cash_vault
DROP POLICY IF EXISTS "Allow public read on store_cash_vault" ON public.store_cash_vault;
DROP POLICY IF EXISTS "Allow public all on store_cash_vault" ON public.store_cash_vault;

CREATE POLICY "Authenticated users can read store_cash_vault"
ON public.store_cash_vault FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid())
);

CREATE POLICY "Authenticated users can manage store_cash_vault"
ON public.store_cash_vault FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid())
);

-- 2. daily_manual_bills
DROP POLICY IF EXISTS "Allow public all on daily_manual_bills" ON public.daily_manual_bills;

CREATE POLICY "Authenticated users can manage daily_manual_bills"
ON public.daily_manual_bills FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid())
);

-- 3. daily_revenue_adjustments
DROP POLICY IF EXISTS "Allow public all on daily_revenue_adjustments" ON public.daily_revenue_adjustments;

CREATE POLICY "Authenticated users can manage daily_revenue_adjustments"
ON public.daily_revenue_adjustments FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid())
);

-- 4. ofx_transactions & pos_transactions
DROP POLICY IF EXISTS "Users can manage ofx_transactions for their stores" ON public.ofx_transactions;
DROP POLICY IF EXISTS "Users can manage pos_transactions for their stores" ON public.pos_transactions;

CREATE POLICY "Authenticated users can manage ofx_transactions"
ON public.ofx_transactions FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid())
);

CREATE POLICY "Authenticated users can manage pos_transactions"
ON public.pos_transactions FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid())
);
```

---

## 5. API & Componentes (Frontend & Bot)

- **`src/hooks/useBankBotCredentials.ts` [MODIFY]:**
  - Projeção explícita de colunas seguras no `useBankBotCredentials()`:
    ```typescript
    .select(`
      id,
      store_id,
      bank_code,
      bank_name,
      agency,
      account_number,
      operator_cpf,
      access_type,
      is_active,
      last_sync_at,
      last_status,
      last_error,
      created_at,
      updated_at,
      stores:store_id (id, name)
    `)
    ```
  - A propriedade `encrypted_password` é omitida da consulta do cliente.
- **`src/lib/credentialCrypto.ts` [MODIFY]:**
  - Remover `SECRET_SEED` estático do código.
  - Eliminar exportação de `decryptBankPassword` no bundle frontend (somente o bot precisa decifrar senhas).
  - Cifragem para gravação derivada de seed configurada em env ou canal seguro.
- **`bot/src/server.ts` [MODIFY]:**
  - Validar obrigatoriedade de `process.env.BOT_API_KEY`.
  - Default de bind para `127.0.0.1`.
- **`package.json` [MODIFY]:**
  - Configurar `overrides` de dependências para mitigar CVEs transitivas.

---

## 6. Risco Principal e Mitigação

- **Risco Principal:** Quebra de autenticação em requisições existentes se houver telas acessando `store_cash_vault` ou `daily_manual_bills` sem sessão Supabase ativa.
- **Mitigação:** Verificar se o cliente Supabase do frontend sempre envia o cabeçalho `Authorization: Bearer <token>` via `brokeredPreviewStorage()` / `session`. Como toda a aplicação já opera dentro do dashboard protegido por login, a exigência de `TO authenticated` garante a segurança sem regredir o uso de operadores logados.
