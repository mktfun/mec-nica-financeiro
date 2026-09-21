# Etapa 9 — A diferença de 18 mil vem do fechamento do dia 18 (herança, não erro de hoje)

## O que a verificação no banco mostrou

1. **O fechamento do dia 18 foi regravado hoje.** O registro do dia 18 foi criado hoje às 13:07 e diz que o faturamento do dia foi R$ 31.200,97, com diferença de R$ 34.421,30.
2. **Quando o mesmo dia 18 é recalculado agora com os dados que estão no banco, os números são outros:** faturamento R$ 48.367,16 e diferença R$ 1.650,86. Ou seja, o número congelado do dia 18 não corresponde mais aos dados reais do próprio dia 18.
3. **O dia 21 herda o caixa final do dia 18.** O cálculo de hoje começa com "caixa anterior = R$ 201.948,92", que é exatamente o caixa final do registro errado do dia 18. Com essa base, o "disponível para contas" de hoje fica **negativo em R$ 18.250,82** — é daí que sai a diferença de ~18 mil que aparece nos dois dias.
4. **Hoje ainda existem saídas sem par (órfãs)** em três lojas: Jorge Beretta R$ 1.041,33, Jabaquara/loja 04 R$ 1.583,89 e Santo André R$ 961,71. No dia 18 existe uma saída órfã de R$ 9.000,00 em uma das lojas. Isso explica as divergências pequenas que sobram depois da correção da herança.
5. **Os lançamentos bancários estão corretos e sem duplicidade** entre os dois dias (nenhum lançamento repetido). O problema não é dado duplicado; é o fechamento congelado do dia anterior.

Resumo: o sistema não errou o cálculo de hoje. Ele está somando corretamente sobre um ponto de partida errado, gravado quando o dia 18 foi refeito.

## Como corrigir sem quebrar nada

**9.1 — Recuperar o dia 18 antes de tocar no dia de hoje**
- Guardar uma cópia auditável do fechamento atual do dia 18 (nada é apagado).
- Recalcular o dia 18 com os dados que hoje estão no banco, rodando os pareamentos na ordem certa: saídas x contas, entradas x OS/recebíveis, maquininha x banco.
- Resolver a saída órfã de R$ 9.000,00 do dia 18: ou casa com uma conta existente, ou fica registrada com justificativa. Sem isso o dia 18 não pode fechar como "conforme".
- Regravar o fechamento do dia 18 apenas quando a diferença voltar ao patamar real (centavos/ordem de R$ 150, como foi no dia).

**9.2 — Refazer o dia 21 já com o caixa anterior certo**
- Recalcular hoje puxando o caixa anterior do dia 18 corrigido.
- Rodar novamente os pareamentos de hoje e recalcular loja por loja e o total global.
- Resolver as três saídas órfãs de hoje (R$ 1.041,33 / R$ 1.583,89 / R$ 961,71) antes do fechamento definitivo.

**9.3 — Impedir que isso volte a acontecer**
- **Encadeamento validado:** um dia só pode fechar se o caixa anterior vier de um dia fechado e conforme. Se o dia anterior for reaberto ou regravado, todos os dias seguintes são marcados automaticamente como "precisa recalcular", em vez de continuar exibindo número velho.
- **Reabrir é explícito:** regravar um fechamento antigo exige ação declarada, registra quem fez, o antes e o depois, e dispara o recálculo em cascata.
- **Fechamento só depois do pareamento:** o dia não pode ser gravado como fechado antes de todos os pareamentos rodarem e das contagens serem conferidas.
- **Órfãs bloqueiam o "conforme":** qualquer saída ou entrada sem par impede o selo de aprovado; o dia fica como "fechado com pendências listadas".
- **Um único cálculo:** as telas passam a ler o mesmo cálculo do servidor, sem recalcular nada no navegador, para não existirem dois números para o mesmo dia.

## Como saberemos que ficou certo

- Dia 18 fechado com diferença na ordem de centavos/R$ 150, com a saída de R$ 9.000,00 resolvida ou justificada.
- Dia 21 com caixa anterior igual ao caixa final corrigido do dia 18, e a diferença de R$ 18.250,82 desaparecendo do cálculo.
- Soma das 10 lojas igual ao total global nos dois dias.
- Reabrir o dia 18 de novo marca o dia 21 como "precisa recalcular", sem mostrar valor antigo como se fosse válido.
- Rodar o recálculo duas vezes seguidas dá o mesmo resultado (nada duplica).

## Detalhes técnicos

- Congelamento: dias com `is_closed = true` são servidos pelo ramal estático de `get_daily_reconciliation_summary`; o ramal dinâmico do mesmo dia 18 devolve faturamento R$ 48.367,16 e `diferenca_final` R$ 1.650,86 contra os R$ 31.200,97 / R$ 34.421,30 gravados em `daily_snapshots`.
- Herança: no dia 21, `caixa_anterior = 201948.92` (igual a `daily_snapshots.caixa_atual` de 18/09) e `valor_disp_contas = -18250.82`.
- Correção: reprocessamento transacional (snapshot anterior preservado em auditoria), `fechar_dia` validando a cadeia de datas, e invalidação em cascata dos snapshots posteriores quando um dia é regravado.
- Órfãs vêm de `saidas_orfas` / `entradas_orfas` por loja na RPC; passam a ser critério de bloqueio do status `approved`.
