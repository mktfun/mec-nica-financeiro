# Proposal: Rastreamento de Importações, Recebíveis Corretos e Dashboard Completo (008)

## Contexto e Problemas Identificados

Após análise do código atual e das telas enviadas, identifiquei **4 bugs/lacunas críticas**:

### Bug 1 — Recebíveis mostrando R$ 7,7 milhões (valor absurdo)
**Causa Raiz**: A tabela `receivables` acumula duplicatas toda vez que uma planilha é importada. O código atual faz um "soft idempotency check" por `type + date + value`, mas como os valores importados (ex: PIX R$ 90.000) sÁo os valores *antes* de dividir em parcelas, cada reimportaçÁo cria um registro novo porque a comparaçÁo falha por virgem flutuante. Resultado: 54 pendentes + 28 recebidos = 82 registros com valores repetidos somando 7,7M.

### Bug 2 — Saldo Líquido do Dashboard zerado
**Causa Raiz**: O `useDashboardSummary` busca `financial_total` da tabela `reconciliations` pelo **dia atual**. Como implementamos D-1 (dia anterior), os dados importados têm a data de `targetDate` (ontem). Mas o `getDefaultDate()` retorna ontem corretamente... **O problema real é que `financial_total` agora armazena apenas o "Dinheiro Físico"** (mudança que fizemos na spec 007), que pode ser zero ou muito pequeno. O Dashboard perdeu a visÁo do faturamento real.

### Bug 3 — Sem histórico de importações rastreável
NÁo existe tela ou mecanismo para ver: *"Quais planilhas foram importadas, por qual loja, em qual data, com qual total?"*. O usuário nÁo sabe se uma importaçÁo aconteceu, se foi duplicada, ou qual o status. A tabela `import_logs` nÁo existe.

### Bug 4 — Recebíveis: lógica de status incorreta
PIX tem vencimento = 0 dias → status 'recebido' automaticamente. Mas o campo `date` é a data da OS (pode ser de semanas atrás). O `totalRecebidoHoje` filtra por `created_at`, nÁo por `date`, gerando contagem errada.

---

## Requisitos e User Stories

- **US01**: Como Daniel, quero ver no Dashboard o **faturamento bruto real** (soma de todos os pagamentos das OSs finalizadas no dia), nÁo apenas o dinheiro físico.
- **US02**: Como analista, quero ver um **histórico de importações** — lista de quando cada planilha foi importada, para qual loja, com qual data de referência e totais.
- **US03**: Como analista, quero que os **Recebíveis** mostrem valores corretos (sem duplicatas, sem absurdos de milhões).
- **US04**: Como Daniel, quero poder clicar em uma importaçÁo do histórico e ver o **detalhe** das OSs e pagamentos daquele dia.

---

## O que JÁ EXISTE e será REUTILIZADO
- Hook `useImportProcessor.ts` — lógica de gravaçÁo
- Componente `ImportReportDialog.tsx` — UI de upload
- Tabela `reconciliations` — armazena os totais por dia/loja
- Tabela `receivables` — armazena recebíveis por loja
- Tabela `patio_os` — armazena as OSs
- Hook `useTransactions.ts` e `useDashboardSummary` — dados do dashboard
- Hook `useConciliacao.ts` — lógica de conciliaçÁo diária

---

## O que precisa ser CRIADO ou MODIFICADO

### Banco de Dados
1. **Nova tabela `import_logs`**: Registra cada importaçÁo com `id, store_id, store_name, target_date, total_os, total_paid_all, total_dinheiro, os_count, receivables_count, imported_by, created_at`.
2. **Limpar `receivables`** e **refazer a lógica de idempotência** — trocar para deduplicaçÁo por `(store_id, os_number, type)` para ser 100% seguro contra duplicatas.

### Hooks
3. **Novo `useImportLogs.ts`**: Query para buscar os logs de importaçÁo com filtros de loja e data.
4. **Atualizar `useImportProcessor.ts`**: Gravar na tabela `import_logs` após cada importaçÁo bem-sucedida. Passar `totalPaid` (faturamento total) junto com `totalDinheiro`.
5. **Atualizar `useDashboardSummary`**: `totalIn` = soma de `os_total` (faturamento bruto) da tabela `reconciliations`.
6. **Atualizar `useConciliacao.ts`**: Manter `totalIn` = `os_total` (já feito) mas garantir que `financial_total` da tela de conciliaçÁo seja o dinheiro físico para comparar com o caixa digitado.

### UI
7. **Nova rota `/historico-importacoes`** ou adaptar `/historico` existente: Mostrar lista de importações por data (da mais recente), com loja, data de referência, total faturado, total dinheiro, status e botÁo de detalhe.
8. **Adicionar link no Sidebar e no QuickActions** para o histórico de importações.
9. **Atualizar `recebiveis.tsx`**: Corrigir o campo `totalRecebidoHoje` — filtrar por `date` (data da OS) = hoje ao invés de `created_at`.

---

## Critérios de Aceite
1. O `totalIn` no Dashboard mostra o faturamento bruto real (ex: R$ 8.500 de uma OS importada).
2. Os Recebíveis nÁo somam mais duplicatas. Total máximo = soma dos valores únicos da planilha.
3. Ao importar uma planilha, um registro aparece imediatamente no Histórico de Importações com data, loja e totais.
4. O Histórico de Importações é acessível pelo menu lateral.
5. NÁo existe forma de importar a mesma planilha (mesma `store_id + target_date`) duas vezes sem sobrescrever.

---

## Open Questions

> [!IMPORTANT]
> **Antes de aplicar, confirme:**
> 1. O "Histórico de Importações" deve substituir o "Histórico de Transações" atual (`/historico`) ou ficar em uma **rota separada** (ex: `/importacoes`)?
> 2. Na tela de Recebíveis, o card "Recebidos Hoje" deve mostrar os **pagamentos com vencimento = hoje** que já foram liquidados, ou os **PIX e Débito** importados (que sÁo instantâneos)?  
> 3. Devo **limpar a tabela `receivables` novamente** antes de aplicar a nova lógica de deduplicaçÁo, para remover as duplicatas acumuladas?
