# Design: Gestão de Acessos, Permissões Granulares e Logs Diários (Spec 233)

## 1. Schema Updates

```sql
-- Adicionar colunas de controle de acesso ao profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS can_edit_data boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS can_import boolean DEFAULT true;

-- Criar tabela de auditoria diária estruturada
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    target_date date NOT NULL,
    user_id uuid REFERENCES auth.users(id),
    user_email text,
    action_type text NOT NULL, -- 'importacao', 'fechamento', 'edicao_manual', 'vinculo_os', 'agente_ia'
    title text NOT NULL,
    description text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_target_date ON public.audit_logs(target_date);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
```

## 2. Componentes e Estrutura Frontend

- `src/hooks/useUserPermissions.ts`: Carrega o perfil do usuário atual e seus privilégios (`canEdit`, `canImport`, `isAdmin`).
- `src/hooks/useAuditLogs.ts`: Hook para consulta de logs filtrados por data e inserção de eventos de auditoria.
- `src/components/configuracoes/UserManagementPanel.tsx`: Lista de usuários, criação de novo usuário e alternância de permissões.
- `src/components/configuracoes/CreateUserModal.tsx`: Modal para cadastro de usuário (Nome, Email, Senha, Permissões).
- `src/components/configuracoes/DailyAuditLogsView.tsx`: Timeline rica e limpa de logs diários com seletor de dia, badges por tipo de ação e JSON viewer expansível.
- `src/components/agente/ConfiguracoesPanel.tsx`: Abas estruturadas:
  1. `Acessos & Permissões` (Gestão de usuários)
  2. `Logs de Auditoria Diária` (Passo a passo por dia)
  3. `Motor & Lojas` (Configurações existentes do bot e filiais)
