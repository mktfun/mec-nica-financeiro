# Spec Plan: Melhoria do Wizard de ImportaçÁo, Preview e Logs de GravaçÁo em Tempo Real (wizard-and-logs-enhancement)

## Tasks

- [x] [FRONTEND] Atualizar `src/components/importacoes/CentralImportWizard.tsx`:
  - [x] Adicionar suporte ao `step = 4` (Feed de Logs & ConclusÁo).
  - [x] Atualizar o componente `StepIndicator` para exibir 4 passos ("1. Upload", "2. Lojas", "3. Preview", "4. Processando").
  - [x] Refatorar o método `handleSave` para disparar entradas no feed de logs em tempo real (`importLogs`) durante as mutações.
  - [x] Criar a interface de Terminal de Logs em tempo real no Step 4.
  - [x] Criar o painel de celebraçÁo com os botões "Ir para a Tela de ConciliaçÁo" (redirecionando para `/conciliacao`) e "Ver Histórico de Importações".
  - [x] Refatorar visualmente a tela de Preview (Step 3) com cards estatísticos e layout sanfonado limpo por loja.
- [x] [TEST] Verificar compilaçÁo do projeto com `npm run build`.
