# Proposal: CorreçÁo Lógica e Cronológica do Backend (109-fix-backend-math-and-dashboard)

## Problema
A migraçÁo 108 expôs bugs lógicos e estruturais graves durante a traduçÁo do TypeScript para SQL, gerando inconsistências no Dashboard e na ConciliaçÁo:
1. **Faturamento Banco vs Previsto**: O RPC trocou os conceitos. "Faturamento Banco" (Saldo Itaú) deve vir do `bank_total` do banco, nÁo da soma das transações OFX. "Previsto" é que deve ser a soma das transações (Entradas OFX).
2. **PIX Zerado**: O RPC tentou somar PIX procurando `%pix%` nas `transactions`, mas o sistema legado usa o campo `pix_os_expected` (que vinha da planilha) para conciliar.
3. **Na Loja OS (Pátio)**: A tabela `patio_os` nÁo possui versionamento histórico de valor aberto por dia; fazer um simples `SELECT SUM(total_value)` sem respeitar datas injeta o valor atual em *todos* os dias passados.
4. **Dashboard Quebrado**: O hook `useBackendDashboard` tenta buscar a data de hoje (`new Date()`) como padrÁo. Se os últimos dados importados foram do dia 04, a tela acorda num dia vazio (dia 06 ou 07) e quebra.

## SoluçÁo Proposta
1. **Refatorar as RPCs Postgres** (Substituir/Atualizar a Migration 20260807000000):
   - **Faturamento Banco**: Vai buscar o `bank_total` da tabela `reconciliations` (O Saldo Real do Itaú).
   - **Previsto OFX**: Vai puxar o real faturamento (entradas) via transactions OFX.
   - **PIX**: Vai extrair da coluna `pix_os_expected` via `reconciliations` ou `daily_snapshots`, em vez de buscar nas transactions cegas.
   - **Na Loja OS**: Usará a inteligência anterior: ou puxar da foto do `daily_snapshots`, ou ignorar o histórico corrompido do `patio_os`.
2. **Auto-Select de Data no Frontend**: Modificar os Hooks para que, caso a `date` seja vazia, eles executem uma query rápida para descobrir a *última data que tem dados importados* (Target Date), exatamente como o `useDashboardV2` fazia.

## Risco Principal
Garantir que a reescrita do SQL bata exatamente com a expectativa contábil do cliente sem recriar o código espaguete no frontend. Precisamos ser precisos na extraçÁo dos totais (Saldo Banco e PIX) para que os cards verdes voltem a acender.
