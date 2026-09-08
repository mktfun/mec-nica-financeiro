---
name: database
description: Padrões de banco de dados Supabase e PostgreSQL — DDL schemas, multi-tenancy, Row-Level Security (RLS), migrations headless, índices e RPCs.
triggers: [database, supabase db, migration, rls, schema, sql, postgres, rpc, multi-tenant]
---

# Supabase & PostgreSQL Database Guide

Guia de engenharia para modelagem de dados, segurança multi-tenant, migrações determinísticas e stored procedures no Supabase/PostgreSQL.

---

## 1. Convenções de Schema & DDL

Toda modelagem deve seguir os seguintes padrões estruturais:

| Elemento | Convenção | Exemplo |
| :--- | :--- | :--- |
| **Tabelas** | Plural, `snake_case` | `organizations`, `audit_logs` |
| **Colunas** | Singular, `snake_case` | `user_id`, `created_at` |
| **Chave Primária** | UUID v4 gerado no banco | `id uuid primary key default gen_random_uuid()` |
| **Chaves Estrangeiras** | `parent_id` com constraint explícita | `org_id uuid references public.organizations(id) on delete cascade` |
| **Timestamps** | `timestamptz` em UTC com default `now()` | `created_at timestamptz default now() not null` |
| **Updated At** | Gerenciado via trigger universal | `updated_at timestamptz default now() not null` |

### Regra de DDL Defensivo
- Sempre use `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS` e `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.
- Chaves estrangeiras que referenciam `auth.users` devem usar `REFERENCES auth.users(id) ON DELETE CASCADE`.

---

## 2. Migrações Headless via CLI

**JAMAIS** utilize `supabase login` interativo. Carregue credenciais do `.env`:

```powershell
# Windows PowerShell
$env:SUPABASE_ACCESS_TOKEN = (Get-Content .env | Select-String "SUPABASE_ACCESS_TOKEN").Line.Split("=")[1].Trim()
$env:SUPABASE_PROJECT_ID   = (Get-Content .env | Select-String "SUPABASE_PROJECT_ID").Line.Split("=")[1].Trim()
```

### Comandos de Migração
```bash
# 1. Criar migration local declarativa
cmd.exe /c "npx supabase migration new <nome_descritivo>"

# 2. Aplicar migrations pendentes no banco remoto vinculado
cmd.exe /c "npx supabase db push --linked"

# 3. Listar status de migrações
cmd.exe /c "npx supabase migration list --linked"
```

---

## 3. Inspeção de Schema Existente

Antes de propor qualquer DDL, inspecione a estrutura atual para evitar duplicidades:

```sql
-- Listar colunas, tipos e nulabilidade
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- Listar políticas de RLS ativas
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public';

-- Listar índices existentes
SELECT indexname, tablename, indexdef
FROM pg_indexes
WHERE schemaname = 'public';

-- Listar funções e RPCs
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public';
```

---

## 4. Melhores Práticas de Indexação

Postgres **não** indexa foreign keys automaticamente. Siga as regras:

1. **Foreign Keys**: Crie índices em todas as FKs para evitar table scans em `JOIN` e `DELETE CASCADE`.
   ```sql
   CREATE INDEX IF NOT EXISTS idx_members_org_id ON public.organization_members(org_id);
   CREATE INDEX IF NOT EXISTS idx_members_user_id ON public.organization_members(user_id);
   ```
2. **Compostos para Multi-Tenancy**: Ordene pelo tenant seguido pelo campo de filtro/ordenação.
   ```sql
   CREATE INDEX IF NOT EXISTS idx_projects_org_created ON public.projects(org_id, created_at DESC);
   ```
3. **Índices Parciais (Soft Delete & Flags)**: Otimize tabelas grandes filtrando registros ativos.
   ```sql
   CREATE INDEX IF NOT EXISTS idx_active_users ON public.profiles(id) WHERE deleted_at IS NULL;
   ```

---

## 5. Funções Postgres & RPCs

Para stored procedures e mutations atômicas:

- Sempre especifique `SECURITY DEFINER` e declare `SET search_path = public` para prevenir ataques de hijacking de search_path.
- Use `STABLE` para funções de leitura/verificação (ex: helpers de RLS) e `VOLATILE` para operações de escrita.

```sql
CREATE OR REPLACE FUNCTION public.create_organization_with_owner(
  p_name text,
  p_slug text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  INSERT INTO public.organizations (name, slug, created_by)
  VALUES (p_name, p_slug, v_user_id)
  RETURNING id INTO v_org_id;

  INSERT INTO public.organization_members (org_id, user_id, role)
  VALUES (v_org_id, v_user_id, 'owner');

  RETURN jsonb_build_object('id', v_org_id, 'name', p_name, 'slug', p_slug);
END;
$$;
```

---

## 6. Referência Modular do Ecossistema

Para implementações completas e copy-pasteable:
- **`references/rls-patterns.md`**: Políticas completas de RLS (Single-User, Multi-Tenant `has_org_role`, Append-Only logs).
- **`references/schema-patterns.md`**: DDL completo (`profiles`, `organizations`, `organization_members`, `subscriptions`, `audit_logs`), triggers automáticos e RPCs.
