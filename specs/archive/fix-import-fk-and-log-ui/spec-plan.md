# Spec Plan: Correção de FK na Importação e Redesign do Painel de Progresso (fix-import-fk-and-log-ui)

## Tasks

- [x] [BACKEND] Atualizar Foreign Keys `conciliation_matches_ofx_transaction_id_fkey` e `conciliation_matches_rede_transaction_id_fkey` com `ON DELETE SET NULL` no Supabase
- [x] [BACKEND] Atualizar RPC `delete_import_batch` para deletar de `conciliation_matches` antes de deletar de `transactions`
- [x] [FRONTEND] Refatorar `useImportProcessor.ts`:
  - [x] Garantir deleção ordenada de `conciliation_matches` antes de `transactions` no fallback JS
- [x] [FRONTEND] Refatorar `Step 4` em `CentralImportWizard.tsx`:
  - [x] Remover totalmente estilos de terminal retrô (`font-mono`, `bg-black`, `bg-[#0a0d1a]`, `Terminal` CMD icon)
  - [x] Criar Painel Executivo de Progresso com barra de porcentagem animada (0% - 100%)
  - [x] Criar 4 cards de etapas (`Pátio OS`, `Maquininha Rede`, `Extrato OFX`, `Conciliação`) com status badges e ícones
  - [x] Criar Card de Erro e Alerta amigável com suporte a re-tentativa em caso de exceção
- [x] [TEST] Testar o envio de lote completo e verificar se o painel abre limpo e a gravação conclui sem erro de FK
- [x] [TEST] Verificar build limpo com `npm run build`
