# Spec Plan — Spec 367: Restauração do CentralImportWizard no Modo Manual

## Tasks

- [x] [FRONTEND] Atualizar `src/routes/importacoes.tsx`:
  - [x] Renderizar `CentralImportWizard` quando `search.mode === 'manual'`, com barra superior de retorno.
  - [x] Ajustar transição de cancelamento e retorno ao seletor de modo.

- [x] [FRONTEND] Atualizar `src/components/importacoes/bifurcacao/FechamentoModeSelector.tsx`:
  - [x] Ajustar textos, badges e descrição do Card 1 para "Modo Manual (Importação em Massa)".
  - [x] Informar suporte ao dropzone universal de todos os arquivos juntos.

- [x] [TEST] Validação e Quality Gate:
  - [x] Executar typecheck e build (`bun run build`).
  - [x] Validar rotas e ausência de warnings.
