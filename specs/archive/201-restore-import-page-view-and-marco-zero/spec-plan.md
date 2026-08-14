# Plano de Execução: Spec 201

## Tasks

- [x] [FRONTEND/VIEW] Criar `src/components/importacoes/DailyImportView.tsx` como componente de tela cheia (sem popup/backdrop fixo, 2 colunas amplas com dropzone, inputs globais, grid de OSs órfãs e botão de fechamento).
- [x] [FRONTEND/ROUTE] Refatorar `src/routes/importacoes.tsx` para layout em tela cheia com alternância de abas: `Fechamento Diário`, `Carga de Marco Zero` (`MarcoZeroWizard`) e `Histórico de Lotes`.
- [x] [FRONTEND/NAVIGATION] Atualizar `src/routes/conciliacao.index.tsx` para redirecionar diretamente para `/importacoes` com a data ativa via TanStack Router (`useNavigate`), eliminando a invocação do popup modal.
- [x] [CLEANUP] Remover ou descontinuar `ImportConciliacaoModal.tsx` em favor de `DailyImportView.tsx`.
- [x] [QUALITY/GATE] Executar `cmd.exe /c "npm run build"` garantindo TypeScript limpo e bundling 100% verde.
- [x] [TEST] Validar navegação de tela cheia, importação diária regular, alternância para Marco Zero e histórico de lotes.
