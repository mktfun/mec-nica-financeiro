---
name: supabase
description: Guia completo de operações Supabase para agentes de IA — autenticação headless, inspeção de schema, migrations, RPCs, RLS e Edge Functions. Leia inteiro antes de qualquer operação no banco.
---

# Supabase — Guia Operacional para IA

## 1. Autenticação Headless (OBRIGATÓRIO antes de qualquer comando)

**JAMAIS** rode `supabase login` — isso abre o browser e trava o agente.

Carregue sempre silenciosamente do `.env`:

```powershell
# Windows / PowerShell
$env:SUPABASE_ACCESS_TOKEN = (Get-Content .env | Select-String "SUPABASE_ACCESS_TOKEN").Line.Split("=")[1].Trim()
$env:SUPABASE_PROJECT_ID   = (Get-Content .env | Select-String "SUPABASE_PROJECT_ID").Line.Split("=")[1].Trim()
```

```bash
# Linux/Mac
export SUPABASE_ACCESS_TOKEN=$(grep SUPABASE_ACCESS_TOKEN .env | cut -d '=' -f2)
export SUPABASE_PROJECT_ID=$(grep SUPABASE_PROJECT_ID .env | cut -d '=' -f2)
```

Variáveis necessárias no `.env`:
```
SUPABASE_ACCESS_TOKEN=<personal access token de https://supabase.com/dashboard/account/tokens>
SUPABASE_PROJECT_ID=<project ref — aparece na URL do dashboard: app.supabase.com/project/<ref>>
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<anon key do projeto>
SUPABASE_SERVICE_ROLE_KEY=<service role key — usar apenas em backend/webhooks>
```

---

## 2. Inspecionar o Schema Atual (Proposal — antes de propor qualquer tabela)

**Nunca proponha criar tabela ou coluna sem verificar o que já existe.**

### Ver todas as tabelas e colunas existentes:
```bash
supabase db dump --linked --schema public > /tmp/schema_dump.sql
```
Leia o output para mapear tabelas, colunas, tipos, constraints e foreign keys antes de propor qualquer mudança.

### Alternativa via SQL (mais granular):
```bash
supabase db execute --project-ref $SUPABASE_PROJECT_ID --sql "
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
"
```

### Ver RPCs/Funções existentes:
```bash
supabase db execute --project-ref $SUPABASE_PROJECT_ID --sql "
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public';
"
```

### Ver políticas de RLS:
```bash
supabase db execute --project-ref $SUPABASE_PROJECT_ID --sql "
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public';
"
```

### Ver índices:
```bash
supabase db execute --project-ref $SUPABASE_PROJECT_ID --sql "
SELECT indexname, tablename, indexdef
FROM pg_indexes
WHERE schemaname = 'public';
"
```

---

## 3. Criar e Aplicar Migrations (Apply)

### Criar migration local:
```bash
supabase migration new <nome_descritivo>
# Cria arquivo em supabase/migrations/<timestamp>_<nome>.sql
```

Escreva o SQL da migration nesse arquivo. Sempre inclua:
- `CREATE TABLE IF NOT EXISTS` (nunca `CREATE TABLE` puro)
- `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
- `DROP TABLE IF EXISTS` (nunca `DROP TABLE` puro)

### Aplicar migration no banco remoto:
```bash
supabase db push --linked
```

### Verificar status das migrations:
```bash
supabase migration list --linked
```

### Executar SQL avulso no banco remoto (sem criar migration):
```bash
supabase db execute --project-ref $SUPABASE_PROJECT_ID --sql "SEU SQL AQUI"
```

---

## 4. RLS — Row Level Security (OBRIGATÓRIO em toda tabela nova)

**Toda tabela nova deve ter RLS ativado + pelo menos uma policy.**

```sql
-- Ativar RLS
ALTER TABLE nome_tabela ENABLE ROW LEVEL SECURITY;

-- Policy para usuário autenticado ver apenas seus próprios dados
CREATE POLICY "usuarios_veem_proprios_dados"
ON nome_tabela FOR SELECT
USING (auth.uid() = user_id);

