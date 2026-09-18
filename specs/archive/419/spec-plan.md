# Spec 419 — Spec Plan: Correção do Parser da Rede e Descarte Falso-Positivo

## Tasks

### [PARSER]
- [x] Completed: Em `src/lib/parsers/redeParser.ts`, adicionar fallback para calcular `netAmount = roundCurrency(Math.max(0, grossAmount - interest))` quando `rawNetNum === 0` (ou `valor líquido` for `"-"`) e `grossAmount > 0`. | Ref: `skills/backend-patterns` | Verificação: Script headless processando arquivos da pasta 18-09.

### [ETL MANAGER]
- [x] Completed: Em `src/lib/parsers/centralImportManager.ts` (linha 276), atualizar a condição de descarte para `redeRes.transactions.length === 0 || (totalNet <= 0 && totalGross <= 0)` de modo que arquivos com `totalGross > 0` nunca sejam descartados. | Ref: `skills/backend-patterns` | Verificação: Script headless verificando `ignoredEmptyRede.length === 0` para a pasta 18-09.

### [VERIFICAÇÃO / TERMINAL GATE]
- [/] In Progress: Executar script E2E de parsing em todos os 6 arquivos de Rede da pasta `18-09` confirmando 33 transações e R$ 57.679,52 extraídos. | Ref: `skills/backend-patterns` | Verificação: `node scratch/test-rede-fix.cjs` exit code 0.
- [ ] Pending: Executar `npm run build` para garantir zero erros de tipagem e integridade da compilação. | Ref: `skills/sdd-apply` | Verificação: `npm run build` exit code 0.
