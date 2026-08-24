# Proposal: Motor Dinâmico de Fechamento por Filiais, Deduplicação Automática e Resolução de RPC (280)

## Problema
1. **Erro de Sobrecarga PostgREST (PGRST203):** O backend possui duas assinaturas conflitantes (`get_daily_reconciliation_summary(date)` e `get_daily_reconciliation_summary(text)`), impedindo o frontend de carregar os dados consolidados.
2. **Dependência de Lançamentos Manuais:** O motor precisa ser 100% autônomo e dinâmico na RPC para qualquer dia:
   - Se o usuário lançar contas em `daily_manual_bills` (ex: Pró-labore Daniel R$ 10.070,00), a RPC deve somar dinamicamente no total de contas.
   - Se o usuário lançar ajustes em `daily_revenue_adjustments` (ex: Sucata), a RPC deve somar dinamicamente no faturamento.
   - O cálculo de juros/taxas da Rede deve ser apurado dinamicamente das taxas reais de `pos_transactions` (`COALESCE(SUM(fee_amount), snapshot.juros_rede)`).
   - O dinheiro no cofre deve ser apurado dinamicamente de `store_cash_vault` com `status IN ('em_transito', 'pending')`.
3. **Duplicação de POS na Re-importação:** A importação da Rede permitia duplicação de transações idênticas na mesma loja e data. A RPC e as queries devem deduplicar por transação para garantir que o saldo de maquininha bata com o banco automaticamente.
4. **Alinhamento do Pátio de OSs:** Atualizar o pátio de OSs pendentes de 24/08 com as 28 OSs em aberto para deixar a base 100% pronta para as conciliações futuras do usuário.

## Solução Proposta
1. **[BACKEND] RPC Canônica e Unificada `get_daily_reconciliation_summary(p_date text)`:**
   - Dropar todas as sobrecargas antigas (`DROP FUNCTION IF EXISTS get_daily_reconciliation_summary(date); DROP FUNCTION IF EXISTS get_daily_reconciliation_summary(text);`).
   - Criar uma única assinatura `public.get_daily_reconciliation_summary(p_date text)` que:
     - Aceita string de data (compatível com chamadas JS/Supabase sem ambiguidade).
     - Soma dinamicamente `daily_manual_bills` para a data informada.
     - Soma dinamicamente `daily_revenue_adjustments` para a data informada.
     - Calcula juros/taxas da Rede a partir de `pos_transactions.fee_amount` ou `snapshot.juros_rede`.
     - Soma `store_cash_vault` pendente/em trânsito.
     - Retorna tanto `stores` quanto `stores_detail` com os objetos de cada filial contendo `saldo_banco`, `dinheiro_loja`, `maquininha`, `pix`, `na_loja_os`, `previsto_ofx`, `diferenca` e `status`.
2. **[DATABASE] Deduplicação Nativa de POS:**
   - Garantir que a agregação de `pos_transactions` agrupe e deduplique registros idênticos por `(store_id, target_date, gross_amount, net_amount)` para que re-importações não inflem o valor de maquininhas.
3. **[DATABASE] Sincronização Única de `patio_os` para 24/08:**
   - Ajustar as 28 OSs em aberto do dia 24/08 com seus valores reais, deixando o histórico preparado para os próximos dias.

## Contratos de Dados
- **Função Supabase:** `public.get_daily_reconciliation_summary(p_date text) RETURNS jsonb`
- **Tabelas Consumidas Dinamicamente:**
  - `reconciliations` (saldos bancários das 10 filiais)
  - `store_cash_vault` (dinheiro pendente em trânsito)
  - `pos_transactions` (vendas e taxas da Rede)
  - `ofx_transactions` (entradas e saídas bancárias)
  - `patio_os` (OSs em andamento no pátio)
  - `daily_manual_bills` (todas as contas a pagar lançadas pelo usuário)
  - `daily_revenue_adjustments` (todos os ajustes de receita lançados pelo usuário)

## Features Existentes Impactadas
- `/conciliacao` (Painel consolidado, Resumo do Dia, Fechamento por Filial e Modal Saldo Bancos)
- `/importacoes` (Re-importações de arquivos sem efeito colateral de duplicação)

## Risco Principal
- Regressão na visualização de filiais se os campos do frontend divergirem da RPC.
- **Mitigação:** Suportar múltiplos aliases no objeto de cada loja retornado pela RPC (`saldo_banco`, `saldo_banco_ofx`, `bank_balance`, `dinheiro_loja`, `cash_vault`, `maquininha`, `rede_ofx`, `pix`, `pix_os_ofx`, `na_loja_os`, `patio_os`).