-- Policy para INSERT
CREATE POLICY "usuarios_inserem_proprios_dados"
ON nome_tabela FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy para UPDATE
CREATE POLICY "usuarios_atualizam_proprios_dados"
ON nome_tabela FOR UPDATE
USING (auth.uid() = user_id);

-- Policy para DELETE
CREATE POLICY "usuarios_deletam_proprios_dados"
ON nome_tabela FOR DELETE
USING (auth.uid() = user_id);
```

**Para operações administrativas (webhooks, backend, service role):**
```sql
-- Função com SECURITY DEFINER bypassa RLS (usar com cuidado)
CREATE OR REPLACE FUNCTION nome_funcao(...)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- operação que bypassa RLS
END;
$$;
```

**No cliente:** usar `SUPABASE_SERVICE_ROLE_KEY` (nunca a anon key) para operações que precisam bypassar RLS:
```typescript
const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
```

---

## 5. Criar RPCs (Funções PostgreSQL chamáveis pelo cliente)

```sql
CREATE OR REPLACE FUNCTION nome_rpc(
  param1 TEXT,
  param2 INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER  -- se precisar bypassar RLS
AS $$
DECLARE
  resultado JSONB;
BEGIN
  -- sua lógica aqui
  SELECT jsonb_agg(row_to_json(t)) INTO resultado
  FROM sua_tabela t
  WHERE coluna = param1;

  RETURN resultado;
END;
$$;
```

Chamar pelo cliente TypeScript:
```typescript
const { data, error } = await supabase.rpc('nome_rpc', {
  param1: 'valor',
  param2: 42
});
if (error) throw error;
```

---

## 6. Edge Functions

### Criar:
```bash
supabase functions new nome-da-funcao
```

### Deploy:
```bash
supabase functions deploy nome-da-funcao --project-ref $SUPABASE_PROJECT_ID
```

### Setar secrets da Edge Function:
```bash
supabase secrets set MINHA_CHAVE=valor --project-ref $SUPABASE_PROJECT_ID
```

### Invocar pelo cliente:
```typescript
const { data, error } = await supabase.functions.invoke('nome-da-funcao', {
  body: { chave: 'valor' }
});
```

**Autenticação JWT na Edge Function (para verificar usuário autenticado):**
```typescript
// Dentro da Edge Function
const authHeader = req.headers.get('Authorization');
const { data: { user }, error } = await supabase.auth.getUser(
  authHeader?.replace('Bearer ', '') ?? ''
);
if (!user) return new Response('Unauthorized', { status: 401 });
```

---

## 7. Anti-Patterns Críticos (NUNCA faça)

| ❌ Proibido | ✅ Correto |
|---|---|
| `supabase login` (abre browser) | Usar `SUPABASE_ACCESS_TOKEN` via env var |
| `CREATE TABLE` sem `IF NOT EXISTS` | `CREATE TABLE IF NOT EXISTS` |
| Criar tabela sem RLS | `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` + policy |
| Usar `service_role` key no frontend | `service_role` apenas em backend/server |
| Deletar registros sem transação | Usar função com `BEGIN/COMMIT/ROLLBACK` |
| `INSERT` em tabela com FK sem verificar pai | Verificar existência antes do insert |
| Buscar saldo de data sem filtro de data exato | Sempre filtrar por `target_date = $1` |
| Assumir que tabela existe sem verificar | Sempre rodar `SELECT` de inspeção antes |

---

## 8. Padrão de Client no Frontend (Next.js / React)

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// Client público (respeita RLS)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Client admin (bypassa RLS — usar apenas em server actions ou API routes)
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

**Auth em hooks React:**
```typescript
const { data: { user } } = await supabase.auth.getUser();
// Nunca usar getSession() do lado server — sempre getUser() para validação real
```

---

## 9. Checklist Antes de Qualquer Operação no Banco

- [ ] Carreguei `SUPABASE_ACCESS_TOKEN` do `.env` silenciosamente?
- [ ] Rodei `supabase db dump` ou query de inspeção para ver o schema atual?
- [ ] Verifiquei que a tabela/coluna/RPC que quero criar não existe?
- [ ] A nova tabela tem RLS ativado + policies?
- [ ] Testei com `supabase db execute` antes de criar migration formal?
- [ ] Usei `IF NOT EXISTS` em todos os `CREATE`?
