# Design: fix-ofx-precision-jabaquara-kennedy-and-ui-labels (192)

## Arquitetura Técnica
1. **Parser Local de Balanço OFX (`src/lib/parsers/ofxParser.ts`)**: 
   - A lógica da tag `<LEDGERBAL>` será blindada. Se houver um valor `balStr`, faremos o clean primitivo (`balStr.replace(',', '.').trim()`).
   - Usaremos o `parseFloat()` nativo e multiplicaremos por `100` seguido de `Math.round()` para cravar os centavos estritamente.
   - O `bankBalance` recebe o valor convertido de volta à base `cents / 100`, eliminando as imprecisões e truncamentos errôneos gerados pelo tratador legados de strings.
2. **Interface do Usuário (`src/routes/conciliacao.index.tsx`)**:
   - A tabela que exibe as filiais mapeará a coluna/header `Faturam. Banco` (ou o subtítulo no grid individual) para `Saldo Banco Itaú`.

## Interfaces TypeScript
- `bankBalance` em `OfxParseResult` continua sendo numérico. O impacto é unicamente no ciclo de vida do parse.

## Fluxo de UI
A tela inicial (Index) refletirá a identidade correta da variável. Na re-importação dos arquivos OFX diários (Jabaquara e Kennedy), os valores processados serão interpretados na grandeza decimal exata, subindo 10x para o teto real verificado na conciliação manual.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1:** Importar arquivo OFX Jabaquara (`<BALAMT>39851.9`). A conversão de `parseFloat` manterá `39851.9`, o arredondamento prenderá `3985190` centavos, e o saldo retornado será rigorosamente `39851.90`.
- **Cenário 2:** Rótulo da tabela de lojas apresentando texto legível e idêntico à conciliação manual.
