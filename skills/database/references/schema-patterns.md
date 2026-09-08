# Production Database Schema Patterns

DDL declarativo completo para projetos Supabase/PostgreSQL em produção. Inclui perfis de usuário sincronizados com `auth.users`, suporte multi-tenant com organizações e controle de permissões (RBAC), gerenciamento de assinaturas Stripe, registros de auditoria append-only, triggers automáticos e RPCs atômicas.

---

## 1. Extensões & Funções Globais

```sql
-- Extensões para UUID e funções criptográficas
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Trigger universal para atualização automática do campo updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
```

---

## 2. Perfis de Usuário (`profiles`) & Trigger Auth

Sincroniza automaticamente novos usuários criados no serviço `auth.users` do Supabase com a tabela `public.profiles`.

```sql
-- Tabela de Perfis
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  full_name text,
  avatar_url text,
  role text NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- Trigger de updated_at
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Função que processa novo usuário registrado em auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name text;
  v_avatar_url text;
BEGIN
  -- Extrair metadados opcionais providos via OAuth ou formulário
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    ''
  );
  v_avatar_url := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture',
    ''
  );

  INSERT INTO public.profiles (id, email, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.email,
    v_full_name,
    v_avatar_url,
    'user'
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    full_name = CASE WHEN profiles.full_name IS NULL OR profiles.full_name = '' THEN EXCLUDED.full_name ELSE profiles.full_name END,
    avatar_url = CASE WHEN profiles.avatar_url IS NULL OR profiles.avatar_url = '' THEN EXCLUDED.avatar_url ELSE profiles.avatar_url END,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

-- Vincular trigger ao evento AFTER INSERT em auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

---

## 3. Organizações & Membros Multi-Tenant (`organizations`, `organization_members`)

Estrutura central para arquiteturas multi-inquilino (workspaces / tenants).

```sql
-- 1. Organizações / Workspaces
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  logo_url text,
  billing_email text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- Trigger de updated_at para organizations
DROP TRIGGER IF EXISTS set_organizations_updated_at ON public.organizations;
CREATE TRIGGER set_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 2. Membros e Permissões na Organização (RBAC)
CREATE TABLE IF NOT EXISTS public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')) DEFAULT 'member',
  invited_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_org_member UNIQUE (org_id, user_id)
);

-- Trigger de updated_at para organization_members
DROP TRIGGER IF EXISTS set_organization_members_updated_at ON public.organization_members;
CREATE TRIGGER set_organization_members_updated_at
  BEFORE UPDATE ON public.organization_members
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
```

---

## 4. Assinaturas e Planos Stripe (`subscriptions`)

Mapeamento de planos e assinaturas sincronizados por webhooks de billing.

```sql
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_customer_id text NOT NULL UNIQUE,
  stripe_subscription_id text UNIQUE,
  status text NOT NULL DEFAULT 'incomplete' 
    CHECK (status IN ('trialing', 'active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'unpaid', 'paused')),
  price_id text,
  plan_id text NOT NULL DEFAULT 'free',
  quantity integer NOT NULL DEFAULT 1,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_start timestamptz,
  trial_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT check_owner_presence CHECK (org_id IS NOT NULL OR user_id IS NOT NULL)
);

-- Trigger de updated_at para subscriptions
DROP TRIGGER IF EXISTS set_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER set_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
```

---

## 5. Registros de Auditoria Imutáveis (`audit_logs`)

Armazenamento de trilha de auditoria para operações críticas.

```sql
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT NOW()
);
```

---

## 6. Índices de Alta Performance

```sql
-- Índices para chaves estrangeiras
CREATE INDEX IF NOT EXISTS idx_organizations_created_by ON public.organizations(created_by);
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON public.organization_members(org_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_org_id ON public.subscriptions(org_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON public.subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub ON public.subscriptions(stripe_subscription_id);

-- Índices compostos para paginação e ordenação de logs por tenant
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_created ON public.audit_logs(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created ON public.audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
```

---

## 7. RPCs e Stored Procedures em Produção

### RPC 1: Criação Atômica de Organização com Owner
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
  v_result jsonb;
BEGIN
  -- 1. Validar autenticação
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado' USING ERRCODE = '42501';
  END IF;

  -- 2. Validar campos
  IF trim(p_name) = '' OR trim(p_slug) = '' THEN
    RAISE EXCEPTION 'Nome e slug são obrigatórios' USING ERRCODE = '22023';
  END IF;

  -- 3. Inserir Organização
  INSERT INTO public.organizations (name, slug, created_by)
  VALUES (trim(p_name), lower(trim(p_slug)), v_user_id)
  RETURNING id INTO v_org_id;

  -- 4. Inserir Criador como Owner
  INSERT INTO public.organization_members (org_id, user_id, role)
  VALUES (v_org_id, v_user_id, 'owner');

  -- 5. Criar registro inicial de auditoria
  INSERT INTO public.audit_logs (org_id, user_id, action, entity_type, entity_id, metadata)
  VALUES (
    v_org_id,
    v_user_id,
    'organization.created',
    'organization',
    v_org_id::text,
    jsonb_build_object('name', p_name, 'slug', p_slug)
  );

  -- 6. Montar retorno JSON
  SELECT jsonb_build_object(
    'id', o.id,
    'name', o.name,
    'slug', o.slug,
    'role', 'owner',
    'created_at', o.created_at
  )
  INTO v_result
  FROM public.organizations o
  WHERE o.id = v_org_id;

  RETURN v_result;
END;
$$;
```

### RPC 2: Registrar Evento de Auditoria Seguro
```sql
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_org_id uuid,
  p_action text,
  p_entity_type text,
  p_entity_id text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id uuid;
  v_user_id uuid := auth.uid();
BEGIN
  -- Validar permissão de membro na organização informada
  IF p_org_id IS NOT NULL AND NOT public.is_org_member(p_org_id) THEN
    RAISE EXCEPTION 'Acesso negado à organização especificada' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.audit_logs (
    org_id,
    user_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  VALUES (
    p_org_id,
    v_user_id,
    p_action,
    p_entity_type,
    p_entity_id,
    COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;
```
