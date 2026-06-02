# Design: Mapeamento Dinâmico de Planilha

## UI e Componentes
Apenas o componente `ImportReportDialog.tsx` será alterado.
Nenhum novo componente ou design system será introduzido. O visual da modal que você compartilhou já está perfeito e funcional.

## Arquitetura da Extração de Dados (Lógica Pura)
1. **Leitura Bruta:** Usar `const rows = xlsx.utils.sheet_to_json<any[]>(ws, { header: 1 })`.
2. **Scan de Cabeçalho:**
   Iterar `rows` até achar uma linha onde alguma célula contenha "OS" e outra contenha "Data" (ou "Data Entrada" / "Data Fim") e "Status".
3. **Mapeamento de Índices (`colMap`):**
   ```javascript
   let colOs = -1, colDataFim = -1, colTotal = -1, colLiquidado = -1, colPagamento = -1, colStatus = -1, colPlaca = -1;
   // Loop na headerRow para associar cada nome de coluna ao seu respectivo número de índice (0, 1, 2, 3...)
   ```
4. **Extração das Linhas de Dados:**
   Iterar a partir de `headerRowIndex + 1`.
   Verificar se a célula da coluna `colOs` não está vazia e é representativa de uma OS (ex: tem número).
   Puxar os valores usando `row[colDataFim]`, `row[colTotal]`, etc., usando os índices mapeados acima, eliminando o achismo do `__EMPTY_...`
5. **Integração com `useImportProcessor`:** O objeto final montado (ParsedOS) continuará o mesmo, garantindo que o banco de dados não quebre e a exibição permaneça exata.
