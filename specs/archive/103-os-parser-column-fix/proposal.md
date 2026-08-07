# EspecificaçÁo de Funcionalidade: CorreçÁo do Mapeamento de Colunas do Excel de OS (Feature 103)

## 1. VisÁo Geral
O parser de planilhas de OS (`useOsImportProcessor.ts`) possui um bug crítico de mapeamento heurístico de colunas que impede o sistema de extrair o valor pago (`paid_value`) e o valor total correto em arquivos gerados pelo sistema Oficina Inteligente.

## 2. Problema Atual
O cabeçalho do Excel extraído pelo Oficina Inteligente contém as colunas: 
`R$ Total da OS` | `Total Pagto na OS` | `Total no Financeiro`

O parser atual aplica as seguintes falhas:
1. **Sobrescrita do `totalValue`**: A heurística `colName.includes('total')` faz com que a coluna `R$ Total da OS` (índice 10) seja mapeada como `totalValue`, mas logo em seguida as colunas `Total Pagto na OS` (índice 11) e `Total no Financeiro` (índice 13) sobrescrevem o índice. O `totalValue` acaba capturando o valor financeiro incorreto.
2. **Falha na captura do `paidValue`**: A heurística do `paidValue` procura por `'pago'` ou `'valor pago'`. Como o Excel exporta a abreviaçÁo `'pagto'` (em "Total Pagto na OS"), a coluna é sumariamente ignorada. Consequentemente, o `paidValue` cai no fallback default de `0`.
3. **Quebra da ConciliaçÁo**: Com o `paid_value = 0`, o Matching Engine considera que a OS está em aberto e nunca consegue conciliá-la automaticamente com o registro bruto recebido da REDE ou Banco.

## 3. Escopo da SoluçÁo
- **Refatorar `useOsImportProcessor.ts`** (linha ~101):
  - Alterar a lógica de mapeamento para que a primeira coluna que satisfaça a condiçÁo de `totalValue` nÁo seja sobrescrita por colunas subsequentes que apenas contenham a palavra "total".
  - Incluir as palavras-chave `'pagto'` e `'pgto'` na lista de checagem do `paidValue`.
  - Garantir que se a coluna contiver `'pagto'`, ela seja forçadamente mapeada para `paidValue` (protegendo-a de ser engolida pela heurística ingênua de `totalValue`).
