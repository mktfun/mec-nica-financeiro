# Correção dos Cálculos de Conciliação Diária (Valor Contas e Fluxo de Caixa)

## Contexto e Problema
Na tela de Conciliação Diária, os usuários identificaram dois bugs graves de cálculo na consolidação final.

1. **Valor Contas (`valdeocntas`)**: O valor exibido na seção "Subtotal: Valor Contas" não está contemplando todas as saídas (`out`) provenientes de arquivos bancários globais (OFX) importados, resultando em um cálculo incompleto das contas a pagar. O frontend atualmente passa uma constante zero (`totalOfxOut={0}`) para o painel de resumo, o que oblitera esse montante no somatório.
2. **Fluxo de Caixa**: O valor impresso como Fluxo de Caixa deveria ser, matematicamente, a diferença entre o **Caixa Atual do dia** e o **Caixa Anterior** (última conciliação fechada). No entanto, quando não há um snapshot imediatamente anterior capturado no banco (ou por bug na RPC), a métrica assume o valor zero para "anterior" e, por consequência, exibe o exato mesmo valor do "Caixa Atual", causando espanto nos relatórios executivos. Além disso, a RPC `get_dashboard_metrics` possui uma lógica matemática divergente do frontend (faz Faturamento - Despesas, em vez de C.Atual - C.Anterior).

## Solução Proposta

Para garantir integridade visual e consistência na camada de dados, precisamos agir nas pontas:

1. **Camada Frontend (React)**:
   - Adicionar uma sub-query no hook `useBackendConciliacao` para resgatar a soma consolidada das transações de saída originadas do OFX (`source = 'ofx'`, `type = 'out'`).
   - Repassar esse valor real como `totalOfxOut` no `ResumoDiaPanel`, alimentando corretamente a fórmula de `Valor Contas = juros_rede + contas_a_pagar_ofx`.

2. **Camada Backend (Supabase RPC - get_dashboard_metrics)**:
   - Criar uma migration alterando a RPC `get_dashboard_metrics`.
   - Modificar o cálculo de `v_contas_a_pagar_ofx` para ler exclusivamente `source = 'ofx'`.
   - Atualizar a equação de `v_fluxo_caixa` para extrair, via subquery na tabela `daily_snapshots`, o `caixa_atual` mais recente (`date < p_date`), respeitando a fórmula `v_caixa_atual - v_caixa_anterior`.

Com essas medidas, estabelecemos uma única fonte de verdade matemática (The Single Source of Truth) para o fluxo de caixa na conciliação.
