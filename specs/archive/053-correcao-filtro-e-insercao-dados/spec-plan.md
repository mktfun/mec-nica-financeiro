# Spec Plan: Correção de Inserção e Filtro de Competência (053)

## Checklist de Implementação

### 1. Refatoração de Reuso de Lógica (`useImportProcessor.ts`)
- `[ ]` Em `src/hooks/useImportProcessor.ts`, extrair a lógica pesada de inserção/idempotência de OSs (`patio_os`) e Recebíveis (`receivables`) que está atualmente acoplada dentro do `useMutation`.
- `[ ]` Criar e exportar uma função isolada `export async function savePatioOsAndReceivables(storeId: string, storeName: string, osArray: ParsedOS[], receivablesArray: ParsedReceivable[])` contendo essa lógica exata.

### 2. Ajuste do Wizard Unificado (`CentralImportWizard.tsx`)
- `[ ]` Importar a nova função `savePatioOsAndReceivables`.
- `[ ]` Dentro de `handleConfirm`, no loop de `results.osFiles`, **antes** de processar as transações, invocar `await savePatioOsAndReceivables(...)` para cada loja importada.
- `[ ]` **O Filtro Estrito:** No momento de popular o array `txsToInsert`:
  - Para `osResult.osArray`: Adicionar o filtro `const dt = os.closed_at || os.opened_at; if (dt === targetDate) { ... }` para barrar OSs de outros dias de sujarem a conciliação atual.
  - Para `results.maquininhaItems`: Precisamos converter a data da venda (que pode estar como "09/06/2026") para formato `YYYY-MM-DD` (ex: "2026-06-09") e compará-la com o `targetDate`. Se não for do mesmo dia, barrar a inserção no `txsToInsert`.

### 3. Ajuste de Logs de Importação
- `[ ]` O `import_logs` inserido por `handleConfirm` usa as contagens `total_os` baseadas no `txsToInsert`. Essa métrica reflete as "OSs da Competência". Isso está correto, porém vamos assegurar que os totais estejam alinhados com os itens que passaram no filtro (e não os descartados).
