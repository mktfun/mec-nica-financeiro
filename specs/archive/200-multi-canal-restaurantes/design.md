# Design 200 - Schema e Views SQL

## 1. Supabase Migrations (Nova Arquitetura)
Será criada uma migration pesada `20260817000000_restaurant_multi_channel.sql`:

- `canais`: Tabela catálogo (`id`, `nome`, `tipo`).
- `config_canal_restaurante`: Relacionamento loja <-> canal com colunas `comissao_percentual`, `taxa_pagamento_online`, `mensalidade_fixa`.
- `faturamento_diario`: A injeção de dados de produção (`restaurante_id`, `canal_id`, `data`, `faturamento_bruto`, `quantidade_pedidos`).
- `custos_fixos_mensais`: Adaptação/criação da tabela com o enum `aplica_a` (`geral`, `salao`, `delivery`).

## 2. O Motor de Rateio (View SQL)
A inteligência do rateio deve morar no banco para ser universal.
A view `vw_custo_unitario_por_canal` executará:
1. Um `CTE` somando os pedidos dos últimos 90 dias por canal (Salão vs Delivery).
2. Cálculo de proporção (`%_salao = pedidos_salao / pedidos_totais`).
3. Somatório dos Custos Fixos do Mês vigente.
4. Aplicação do rateio (`CF_Geral * %_salao + CF_Salao`).
5. Divisão final: `Custo_Unitario_Salao = CF_Total_Salao / Media_Mensal_Pedidos_Salao`.

## 3. UI (Telas)
**Para o WebApp (Frontend):**
1. **Configuração de Canais:** Tela para a loja definir suas comissões por app.
2. **Lançamento de Faturamento:** Tela (tipo planilha) para digitação diária de Faturamento e Qtd Pedidos por App.
3. **Engenharia de Preços (Financeiro):** A tabela 360º que criamos recentemente vai deixar de usar `storeVars.custo_fixo_mensal` estático e passará a usar o `CF_Unitário` dinâmico puxado da View do banco.
