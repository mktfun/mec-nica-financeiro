# Spec Plan: CorreçÁo da ExtraçÁo de PIX & ExpansÁo da Janela de ConciliaçÁo (fix-pix-parsing-and-extended-window)

## Tasks

- [ ] [FRONTEND] Implementar Parser Universal de Formas de Pagamento em `src/hooks/useOsImportProcessor.ts`:
  - [ ] Criar funçÁo `parsePaymentMethods` com regex para extraçÁo de PIX, Crédito, Débito e Dinheiro.
  - [ ] Garantir que strings de pagamento sem dois-pontos (ex: `"PIX 680,00"`, `"PIX R$680"`, `"TRANSFERÊNCIA PIX"`) atribuam o valor a `parsed_pix_transfer`.
  - [ ] Remover fallback que sobrescrevia PIX por cartÁo quando a string informava PIX.
- [ ] [FRONTEND] Corrigir leitura do banco e expandir a janela de busca para D-7 em `src/hooks/useConciliacao.ts`:
  - [ ] Corrigir leitura em `osPixList` usando a coluna real do banco `os.pix_transfer_value || os.parsed_pix_transfer`.
  - [ ] Expandir a janela de busca da conciliaçÁo para os últimos 7 dias (`d0` até `d7`).
  - [ ] Atualizar cálculo de agrupamento do PIX para somar os valores das OSs e parear com depósitos OFX de dias anteriores.
- [ ] [TEST] Verificar compilaçÁo limpa com `npm run build`.
