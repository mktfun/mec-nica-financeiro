# Spec Plan: Gestão de Acessos, Permissões Granulares e Logs Diários (Spec 233)

## Tasks

- [x] [DATABASE/SCHEMA] Criar tabela `audit_logs` e adicionar colunas de permissão (`can_edit_data`, `can_import`, `email`) na tabela `profiles`.
- [x] [DATABASE/RPC] Criar RPCs seguras para criação de usuários (`admin_create_user`) e atualização de permissões (`admin_update_user_permissions`).
- [x] [HOOKS] Criar `src/hooks/useUserPermissions.ts` e `src/hooks/useAuditLogs.ts`.
- [x] [COMPONENTS/USERS] Criar `UserManagementPanel.tsx` e `CreateUserModal.tsx` para gerenciar acessos com e-mail, senha e toggles de permissão.
- [x] [COMPONENTS/LOGS] Criar `DailyAuditLogsView.tsx` com timeline vertical, seletor de data e detalhes expansíveis de cada passo do dia.
- [x] [INTEGRATE/PANEL] Integrar abas no `ConfiguracoesPanel.tsx` e aplicar travas de permissão em `ResumoDiaPanel.tsx` e `CentralImportWizard.tsx`.
- [x] [QUALITY/GATE] Executar `cmd.exe /c "npx tsc --noEmit && npm run build"` garantindo 0 erros.
- [x] [GIT/SYNC] Sincronizar branches `main` e `master` no GitHub.
