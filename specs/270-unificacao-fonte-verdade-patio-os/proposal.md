# Proposal: Unificação da Fonte da Verdade do Pátio (NA LOJA OS) e Eliminação da Divergência (Spec 270)

## Problema
Existe uma divergência grotesca entre os valores de Ordens de Serviço no Pátio apresentados na interface:
1. **Card Principal da Conciliação (`ResumoDiaPanel.tsx`):** Exibe **R$ 86.217,06** (lendo de `summary.na_loja_os`, que pegava valores congelados da tabela `reconciliations` ou snapshot desatualizado).
2. **Modal "Ver OSs >" (`PatioOsDetailModal.tsx`):** Exibe **R$ 91.993,66** (34 OSs ativas somando R$ 91.993,66 calculadas em tempo real da tabela física `patio_os`).
3. **Causa Raiz:** A tabela `patio_os` é a tabela viva onde as OSs são importadas e editadas manualmente (ex: no `MissingPatioOsEditor` ou no próprio modal de detalhes). Porém, a RPC `get_daily_reconciliation_summary` e a tabela `daily_snapshots` mantinham valores estáticos antigos de importações parciais anteriores (`86.217,06` e `88.212,39`), sem sincronização reativa com a tabela `patio_os`.

## Solução Proposta
1. **Fonte Única da Verdade (`patio_os`):**
   * Tanto o Card `NA LOJA OS`, quanto a RPC `get_daily_reconciliation_summary`, quanto o Modal `PatioOsDetailModal.tsx`, quanto o Step 3 de importação devem derivar o total de pátio **estritamente da mesma regra matemática viva sobre `patio_os`**:
     $$\text{Saldo OS} = \text{total\_value} - \text{paid\_value}$$
     $$\text{Condição Ativa} = \text{status NOT IN ('finalizada', 'paga', 'cancelada')} \land \text{Saldo} > 0 \land \text{opened\_at} \le \text{data alvo}$$
2. **Sincronização em Cascata nas Mutações:**
   * Quando o operador editar qualquer OS (seja no `MissingPatioOsEditor` da importação ou no `PatioOsDetailModal`), disparar a atualização de `patio_os` e a imediata sincronização de `daily_snapshots.total_patio` e `reconciliations.na_loja_os` para a data da conciliação.
3. **Atualização da RPC `get_daily_reconciliation_summary`:**
   * Calcular `v_na_loja_os` diretamente do somatório de `patio_os` da data, e calcular `na_loja_os` de cada filial em `stores` com base na soma real das OSs ativas de cada `store_id` em `patio_os`.

## Contratos de Dados
- **Tabela `patio_os`:** Campos `id, os_number, store_id, total_value, paid_value, status, opened_at, closed_at`.
- **Tabela `daily_snapshots`:** Campo `total_patio` atualizado reativamente com o somatório de `patio_os`.
- **Tabela `reconciliations`:** Campo `na_loja_os` por loja atualizado reativamente com o somatório de `patio_os` da respectiva filial.

## Features Existentes Impactadas
- `src/components/conciliacao/ResumoDiaPanel.tsx` (Card "NA LOJA OS")
- `src/components/conciliacao/PatioOsDetailModal.tsx` (Modal de listagem e edição de OSs)
- `src/components/importacoes/CentralImportWizard.tsx` (Step 3 e gravação final)
- `supabase/migrations/` (RPC `get_daily_reconciliation_summary`)

## Risco Principal
- Alterar o valor de `na_loja_os` no fechamento recalcula o `Caixa Atual` e o `Fluxo de Caixa`. Devemos garantir que os dados de OSs em pátio sejam os verdadeiros do dia para que o saldo patrimonial reflita a realidade contábil exata.
