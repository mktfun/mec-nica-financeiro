# Row-Level Security (RLS) Policy Patterns

Guia completo e padronizado de políticas de segurança em nível de linha (RLS) para PostgreSQL e Supabase. Abrange modelos single-user, multi-tenant com controle de acesso baseado em funções (RBAC), registros de auditoria append-only e catálogo público.

---

## 1. Princípios Fundamentais de RLS

Toda tabela que armazena dados de usuários ou organizações **DEVE** ter RLS explicitamente ativado e forçado.

```sql
-- 1. Ativar RLS na tabela
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- 2. Forçar RLS inclusive para o owner da tabela (evita bypass acidental por superusuários em queries normais)
ALTER TABLE public.projects FORCE ROW LEVEL SECURITY;
```

---

## 2. Funções de Segurança Multi-Tenant (Helpers RBAC)

Funções auxiliares encapsulam a verificação de permissões em consultas SQL, evitando repetição de subqueries complexas e garantindo performance e isolamento criptográfico.

```sql
-- ============================================================================
-- Helper 1: Verificar se o usuário autenticado pertence à organização
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_org_member(lookup_org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.organization_members
    WHERE org_id = lookup_org_id 
      AND user_id = auth.uid()
  );
$$;

-- ============================================================================
-- Helper 2: Verificar se o usuário possui uma das roles requeridas na org
-- ============================================================================
CREATE OR REPLACE FUNCTION public.has_org_role(lookup_org_id uuid, required_roles text[])
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.organization_members
    WHERE org_id = lookup_org_id 
      AND user_id = auth.uid() 
      AND role = ANY(required_roles)
  );
$$;

-- ============================================================================
-- Helper 3: Retornar lista de IDs de organizações às quais o usuário pertence
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_user_org_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT org_id 
  FROM public.organization_members
  WHERE user_id = auth.uid();
$$;
```

---

## 3. Padrão 1: Modelo Single-User / Dados Privados do Usuário

Aplicável a perfis, preferências pessoais, notas privadas e tokens de integração pessoal onde `user_id = auth.uid()`.

```sql
-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

-- 1. SELECT: Usuários autenticados podem ver perfis públicos ou seu próprio perfil
CREATE POLICY "profiles_select_policy"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- 2. INSERT: Apenas o próprio usuário autenticado pode criar seu perfil
CREATE POLICY "profiles_insert_policy"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- 3. UPDATE: Usuário pode atualizar apenas seu próprio perfil
CREATE POLICY "profiles_update_policy"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 4. DELETE: Usuário pode deletar apenas seu próprio perfil
CREATE POLICY "profiles_delete_policy"
ON public.profiles
FOR DELETE
TO authenticated
USING (auth.uid() = id);
```

---

## 4. Padrão 2: Modelo de Organizações & Membros (Tenants & RBAC)

Controle de acesso para a entidade raiz da organização e gerenciamento de seus membros.

### Políticas da Tabela `organizations`
```sql
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations FORCE ROW LEVEL SECURITY;

-- SELECT: Membros da organização podem visualizá-la
CREATE POLICY "org_select_policy"
ON public.organizations
FOR SELECT
TO authenticated
USING (public.is_org_member(id));

-- INSERT: Qualquer usuário autenticado pode criar uma nova organização
CREATE POLICY "org_insert_policy"
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- UPDATE: Apenas owners e admins podem editar dados da organização
CREATE POLICY "org_update_policy"
ON public.organizations
FOR UPDATE
TO authenticated
USING (public.has_org_role(id, ARRAY['owner', 'admin']))
WITH CHECK (public.has_org_role(id, ARRAY['owner', 'admin']));

-- DELETE: Apenas o owner pode excluir a organização
CREATE POLICY "org_delete_policy"
ON public.organizations
FOR DELETE
TO authenticated
USING (public.has_org_role(id, ARRAY['owner']));
```

### Políticas da Tabela `organization_members`
```sql
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members FORCE ROW LEVEL SECURITY;

-- SELECT: Membros podem ver todos os outros membros de sua organização
CREATE POLICY "org_members_select_policy"
ON public.organization_members
FOR SELECT
TO authenticated
USING (public.is_org_member(org_id));

-- INSERT: Apenas owners e admins podem convidar/adicionar novos membros
CREATE POLICY "org_members_insert_policy"
ON public.organization_members
FOR INSERT
TO authenticated
WITH CHECK (public.has_org_role(org_id, ARRAY['owner', 'admin']));

-- UPDATE: Apenas owners e admins podem alterar roles de membros
CREATE POLICY "org_members_update_policy"
ON public.organization_members
FOR UPDATE
TO authenticated
USING (public.has_org_role(org_id, ARRAY['owner', 'admin']))
WITH CHECK (public.has_org_role(org_id, ARRAY['owner', 'admin']));

-- DELETE: Owners/Admins podem remover membros, ou o próprio membro pode sair (leave)
CREATE POLICY "org_members_delete_policy"
ON public.organization_members
FOR DELETE
TO authenticated
USING (
  public.has_org_role(org_id, ARRAY['owner', 'admin']) 
  OR auth.uid() = user_id
);
```

