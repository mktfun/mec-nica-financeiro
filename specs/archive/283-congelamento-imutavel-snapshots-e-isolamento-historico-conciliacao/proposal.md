# Proposal: 283 — Congelamento Imutável de Snapshots Fechados e Isolamento Histórico da Conciliação

## Problema
O sistema possui uma falha arquitetural contábil crítica de **acoplamento temporal reverso**:
1. **Mutabilidade Retrô do Pátio de OSs:** A tabela `patio_os` armazena apenas o estado escalar atual (`paid_value`, `status`). Quando uma OS aberta no dia 18/08 (com R$ 1.000 a pagar) é quitada no dia 24/08, o `paid_value` é atualizado para R$ 1.000 no registro único da OS. Ao recalcular dinamicamente o fechamento do dia 18/08 ou 19/08 via RPC, a query filtra `paid_value = 1000` e **remove a OS retroativamente do pátio histórico** (o pátio do dia 18/08 caiu de R$ 115.988,47 para R$ 47.184,97).
2. **Efeito Dominó no Caixa Anterior:** A equação contábil do dia de hoje ($D$) consome o `caixa_atual` de ontem ($D-1$) como `caixa_anterior`. Se os dias históricos forem recalculados dinamicamente com base no estado mutable de hoje, o caixa de ontem desmorona (ex: 21/08 caiu de R$ 150.600,29 para R$ 106.651,14), o que desloca o fluxo de caixa de hoje em mais de R$ 43.000,00 e **destrói a conciliação de hoje**.
3. **Violação do Princípio Contábil de Fechamento (Period Close Immutability):** Uma vez que um dia contábil é aprovado/fechado, seus pilares patrimoniais ($P_1, P_2, P_3, P_4, C_{\text{atual}}, \Delta$) devem ser **imutavelmente congelados** no banco de dados (`daily_snapshots` e `reconciliations`), tornando-se blindados contra qualquer alteração futura em tabelas operacionais.

## Solução Proposta

1. **Princípio do Fechamento Imutável (Closed Day Immutability):**
   - Para qualquer data $D$ que possua um fechamento consolidado (`daily_snapshots.is_closed = true` ou snapshot histórico homologado), a RPC `get_daily_reconciliation_summary` e os hooks consomem os **valores imutáveis congelados** do snapshot (`saldo_bancario`, `total_patio`, `dinheiro_lojas`, `cartoes_a_compensar`, `caixa_atual`, `faturamento`, `contas_a_pagar`).
   - O recálculo dinâmico baseado em tabelas operacionais brutas (`patio_os`, `ofx_transactions`, `store_cash_vault`) ocorre **estritamente para o dia de trabalho ativo (Hoje / Draft)** ou quando o usuário explicitamente clica em "Reabrir Conciliação".

2. **Restauração e Blindagem dos Snapshots Históricos Oficiais (17/08 a 24/08):**
   - Assegurar que os registros de `daily_snapshots` dos dias 18/08, 19/08, 21/08 e 24/08 estejam com seus valores canônicos oficiais gravados e protegidos contra sobrescrita acidental.
   - Adicionar flag `is_closed BOOLEAN DEFAULT false` e `closed_at TIMESTAMPTZ` na tabela `daily_snapshots`.

3. **Isolamento de Alterações de OS por Linha do Tempo:**
   - Pagamentos e baixas de OS efetuadas hoje são lançamentos de **HOJE** ($D$), alterando o saldo bancário/caixa de **HOJE**, e não podem reescrever o pátio de dias passados já consolidados.
   - O `caixa_anterior` do dia $D$ consome o `caixa_atual` imutável do snapshot do dia $D-1$, garantindo estabilidade matemática perpétua.

## Contratos de Dados

### Tabela `daily_snapshots`
- `is_closed`: `BOOLEAN NOT NULL DEFAULT false` (indica que o dia foi aprovado/homologado).
- `closed_at`: `TIMESTAMPTZ NULL` (momento exato do fechamento contábil).
- `metadata`: `JSONB` com congelamento de `total_saldo_banco`, `dinheiro_lojas`, `cartoes_a_compensar` e `stores_summary`.

### RPC `get_daily_reconciliation_summary(p_date text, p_force_dynamic boolean DEFAULT false)`
- Se `p_force_dynamic = false` e existir snapshot fechado para `p_date`, retorna os dados consolidados congelados de `daily_snapshots` e `reconciliations`.
- Se `p_force_dynamic = true` ou não houver snapshot fechado, executa a agregação dinâmica em tempo real para apuração do dia corrente.

## Features Existentes Impactadas
- **Todas as conciliações históricas (17/08 a 24/08):** Permanecem com status `approved` e divergência $\le \text{R\$} 50,00$ de forma permanente.
- **Conciliação do Dia Atual:** Ganha estabilidade absoluta, pois o `caixa_anterior` é uma constante imutável que nunca flutua com edições de OSs de dias anteriores.

## Risco Principal
- **Risco:** O usuário reimportar arquivos de uma data passada já fechada e esperar que os números mudem sem reabrir formalmente o dia.
- **Mitigação:** Adicionar botão explícito de "Reabrir / Recalcular Dia" na interface caso o gestor financeiro queira deliberadamente desarmar o congelamento de um dia anterior.
