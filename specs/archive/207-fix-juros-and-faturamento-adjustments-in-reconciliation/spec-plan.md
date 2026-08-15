# Spec Plan: 207-fix-automatic-rede-juros-calculation-on-import

## Tasks

- [x] [UTILS] Em `src/lib/parsers/numberUtils.ts`, ignorar valores percentuais (strings terminadas com `%`) no `extractNumber` para evitar que colunas como `"2.04%"` virem números monetários.
- [x] [PARSER] Em `src/lib/parsers/redeParser.ts`, implementar mapeamento dinâmico inteligente para os cabeçalhos reais da REDE (`valor da venda atualizado`, `valor da venda original`, `valor total das taxas descontadas`, `valor MDR`, `valor taxa de recebimento automático`, `valor líquido`).
- [x] [PARSER] Em `src/lib/parsers/redeParser.ts`, calcular `interest` com prioridade na coluna total de taxas ou na diferença contábil `grossAmount - netAmount`.
- [x] [FRONTEND] Em `src/components/importacoes/CentralImportWizard.tsx`, consolidar `jurosRedeTotal` a partir das transações da REDE e garantir a persistência em `daily_snapshots.juros_rede`.
- [x] [TEST] Executar compilação com `cmd.exe /c "npm run build"`.