---

## 5. Padrão 3: Recursos Escopados por Organização (Projetos, Documentos, Tasks)

Exemplo de políticas completas para entidades dependentes de uma organização (`projects`):

```sql
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects FORCE ROW LEVEL SECURITY;

-- 1. SELECT: Qualquer membro da organização pode visualizar os recursos
CREATE POLICY "projects_select_policy"
ON public.projects
FOR SELECT
TO authenticated
USING (public.is_org_member(org_id));

-- 2. INSERT: Membros com permissão de escrita (owner, admin, member) podem criar recursos
CREATE POLICY "projects_insert_policy"
ON public.projects
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_org_role(org_id, ARRAY['owner', 'admin', 'member'])
  AND auth.uid() = created_by
);

-- 3. UPDATE: Owners, admins ou o próprio criador do recurso podem editar
CREATE POLICY "projects_update_policy"
ON public.projects
FOR UPDATE
TO authenticated
USING (
  public.has_org_role(org_id, ARRAY['owner', 'admin'])
  OR (public.is_org_member(org_id) AND auth.uid() = created_by)
)
WITH CHECK (
  public.has_org_role(org_id, ARRAY['owner', 'admin'])
  OR (public.is_org_member(org_id) AND auth.uid() = created_by)
);

-- 4. DELETE: Apenas owners e admins da organização podem excluir recursos
CREATE POLICY "projects_delete_policy"
ON public.projects
FOR DELETE
TO authenticated
USING (public.has_org_role(org_id, ARRAY['owner', 'admin']));
```

---

## 6. Padrão 4: Logs de Auditoria Append-Only (Imutabilidade Estrita)

Para conformidade e segurança, logs de auditoria não podem ser alterados ou deletados via API cliente.

```sql
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;

-- 1. SELECT: Apenas administradores e owners da organização podem ler logs
CREATE POLICY "audit_logs_select_policy"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (public.has_org_role(org_id, ARRAY['owner', 'admin']));

-- 2. INSERT: Membros autenticados podem emitir eventos de log para sua org
CREATE POLICY "audit_logs_insert_policy"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_org_member(org_id)
  AND (user_id IS NULL OR user_id = auth.uid())
);

-- 3. UPDATE & DELETE: NENHUMA política criada.
-- No PostgreSQL, a ausência de políticas para UPDATE/DELETE sob RLS ativado
-- bloqueia automaticamente qualquer tentativa de mutação, garantindo imutabilidade estrita.
```

---

## 7. Padrão 5: Catálogo Público / Leitura Anônima e Escrita Autenticada

Utilizado para blogs, documentações públicas e catálogos de produtos.

```sql
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles FORCE ROW LEVEL SECURITY;

-- SELECT: Aberto para todos (inclusive usuários não autenticados / anon) para itens publicados
CREATE POLICY "articles_public_read_policy"
ON public.articles
FOR SELECT
TO anon, authenticated
USING (status = 'published' OR (auth.uid() IS NOT NULL AND auth.uid() = author_id));

-- INSERT: Apenas autores autenticados
CREATE POLICY "articles_author_insert_policy"
ON public.articles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = author_id);

-- UPDATE: Apenas o autor
CREATE POLICY "articles_author_update_policy"
ON public.articles
FOR UPDATE
TO authenticated
USING (auth.uid() = author_id)
WITH CHECK (auth.uid() = author_id);

-- DELETE: Apenas o autor ou admin do sistema
CREATE POLICY "articles_author_delete_policy"
ON public.articles
FOR DELETE
TO authenticated
USING (auth.uid() = author_id);
```

---

## 8. Teste e Verificação de Políticas RLS no SQL

Para validar o comportamento de isolamento em scripts de teste locais:

```sql
BEGIN;

-- Simular sessão como usuário autenticado '00000000-0000-0000-0000-000000000001'
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "00000000-0000-0000-0000-000000000001", "role": "authenticated"}';

-- Tentar consultar projetos (deve retornar apenas da sua org)
SELECT * FROM public.projects;

-- Tentar deletar projeto de outra organização (deve retornar 0 linhas afetadas ou erro)
DELETE FROM public.projects WHERE org_id = '99999999-9999-9999-9999-999999999999';

ROLLBACK;
```
