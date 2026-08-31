# Spec Plan: Exibição Precisa e Híbrida de Órfãos Reais no Passo 5 (326)

## Tasks

- [x] [FRONTEND] Atualizar `src/components/importacoes/wizard/Step2NonRevenueJustifications.tsx` com fallback inteligente em memória que oculta os 43 débitos casados e exibe estritamente as 4 saídas órfãs e a 1 entrada órfã
- [x] [FRONTEND] Sincronizar pré-matching no `src/components/importacoes/CentralImportWizard.tsx` para marcar `matched_bill_id` e `matched_os_number` nos resultados brutos antes de abrir o Passo 5
- [x] [TEST] Executar Cenário 1: Validar que os badges exibem exatamente `Saídas Órfãs (4)` e `Entradas Órfãs (1)` para os arquivos de `31-08`
- [x] [TEST] Executar Cenário 2: Testar justificativa inline de cada saída órfã e build de produção com `npm.cmd run build` limpo
