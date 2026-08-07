# Proposal: Motor de ConciliaçÁo em Camadas com Subset-Sum Combinatório e Janela Temporal D-1 (conciliacao-layered-matching)

## Problema
Atualmente, o agrupamento de vendas da maquininha contra os depósitos do extrato OFX utiliza um algoritmo guloso (*greedy*) simplista: ele tenta acumular sequencialmente todas as vendas disponíveis da maquininha dentro do primeiro depósito OFX que encontrar.

Essa abordagem ingênua causa dois grandes problemas na prática (como observado na loja "Rei do Módulo"):
1. **Falsos Deltas por Agrupamento "Tudo-em-Um":** O sistema agrupa 3 vendas em 1 depósito criando uma divergência artificial, ignorando que dentro do conjunto havia 1 venda que batia perfeitamente 1:1 com um depósito (ex: R$ 590,52) e 2 vendas que somavam exatamente outro depósito (ex: R$ 2.447,39).
2. **Divergência Artificial por Falta de Contexto Temporal (Sobras D-1):** Depósitos OFX que caem no banco hoje (ex: segunda-feira) correspondem a vendas realizadas ontem ou no fim de semana (D-1 / D-2). Como a conciliaçÁo atual olha apenas a data estrita do lote (`target_date`), transações legítimas geram divergência por falta de histórico das vendas de ontem.

## SoluçÁo Proposta
Implementar um **Motor de ConciliaçÁo Multicamadas** baseado em camadas de prioridade e busca combinatória exata (*subset-sum matching*), acompanhado de suporte a janela temporal D-1 e isolamento de exceções reais.

### Motor de ConciliaçÁo em 4 Camadas:

1. **Camada 1 (Exato 1:1):**
   - Varre depósitos OFX e vendas de maquininha buscando correspondência exata de valor de 1 item para 1 item (`|rede.amount - ofx.amount| < 0.05`).
   - Pareia automaticamente com 100% de confiança e remove ambos do pool disponível.

2. **Camada 2 (Subset-Sum Combinatório N:1):**
   - Para depósitos OFX ainda nÁo pareados, executa um algoritmo de busca combinatória (*backtracking / subset-sum*) com limite de profundidade $N \le 6$.
   - Encontra combinações exatas de 2, 3 ou $N$ vendas da maquininha cuja soma corresponda precisamente ao valor do depósito OFX (`|sum(vendas) - ofx.amount| < 0.05`).
   - Pareia o grupo com 100% de confiança ($R\$ 0,00$ de divergência).

3. **Camada 3 (Janela Temporal Estendida D-1 / D-2):**
   - Para depósitos OFX ou vendas que permanecerem nÁo pareados no dia atual (`target_date`), estende a busca para transações nÁo conciliadas do dia anterior ($D-1$ / $D-2$) da mesma loja.
   - Resolve o problema de liquidações bancárias de fim de semana e primeira importaçÁo.

4. **Camada 4 (Casamento Exato OS Bruto vs Maquininha):**
   - Aplica a mesma regra de exact-match (valor bruto da OS == valor bruto da maquininha) na janela $D0/D-1$.
   - Se nÁo houver correspondência exata, nÁo força pareamento artificial; encaminha a OS / TransaçÁo para a aba de Alertas / Exceções.

### Tratamento de Exceções (Alertas por Loja):
- Transações que permanecerem sem correspondência matemática após as 4 camadas sÁo classificadas como **Exceções Reais**.
- SÁo expostas em uma visÁo clara de **Alertas & Divergências de Fechamento**, exibindo: Valor Esperado, Valor Encontrado, Delta Calculado e opçÁo de vinculaçÁo manual.

## Contratos de Dados
- NÁo há alterações destructivas nas tabelas do Supabase.
- A tabela `transactions` continuará registrando as transações importadas.
- As mutações em `conciliation_matches` continuarÁo armazenando os pares/grupos gerados.
- É adicionada uma busca de fallback em `transactions` para `target_date = date - 1 day` para a Camada 3.

## Features Existentes Impactadas
- `src/hooks/useConciliacao.ts` (`useReconciliationViews` / motor de matching)
- `src/components/conciliacao/RedeVsOfxTable.tsx` (Aba 2 - Maquininha x Banco)
- `src/components/conciliacao/OsVsRedeTable.tsx` (Aba 1 - OS x Maquininha)
- `src/components/conciliacao/PixVsOfxTable.tsx` (Aba 3 - PIX)
- `src/routes/conciliacao.$lojaId.tsx` (VisualizaçÁo das abas e painel de alertas de exceções)

## Risco Principal
Garantir a performance do algoritmo de *Subset-Sum* combinatório no frontend para que nÁo trave a renderizaçÁo em lojas com centenas de transações diárias.
*MitigaçÁo:* Limitar o backtracking a subconjuntos de $N \le 6$ itens por depósito e ordenar candidatos por proximidade de valor.
