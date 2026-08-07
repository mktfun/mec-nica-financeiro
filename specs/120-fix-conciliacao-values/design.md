# Design: CorreçÁo de ConciliaçÁo e Juros (120)

## Arquitetura Técnica
1. **Frontend (`jurosRedeParser.ts`)**: Ao varrer a planilha de Juros, vamos buscar as colunas `['valor cobrado', 'valor juros', 'valor de juros']`. O valor extraído permanecerá positivo matematicamente no DB (já que é uma despesa e o painel trata as despesas de forma absoluta e subtrai na matemática do lucro).
2. **Backend (`get_dashboard_metrics`)**: O cálculo de `Fluxo de Caixa` vai ler a tabela correta `daily_snapshots`, calculando a diferença entre o `caixa_atual` de hoje e o `caixa_atual` do registro de dia anterior.
3. **Frontend (`ResumoDiaPanel.tsx` e `Modulo1SaldoPanel.tsx`)**: O painel já faz inject de `Dinheiro MP` se o usuário preencheu o state global no wizard. Mas a leitura inicial do DB deve garantir que se vier de `currentSnapshot.dinheiro_mp` ou `currentSnapshot.a_receber_manual`, eles nÁo sejam ignorados (eles podem estar vindo 0 porque o save via Wizard passou 0 ou a variável nÁo atualizou no form).

## Cenários de VerificaçÁo (SCAN → INFER → VERIFY → FIX)
- **Cenário 1 (Juros)**: Coluna chama "Valor de Juros". O Parser lê, soma todas as linhas e grava o valor global (ex: R$ 739,55) como Despesa/Juros positivo, refletindo no painel como Despesa.
- **Cenário 2 (Fluxo Caixa)**: Caixa Anterior (em `daily_snapshots` de ontem) = 10k. Caixa Atual = 15k. RPC deve retornar Fluxo Caixa = 5k.
- **Cenário 3 (Dinheiro MP)**: Se salvo R$ 500 no Wizard na importaçÁo, ele grava `dinheiro_mp = 500` na tabela `daily_snapshots` para a data alvo. O Refresh do Dashboard precisa espelhar exatos R$ 500.
