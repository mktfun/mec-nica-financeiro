# Spec Plan: CorreçÁo de Crash na Tela de Agente e Limpeza do Sidebar (fix-sidebar-crash)

## Tasks

- [x] [FRONTEND] Editar `src/routes/agente.tsx` (linha 8) e importar `Workflow` de `lucide-react`.
- [x] [FRONTEND] Editar `src/components/layout/Sidebar.tsx` e remover os objetos de navegaçÁo referentes a `/logs/agente` e `/logs/motor` do array `navItems`.
- [x] [TEST] Verificar se a aplicaçÁo builda com sucesso e nÁo crasha ao navegar para as páginas afetadas.
