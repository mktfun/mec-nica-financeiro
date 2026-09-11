# Spec Plan — Spec 396: Sincronização Canônica do Card "Saldo Bancos + Dinheiro" com o Modal Raio-X

## Tasks

- [x] **Task 1: Enriquecimento Canônico no Hook de Conciliação (`useBackendConciliacao.ts`)**
  - [x] 1.1 Calcular `storesPositiveOfx` e `storesNegativeOfx` agregando os saldos bancários de cada filial de `enrichedStores`.
  - [x] 1.2 Atualizar `baseBancoPositivo` e `baseBancoNegativo` para priorizar a soma das lojas, protegendo contra retornos nulos ou zerados da RPC/snapshot.
  - [x] 1.3 Injetar `saldo_bancos_ofx_positivo`, `saldo_bancos_positivo`, `saldo_negativo_itau` e `total_saldo_banco_positivo` recalculados no objeto final retornado por `useDailyReconciliationSummary`.

- [x] **Task 2: Sincronização do Card "SALDO BANCOS + DINHEIRO" (`ResumoDiaPanel.tsx`)**
  - [x] 2.1 Criar o hook/memo `derivedBankTotals` compartilhando exatamente as mesmas regras de extração e fallbacks do `SaldoBancosDetailModal.tsx`.
  - [x] 2.2 Substituir a leitura do valor principal do card por `derivedBankTotals.totalPositivoConsolidado` (R$ 154.794,67).
  - [x] 2.3 Substituir a leitura do sub-chip "Extrato OFX (Positivo)" por `derivedBankTotals.ofxPositivo` (R$ 149.272,57).
  - [x] 2.4 Vincular a visibilidade e valores dos sub-chips Dinheiro no Cofre, Maquininhas (D+1) e Cheque Especial ao `derivedBankTotals`.

- [x] **Task 3: Validação de Terminal (Build Gate) & Verificação Visual**
  - [x] 3.1 Executar `npm run build` para garantir zero erros de tipagem TypeScript ou compilação.
  - [x] 3.2 Verificar a paridade matemática exata entre os valores renderizados no Card e os valores do Modal Raio-X.
