# Design: Remediação de Segurança AppSec — Vault Criptográfico, RLS Multi-Tenant e Hardening do Bot (390)

## 1. Arquitetura e Fluxo de Dados

### Comparativo: Antes vs. Depois

```
ANTES (VULNERÁVEL):
[Browser / Frontend] ◄── SELECT * ── [Supabase: bank_bot_credentials] (Vaza encrypted_password)
       │
       ▼
[Browser / DevTools] ── Deriva AES-GCM via 'conciliamec-bank-vault-secret-key-2026' (Hardcoded)
       │
       └──► DECRYPT SENHA BANCÁRIA REAL NO CLIENTE! (Crítico)

[Atacante / Rede] ── HTTP POST /api/sync/itau (0.0.0.0, key: conciliamec-bot-key-change-me) ──► Playwright Scraper Bancário

[Qualquer Usuário] ── SELECT / UPDATE store_cash_vault (USING true) ──► Altera cofres de outras lojas
```

```
DEPOIS (BLINDADO):
[Browser / Frontend] ── INSERT / UPDATE (Write-Only) ──► [Supabase: bank_bot_credentials]
       │ (Nunca lê encrypted_password)
       ▼
[Browser / Frontend] ◄── SELECT (colunas públicas sem senha) ── [Supabase]

[Worker / Bot Node.js] ◄── SELECT encrypted_password ── [Supabase (Service Role / Backend Autenticado)]
       │
       ▼
[Worker / Bot Node.js] ── Decifra usando process.env.BANK_VAULT_SECRET_KEY ──► Playwright Scraper
       (Chave isolada no servidor, nunca enviada ao navegador)

[Atacante / Rede] ── HTTP POST /api/sync/itau ──► 401 Unauthorized (Chave obrigatória e segura, bind 127.0.0.1)

[Qualquer Usuário] ── SELECT store_cash_vault ──► Supabase RLS valida auth.uid() e profile ativo
```

---

## 2. Interfaces TypeScript & Modelos

```typescript
// src/hooks/useBankBotCredentials.ts (Atualizado)

export interface BankBotCredentialSafe {
  id: string;
  store_id: string;
  store_name?: string;
  bank_code: BankCode;
  bank_name: string;
  agency: string;
  account_number: string;
  operator_cpf: string;
  // encrypted_password REMOVIDO da interface de leitura do cliente
  access_type: BankAccessType;
  is_active: boolean;
  last_sync_at: string | null;
  last_status: BankConnectionStatus;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface BankBotCredentialInput {
  id?: string;
  store_id: string;
  bank_code: BankCode;
  bank_name: string;
  agency: string;
  account_number: string;
  operator_cpf: string;
  password?: string; // Presente apenas no envio (Write-Only)
  access_type: BankAccessType;
  is_active: boolean;
}
```

---

## 3. Mutações em Arquivos Existentes [MODIFY]

### A. [`src/hooks/useBankBotCredentials.ts`](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/src/hooks/useBankBotCredentials.ts)
- Alterar query de listagem para selecionar apenas as colunas necessárias, omitindo `encrypted_password`:
  ```typescript
  .from('bank_bot_credentials')
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
    stores:store_id (
      id,
      name
    )
  `)
  ```

### B. [`src/lib/credentialCrypto.ts`](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/src/lib/credentialCrypto.ts)
- Remover `const SECRET_SEED = 'conciliamec-bank-vault-secret-key-2026';`.
- Usar chave injetada via `import.meta.env.VITE_BANK_VAULT_PUBLIC_SALT` com fallback dinâmico não-estático.
- Remover a função `decryptBankPassword` do bundle do cliente. Emitir aviso de erro se chamada no browser.

### C. [`bot/src/lib/credentialCrypto.ts`](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/bot/src/lib/credentialCrypto.ts)
- Obter a chave de decifragem de `process.env.BANK_VAULT_SECRET_KEY || process.env.BOT_SECRET_KEY`.
- Se a variável não estiver definida, disparar `throw new Error('[bot/credentialCrypto] BANK_VAULT_SECRET_KEY ausente nas variáveis de ambiente. Abortando por segurança.')`.

### D. [`bot/src/server.ts`](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/bot/src/server.ts)
- Verificar se `BOT_API_KEY` está configurada:
  ```typescript
  const BOT_API_KEY = process.env.BOT_API_KEY;
  if (!BOT_API_KEY || BOT_API_KEY === 'conciliamec-bot-key-change-me') {
    if (process.env.NODE_ENV === 'production') {
      console.error('❌ ERRO FATAL: BOT_API_KEY inválida ou padrão em produção.');
      process.exit(1);
    } else {
      console.warn('⚠️ AVISO DE SEGURANÇA: BOT_API_KEY está usando valor inseguro de desenvolvimento.');
    }
  }
  ```
- Alterar host de escuta:
  ```typescript
  const HOST = process.env.BOT_HOST || '127.0.0.1';
  app.listen(PORT, HOST, () => { ... });
  ```

### E. [`supabase/migrations/20260909000043_harden_rls_financial_tables.sql`](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/supabase/migrations/20260909000043_harden_rls_financial_tables.sql) [NEW]
- Excluir policies públicas legadas e estabelecer policies estritas para `authenticated` com checagem de perfil em `profiles`.

### F. [`package.json`](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/package.json)
- Inserir overrides para dependências vulneráveis sinalizadas pelo `npm audit`:
  ```json
  "overrides": {
    "react": "$react",
    "react-dom": "$react-dom",
    "nanoid": "^3.3.18",
    "js-yaml": "^4.3.2"
  }
  ```

---

## 4. Cenários de Verificação (SCAN ➔ INFER ➔ VERIFY ➔ FIX)

### Cenário 1: Tentativa de Leitura de Senhas via DevTools / API do Supabase
- **Estado Inicial:** Operador autenticado acessa a página de Configurações de Bots (`/configuracoes`).
- **Ação:** Inspecionar a aba Network do navegador na requisição `bank_bot_credentials`.
- **Resultado Esperado:** O payload retornado **NÃO** contém a chave `encrypted_password`. Nenhuma senha pode ser decifrada no console com comandos como `window.__crypto.decrypt(...)`.

### Cenário 2: Requisição Anônima ou Sem Token contra Tabelas Financeiras
- **Estado Inicial:** Cliente HTTP sem header `Authorization` tenta consultar `store_cash_vault` ou `daily_manual_bills`.
- **Ação:** `curl -X GET "https://<supabase>/rest/v1/store_cash_vault" -H "apikey: <anon_key>"`.
- **Resultado Esperado:** Retorno vazio (`[]`) ou código `401/403` por bloqueio das novas políticas RLS.

### Cenário 3: Inicialização Segura do Bot Server
- **Estado Inicial:** Servidor do bot executado com `BOT_HOST` padrão e sem `BOT_API_KEY`.
- **Ação:** `npm run dev` na pasta `bot`.
- **Resultado Esperado:** O servidor vincula-se estritamente a `127.0.0.1` e emite alerta enfático de segurança sobre chaves de API.
