# Design: Correção de Inserção e Filtro de Competência (053)

## Arquitetura de Componentes Afetados

### 1. `CentralImportWizard.tsx`
- **Função Responsável:** `handleConfirm()`
- **Modificações Lógicas:**
  - O loop das OSs extraídas deixará de inserir todos os itens no vetor `txsToInsert`.
  - Será implementada uma verificação: `const osDate = os.closed_at || os.opened_at;` e então `if (osDate.startsWith(targetDate)) { txsToInsert.push(...) }`.
  - O loop da Maquininha fará o mesmo: `if (item.dateVenda === targetDate) { txsToInsert.push(...) }`.
  - Logo após construir as `transactions`, a função deve invocar novas queries via supabase para fazer o insert em lote do array original nas tabelas persistentes correspondentes:
    - `supabase.from('patio_os').insert(osInsertPayload)`
    - `supabase.from('receivables').insert(receivablesPayload)`

### 2. Tratamento de Datas (`useOsImportProcessor.ts` e `useImportProcessor.ts`)
- Precisamos confirmar que `closed_at` ou `dateVenda` seguem o mesmo formato que o `targetDate` (YYYY-MM-DD). Como `targetDate` é um ISO date part (ex: `2026-06-09`), as extrações nas planilhas, se divergentes (ex: `09/06/2026`), precisarão de conversão antes da comparação.
  - A Maquininha usa `item.dateVenda` ou `item.dateCredito`. `item.dateVenda` deve ser convertido para `YYYY-MM-DD` antes da checagem.
  - A OS extrai via `parseExcelDate` que já retorna `YYYY-MM-DD`.

## Contratos de Dados (API Limits)
- **Tabela `patio_os` (Insert Múltiplo):**
  - Os atributos necessários são: `store_id, os_number, plate, opened_at, closed_at, total_value, paid_value, payment_method, status, days_open, source`.
  - Adicionaremos esses registros em uma chamada `upsert` baseada em `store_id` e `os_number` (se viável) ou simples `insert`.
- **Tabela `receivables` (Insert Múltiplo):**
  - Atributos necessários: `store_id, type, amount, date, due_date, status`.

## Testabilidade (SCAN -> INFER -> VERIFY -> FIX)
- **Cenário 1:** Subir a planilha com uma OS do dia 08 e outra do dia 09. Setar a targetDate para 09.
  - Verificar: Apenas a OS do dia 09 entra no "Apurado Sistema (Fechamento do Dia)".
- **Cenário 2:** Validar a tabela "Carros no Pátio".
  - Verificar: Ambas as OSs (dia 08 e 09) devem aparecer na listagem do Pátio (se aplicável ao filtro selecionado na UI do Pátio).
