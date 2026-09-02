# Spec Plan: Teste Pericial Sequencial Isolado de Conciliação Multi-Dias (343)

## Tasks

- [x] [TEST & BENCHMARK] Criar o script canônico de benchmark multi-dias `scripts/benchmark-august-multi-days.cjs` integrando os arquivos brutos das 4 pastas (`14-08`, `17-08`, `18-08`, `19-08`) e as planilhas oficiais (`CONCILIAÇÃO 1408.xlsx` a `1908.xlsx`)
- [x] [DATABASE] Processar o Dia 0 (14/08/2026 - Marco Zero): Saldo Bancos R$ 170.244,95, Cheque Especial -R$ 11.849,09, Pátio R$ 107.229,76 -> Caixa Atual R$ 289.386,12 (Dif -R$ 0,78)
- [x] [DATABASE] Processar o Dia 1 (17/08/2026): Caixa Anterior R$ 289.386,12 -> Caixa Atual R$ 299.076,86, Faturamento Total R$ 96.172,06, Contas R$ 86.481,76 (Dif -R$ 0,44)
- [x] [DATABASE] Processar o Dia 2 (18/08/2026): Caixa Anterior R$ 299.076,86 -> Caixa Atual R$ 316.215,85, Faturamento Total R$ 41.857,57, Contas R$ 24.718,93 (Dif -R$ 0,35)
- [x] [DATABASE] Processar o Dia 3 (19/08/2026): Caixa Anterior R$ 316.215,85 -> Caixa Atual R$ 271.922,90, Faturamento Total R$ 73.813,07, Contas R$ 118.106,68 (Dif -R$ 0,66)
- [x] [VERIFY] Executar a verificação cruzada (Sistema vs Excel) dos 5 Pilares e DRE para os 4 dias e confirmar que os snapshots de 28/08, 31/08 e 01/09 estão 100% preservados
- [x] [TEST] Executar build gate (`npm run build`) com 0 erros
