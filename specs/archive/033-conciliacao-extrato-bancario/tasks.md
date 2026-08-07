# Tasks: Refatoração da Tela de Conciliação e Bugfix de Parsers (Spec 033)

## Backend / Database Engineer
- `[ ]` **Migration:** Criar migration Supabase (em `/supabase/migrations/`) para adicionar a coluna `bank_total` (numeric, default 0) na tabela `reconciliations`.
- `[ ]` **Interfaces:** Atualizar as interfaces (ex: `ReconciliationRow`) no frontend em `src/lib/supabase.ts` para refletir `bank_total`.
- `[ ]` **Util:** Criar `src/lib/parsers/numberUtils.ts` exportando a função robusta `extractNumber(val: any): number` que saiba converter `24.000,00` (formato BR) ou `24,000.00` (formato US) e Strings Sujas para Float puro de JS sem quebrar casas decimais.
- `[ ]` **Parsers Fix:** Implementar `extractNumber` em:
  - `WizardImportacao.tsx` (Parser de Maquininha)
  - `src/lib/parsers/contasAPagarParser.ts`
  - `src/lib/parsers/jurosRedeParser.ts`
- `[ ]` **Anti-Lixo Fix:** Adicionar regras em `contasAPagarParser.ts` para PULAR estritamente linhas onde `description` ou `storeName` contenham as palavras `"TOTAL"`, `"SOMA"` ou similares (case-insensitive) para não duplicar valores na inserção.

## Frontend Engineer
- `[ ]` **Refatorar UI da Conciliação (`src/routes/conciliacao.tsx`)**:
  - No bloco Global: Trocar `Declarado Físico` e `Total Maquininhas` por **`Extrato Bancário`**. Atualizar fórmula da `divergenciaGlobal = totalSistema - totalBancario`.
  - Nos Cards: Remover `Apurado Maquininha` e o input de Físico. Mostrar o `Extrato Bancário` usando `bank_total`. Divergência será `sys - bank_total`.
- `[ ]` **Refatorar UI de Histórico (`src/routes/importacoes.tsx`)**:
  - No map de `paginatedImports`, ao identificar que o lote foi de despesas (`log.os_count === 0 && log.total_os > 0`), mudar a label de `Lote OS` para `Lote Despesas` e pintar a métrica com a cor apropriada, eliminando a confusão de ver dados zerados.
- `[ ]` **Sanity Check:** Executar `npm run build` após todas as refatorações.
