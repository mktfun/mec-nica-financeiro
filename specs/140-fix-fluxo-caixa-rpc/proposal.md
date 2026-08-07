# Proposal: Consertar Motor do Dashboard Global (140-fix-fluxo-caixa-rpc)

## Problema
O usuário relatou dois problemas graves no painel de Conciliação Global:
1. **Fluxo de Caixa quebrado (Mesmo valor do Caixa Atual):** O usuário possui dados importados de dias anteriores, mas o `Fluxo de Caixa` usa a diferença `Caixa de Hoje - Caixa de Ontem`. O "Caixa de Ontem" estava sendo puxado de uma tabela de cache (`dashboard_daily_logs`) que só é preenchida se o usuário efetivamente "abrir" o painel no dia anterior. Como os dados foram importados em massa, o cache de ontem estava vazio (0), quebrando a matemática.
2. **Contas a Pagar / Saídas OFX não somam:** As saídas do OFX (Despesas) não estão somando nas "Contas" globais. Isso ocorre porque o RPC atual faz um `LOOP` em cada Loja e soma apenas as transações que pertencem a uma loja específica. Como o Extrato OFX é importado de forma **Global** (`store_id IS NULL`), ele é totalmente ignorado no cálculo global.

## Solução Proposta
Reescrever o RPC `get_dashboard_metrics` no banco de dados com as seguintes correções matemáticas:
1. **Desacoplar Totais Globais das Lojas:** As variáveis macro do painel (`Faturamento Atual`, `Contas a Pagar (OFX Out)`, `Saldo Bancário Total`) não devem ser a soma das lojas. Elas devem ser calculadas com um `SELECT SUM(...)` direto na tabela para abranger as transações Globais (`store_id IS NULL`) automaticamente. O loop de lojas servirá **apenas** para popular o card de cada loja individual.
2. **Fluxo de Caixa Real-Time:** Em vez de depender do cache da tabela `dashboard_daily_logs` de ontem (que pode estar vazio), calcular o `Caixa de Ontem` matematicamente e em tempo real (buscando o saldo, dinheiro MP e pendências do dia -1).
3. **Consolidação das Despesas:** Garantir que o valor exibido como `Contas a Pagar` seja a soma absoluta de todo `type = 'out'` + `contas_a_pagar manuais`. E subtrair isso (mais os juros de maquininha) do total na rubrica de diferença.

## Contratos de Dados
- **RPC:** `get_dashboard_metrics(p_date date)`
- **Tabelas Lidas:** `transactions` (View), `daily_snapshots`, `patio_os`, `reconciliations`
- **Output:** O mesmo JSONB atual, mas com valores matematicamente corretos e seguros contra saltos de dias.
