# Design: restore-previous-parser-and-fix-decimals-and-math (194)

## Arquitetura Técnica
1. **Parser de Arquivos Bancários (`src/lib/parsers/ofxParser.ts`)**:
   - A extração do saldo (`LEDGERBAL` / `<BALAMT>`) já possui a estrutura para `parseFloat`, porém a usabilidade deve ser exata e direta, removendo vírgulas desnecessárias e convertendo de forma primitiva.
   - O mesmo será feito nas extrações de limites (`<OVERDRAFTLIMIT>`, `<CREDITLIMIT>`) e **MUITO IMPORTANTE**, na extração do `<TRNAMT>`. Se o `TRNAMT` falhar na dízima, os lançamentos somam incorretamente.
   - Substituiremos as chamadas perigosas de `extractNumber()` pelo bloco:
     ```typescript
     const cleanStr = rawStr.replace(',', '.').trim();
     const parsedFloat = parseFloat(cleanStr);
     const cents = Math.round(parsedFloat * 100); 
     const finalValue = cents / 100;
     ```

2. **Fechamento e Diferença (`src/lib/modulo1Calculations.ts`)**:
   - Na função `calculateFechamentoGlobal` (ou similar que compute o saldo final e disponível), a linha da Diferença Final deve confrontar matematicamente magnitudes:
     `const diferenca_final = Math.abs(valor_disponivel_contas) - subtotal_valor_contas;`
   - Se os dois valores ficavam negativos, a UI acumulava `-97k - 97k = -195k`. Agora forçamos o primeiro termo a ser sempre a magnitude (positivo), e subtraímos as contas para achar o gap real (-4,85).

3. **Banco de Dados (Limpeza do Dia 11/08)**:
   - Migration `20260813170000_purge_corrupted_snapshot.sql` será executada.
   - Comandos: `DELETE FROM dashboard_daily_logs WHERE date = '2026-08-11'; DELETE FROM conciliation_daily_logs WHERE date = '2026-08-11'; DELETE FROM reconciliations WHERE date = '2026-08-11'; DELETE FROM ofx_transactions WHERE target_date = '2026-08-11';`

## Cenários de Verificação
- **Cenário 1:** Jabaquara e Kennedy importados batem exatamente R$ 39.851,90 e R$ 458,50, levando o global para R$ 106.327,07 cravado.
- **Cenário 2:** Diferença final exibe `-R$ 4,85` (ou próximo disso) e não `-R$ 195.793,61`.
