# Design de ImplementaçÁo (003-import-parser-rework)

## 1. AtualizaçÁo do Banco de Dados (MigraçÁo Supabase)
Para garantir a idempotência (poder importar repetidas vezes sem duplicar nada), precisamos forçar a unicidade no banco.
- Tabela `patio_os`: `ALTER TABLE patio_os ADD CONSTRAINT unique_store_os UNIQUE (store_id, os_number);`
- Tabela `receivables`: `ALTER TABLE receivables ADD COLUMN os_number TEXT;`
- Tabela `receivables`: `ALTER TABLE receivables ADD CONSTRAINT unique_receivable_os UNIQUE (store_id, os_number, type);`
*(Isso previne que a OS nº 123 gere dois recebíveis de "CartÁo Crédito" para a mesma loja)*.

## 2. Lógica de Negócio do Parser (ImportReportDialog)
A rotina passará a transformar cada linha validada do Excel em um Objeto unificado contendo:
```typescript
interface ParsedOS {
  os_number: string;
  plate: string;
  opened_at: string; // ISO
  closed_at: string | null;
  total_value: number;
  paid_value: number;
  payment_method: string;
  status: 'em_aberto' | 'pago_parcial' | 'finalizado';
}
```
Além de extrair os recebíveis e já preparar o JSON:
```typescript
interface ParsedReceivable {
  os_number: string;
  type: string;
  value: number;
  date: string; // Data finalizada
  due_date: string; // date + 30 dias (crédito), + 1 dia (débito)
  status: 'pendente' | 'recebido';
}
```

## 3. Batch Upserting via Supabase Client
Como o Supabase Data API aceita arrays, dispararemos `supabase.from('patio_os').upsert(parsedOSArray, { onConflict: 'store_id,os_number' })`.
O mesmo vale para `receivables`.
O somatório para o `reconciliations` continua ocorrendo na tela, consolidando os valores num único envio de `useSaveImportedReport`.

## 4. Dependências Modificadas
```text
Supabase DB (Schema Alterado via Migration)
  └─> patio_os (unique constraint)
  └─> receivables (coluna os_number, unique constraint)

ImportReportDialog.tsx (Lógica Expandida)
  └─> Extrai Array de OS e Array de Recebíveis
  └─> Dispara nova Mutation 'useProcessImportedData'

useConciliacao.ts / usePatio.ts
  └─> 'useProcessImportedData' injeta tudo em batch no Supabase
```
