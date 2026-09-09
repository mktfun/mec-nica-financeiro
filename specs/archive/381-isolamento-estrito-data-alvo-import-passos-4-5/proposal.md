# Proposal: Isolamento Estrito de Data Alvo nos Passos 4 e 5 da Importação (Spec 381)

## Problema
No fluxo da Central de Importações (`CentralImportWizard`), os operadores relatam que no **Passo 4** (*Vínculo de Pagamentos sem Lançamento na OS — `Step1UnregisteredPayments.tsx`*) e no **Passo 5** (*Classificação de Débitos e Não-Faturamento — `Step2NonRevenueJustifications.tsx`*) continuam sendo exibidos valores e transações antigas de dias anteriores (como transações de 04/09 e 08/09).
Esses valores repetidos não correspondem à realidade contábil do dia atual (09/09), não batem com o caixa nem com os relatórios das lojas, poluem a visão do operador e geram divergências fictícias.

## Causa-Raiz Técnica Diagnosticada
1. **Ausência de Filtro por Data Alvo no Motor em Memória (`autoMatchingEngine.ts`):**
   Ao iterar sobre `redeResults.transactions` e `ofxResults.transactions`, o motor processa arquivos que contêm extratos de múltiplos dias (ex: últimos 3 ou 7 dias) sem checar se `tx.date === targetDate`. Qualquer transação não casada desses dias passados é empurrada para o array `unmatchedTransactions`.
2. **Ausência de Filtro por Data Alvo no Motor de Despesas (`expenseMatcher.ts`):**
   Ao agrupar débitos bancários em `allDebits`, o motor não filtra por `targetDate`, gerando falsas `orphanOutflows` de datas anteriores para o Passo 5.
3. **Sobrescrita Forçada de Data na Gravação (`CentralImportWizard.tsx`):**
   Na montagem de `txsToInsert` (linhas 1220 e 1296), o código força `target_date: targetDate` para **todas** as transações contidas no arquivo OFX/Rede (`const realTxDate = targetDate`), carimbando transações que ocorreram em 04/09 ou 08/09 com o `target_date` do dia atual. Isso contamina a base no Supabase.
4. **Falta de Blindagem Defensiva na UI (`Step1UnregisteredPayments.tsx` e `Step2NonRevenueJustifications.tsx`):**
   As tabelas dos Passos 4 e 5 não validam estritamente se `tx.date === targetDate` antes de exibir cada linha.

---

## Solução Proposta (Foco em Reuso, Filtragem Estrita e Saneamento)

1. **Blindagem no Motor de Auto-Match (`autoMatchingEngine.ts`):**
   - Inserir validação de data: processar apenas transações cuja data de competência/ocorrência seja igual à `targetDate`.
   - Transações de datas diferentes presentes no mesmo arquivo OFX/Rede são ignoradas na geração de pendências do dia.

2. **Blindagem no Motor de Despesas (`expenseMatcher.ts`):**
   - Filtrar `allDebits` e `allBills` garantindo que apenas movimentações da data alvo sejam confrontadas para saídas órfãs do Passo 5.

3. **Preservação de Datas Reais na Ingestão (`CentralImportWizard.tsx`):**
   - Ao montar `txsToInsert`, atribuir `target_date: tx.date || targetDate`, garantindo que transações com data diferente preservem sua data original de ocorrência no banco.
   - Em `fetchRealUnmatchedTransactions`, aplicar filtro defensivo duplo no banco (`target_date.eq.${tDate}` e descarte de datas divergentes).

4. **Barreira Defensiva nos Componentes de Interface:**
   - `Step1UnregisteredPayments.tsx` (Passo 4): Exibir exclusivamente transações com `tx.date === targetDate`.
   - `Step2NonRevenueJustifications.tsx` (Passo 5): Exibir exclusivamente lançamentos onde `entry.date === targetDate` ou `occurred_at` da data alvo.

5. **Migration de Saneamento de Dados (`supabase/migrations/`):**
   - Atualizar em lote registros em `ofx_transactions` e `pos_transactions` cujo `target_date` foi sobrescrito incorretamente, realinhando com a data real de `occurred_at`.

---

## Investigação e Análise de Reuso
- **Tabelas / RPCs Existentes:** Reutilização direta das tabelas `ofx_transactions` e `pos_transactions`, e da RPC `get_daily_reconciliation_summary`. Nenhuma tabela nova será criada.
- **Componentes Existentes:** Reutilização de `CentralImportWizard.tsx`, `Step1UnregisteredPayments.tsx` e `Step2NonRevenueJustifications.tsx`, apenas adicionando os guardrails de data.
- **Motores Existentes:** `autoMatchingEngine.ts` e `expenseMatcher.ts` já possuem toda a lógica combinatória e de normalização; receberão apenas o parâmetro e filtro de data.

---

## Contratos de Dados & SQL (Supabase)
- Não há novas colunas necessárias.
- Migration de Saneamento `20260909000040_sanitize_transactions_target_date.sql`:
  ```sql
  UPDATE public.ofx_transactions
  SET target_date = occurred_at::date::text
  WHERE target_date != occurred_at::date::text
    AND target_date IS NOT NULL
    AND occurred_at IS NOT NULL;
  ```

---

## Arquivos Afetados

### [Arquivos Existentes Modificados [MODIFY]]
- `src/lib/matchers/autoMatchingEngine.ts`: Filtro estrito de data alvo em transações de Rede e OFX.
- `src/lib/expenseMatcher.ts`: Filtro estrito de data alvo em débitos OFX e contas a pagar.
- `src/components/importacoes/CentralImportWizard.tsx`: Preservação da data original na montagem de `txsToInsert` e filtro estrito em `fetchRealUnmatchedTransactions`.
- `src/components/importacoes/wizard/Step1UnregisteredPayments.tsx`: Filtro defensivo na listagem do Passo 4.
- `src/components/importacoes/wizard/Step2NonRevenueJustifications.tsx`: Filtro defensivo na listagem do Passo 5.

### [Arquivos Novos [NEW]]
- `supabase/migrations/20260909000040_sanitize_transactions_target_date.sql`: Saneamento de `target_date` histórico desalinhado.

---

## Risco Principal e Mitigação
- **Risco:** Ocultar vendas de cartão de crédito/débito que ocorreram no fim de semana ou feriado e cuja compensação bancária líquida ocorre em D+1 ou D+2.
- **Mitigação:** Para transações de cartão da adquirente Rede, o filtro de data respeita o campo `data_venda` da transação para casamento com a OS do dia, e a liquidação em D+1 no extrato bancário é tratada via `ofx_maquininhas` conforme a regra de ouro de cartões.

---

## Plano de Rollback
- Reversão simples dos commits nos arquivos de frontend e motor (`git checkout`).
- A migration de saneamento não é destrutiva (apenas realinha datas com os timestamps reais já gravados).
