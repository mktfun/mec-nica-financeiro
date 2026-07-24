# Spec Plan: Correção da Extração de PIX & Expansão da Janela de Conciliação (fix-pix-parsing-and-extended-window)

## Tasks

- [ ] [FRONTEND] Implementar Parser Universal de Formas de Pagamento em `src/hooks/useOsImportProcessor.ts`:
  - [ ] Criar função `parsePaymentMethods` com regex para extração de PIX, Crédito, Débito e Dinheiro.
  - [ ] Garantir que strings de pagamento sem dois-pontos (ex: `"PIX 680,00"`, `"PIX R$680"`, `"TRANSFERÊNCIA PIX"`) atribuam o valor a `parsed_pix_transfer`.
  - [ ] Remover fallback que sobrescrevia PIX por cartão quando a string informava PIX.
- [ ] [FRONTEND] Corrigir leitura do banco e expandir a janela de busca para D-7 em `src/hooks/useConciliacao.ts`:
  - [ ] Corrigir leitura em `osPixList` usando a coluna real do banco `os.pix_transfer_value || os.parsed_pix_transfer`.
  - [ ] Expandir a janela de busca da conciliação para os últimos 7 dias (`d0` até `d7`).
  - [ ] Atualizar cálculo de agrupamento do PIX para somar os valores das OSs e parear com depósitos OFX de dias anteriores.
- [ ] [TEST] Verificar compilação limpa com `npm run build`.
