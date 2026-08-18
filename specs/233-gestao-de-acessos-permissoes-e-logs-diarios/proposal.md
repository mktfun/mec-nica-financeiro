# Proposal: Gestão de Acessos, Permissões Granulares e Logs Passo a Passo por Dia (Spec 233)

## 1. Visão Geral do Requisito

O objetivo desta spec é entregar duas soluções integradas:
1. **Controle de Acessos & Permissões (RBAC):** Criar usuários (email e senha) e definir o que cada um pode fazer:
   - **`Pode Importar Dados` (`can_import`):** Autorização para subir OFX, OSs, Maquininhas e rodar o wizard.
   - **`Pode Editar Dados` (`can_edit_data`):** Autorização para clicar em "Editar Fechamento", alterar inputs manuais, salvar fechamentos e vincular transações.
   - **`Apenas Visualizar`:** Consulta, auditoria e navegação nos dados e relatórios sem permissão de mutação.
2. **Visualizador de Logs Passo a Passo por Dia:**
   - Visualizar cronologicamente todas as ações ocorridas em cada data selecionada:
     - 📥 **Importações:** arquivos enviados, quantidades processadas e usuário responsável.
     - 🤖 **Ações dos Agentes:** matches automáticos, conciliações parciais e deduções de pátio.
     - ✏️ **Fechamentos & Edições:** quem alterou valores manuais, quais campos mudaram e quando foi salvo.
     - 🔗 **Vínculos:** vinculações e desvinculações de PIX e OSs.

---

## 2. Arquitetura Proposta

### A. Banco de Dados & Segurança (Supabase PostgreSQL)
- **Tabela `profiles`:**
  - Adição das colunas `email`, `can_edit_data` (boolean), `can_import` (boolean).
- **RPC `admin_create_user`:**
  - Criação direta de usuários com email/senha no `auth.users` e inserção em `profiles` com as devidas permissões.
- **RPC `admin_update_user_permissions`:**
  - Atualização com 1 clique das permissões (`can_edit_data`, `can_import`, `role`).
- **Tabela `audit_logs` (ou `system_logs` enriquecida):**
  - Registro de cada passo com `target_date`, `user_email`, `action_type`, `title`, `description` e `metadata`.

### B. Frontend & Controle de Permissões
- **Hook `useUserPermissions()`:**
  - Carrega as permissões do usuário logado e expõe `{ canEdit, canImport, isAdmin, role, user }`.
- **Travas na Interface:**
  - `ResumoDiaPanel.tsx`: Se `canEdit === false`, o botão "Editar Fechamento" fica desabilitado com tooltip explicativo (*"Seu perfil possui acesso apenas de visualização"*).
  - `conciliacao.index.tsx` & `Sidebar.tsx`: Se `canImport === false`, bloqueia ou desabilita o acesso à importação.
- **Painel de Gestão de Acessos (`/configuracoes`):**
  - Card de listagem de usuários com badges de papel (`Admin`, `Operador`, `Visualizador`).
  - Botão "+ Novo Acesso" abrindo modal com inputs de Nome, Email, Senha e switches de permissão (`Pode Importar`, `Pode Editar`).
  - Edição rápida de permissões dos usuários existentes.
- **Visualizador de Logs Diários (`/configuracoes` -> Aba "Logs de Auditoria" ou Rota Dedicada):**
  - Seletor de data (`< 18/08/2026 >`).
  - Timeline vertical com cards minimalistas e elegantes por horário, agrupados por categoria (Importação, IA, Fechamento, Vínculos).
  - Visualizador expansível de detalhes técnicos (JSON / payload).

---

## 3. Experiência do Usuário (Discreta e Moderna)
- Layout escuro moderno, alinhado com o design system do projeto.
- Zero alertas invasivos: feedback claro com toasts e estados desabilitados informativos.
