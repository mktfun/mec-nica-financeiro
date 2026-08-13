# Spec Plan: Refatoração Absoluta do Marco Zero: Matemática, Logs e UI Dedicada (186)

## Tasks

- [x] [BACKEND] Criar a migration SQL `20260813113000_process_marco_zero_rpc.sql` implementando a RPC atômica `process_marco_zero_import` com isolamento estrito por `store_id`, idempotência e retorno de payload de log JSON.
- [x] [FRONTEND] Atualizar `MarcoZeroWizard.tsx` para chamar a RPC `process_marco_zero_import` no lugar das operações avulsas no banco.
- [x] [FRONTEND] Criar a tela/modal de Sucesso pós-importação em `MarcoZeroWizard.tsx` com o resumo da operação e o botão "Baixar Logs de Execução" (`.json`).
- [x] [FRONTEND] Criar o componente de UI dedicada `MarcoZeroInitialStatePanel.tsx` (ou integrar em `ResumoDiaPanel.tsx`) para exibir a visão simplificada de Estado Inicial quando `is_marco_zero: true`.
- [x] [FRONTEND] Atualizar `conciliacao.index.tsx` para detectar a flag de Marco Zero e alternar para a UI Dedicada de Estado Inicial.
- [x] [TEST] Testar compilação do projeto com `npm run build`.
- [x] [TEST] Validar execução da RPC, download do arquivo de logs `.json` e visualização da UI dedicada.
