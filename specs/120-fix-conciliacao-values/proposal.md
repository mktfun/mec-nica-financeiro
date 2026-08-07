# Proposal: Correção de Conciliação e Juros (120)

## Problema
O usuário relatou 5 bugs críticos na tela de Conciliação Diária após a migração estrutural:
1. **Dinheiro MP e A Receber** estão zerados (`R$ 0,00`) apesar de preenchidos no modal de importação.
2. O **Fluxo de Caixa** está quebrado na Dashboard (batendo o mesmo valor do Caixa Atual) pois a RPC anterior tentava puxar dados de uma tabela inexistente (`dashboard_daily_logs`) ao invés de `daily_snapshots`.
3. O **Valor de Juros** não está sendo somado corretamente no Parse da planilha da Rede, pois a planilha utiliza o cabeçalho "Valor de Juros" e não "Valor Cobrado" (e o valor está vindo positivo quando deveria abater/negativar o repasse real).
4. O bloco de **Despesas / Juros** no frontend está puxando a soma crua sem respeitar o estado do Snapshot.
5. As tabelas da RPC `get_dashboard_metrics` estavam corretas estruturalmente, mas liam de tabelas isoladas.

## Solução Proposta
1. **Backend (RPC)**: Substituir qualquer menção a `dashboard_daily_logs` por `daily_snapshots` na função `get_dashboard_metrics`, permitindo que o Caixa Anterior (e logo, o Fluxo de Caixa) volte a funcionar.
2. **Frontend (Parser de Juros)**: Alterar `jurosRedeParser.ts` para buscar pela coluna `"valor de juros"` ou `"valor juros"` além das existentes. Converter o valor extraído para ser salvo como dedução matemática (se aplicável) ou ser somado corretamente.
3. **Frontend (ResumoDiaPanel)**: Garantir que `Dinheiro MP` e `A Receber` venham primariamente de `currentSnapshot.dinheiro_mp` e `currentSnapshot.a_receber_manual` se existirem, e repassar isso pros blocos de UI.
4. **Wizard de Importação**: Garantir que as variáveis do input global (`manualDinheiroMp` e `manualAReceber`) sejam enviadas diretamente para o save do `daily_snapshots`.

## Contratos de Dados
- Não há tabelas novas.
- RPC `get_dashboard_metrics` será reescrita via arquivo `20260807000010_fix_dashboard_rpc.sql`.

## Risco Principal
Garantir que a coluna "Valor de Juros" não duplique a leitura com outras colunas semelhantes da mesma planilha, e garantir que a UI mostre o sinal matemático correto (Juros costuma ser somado como uma tarifa, logo ele aumenta as Despesas mas diminui o Saldo).
