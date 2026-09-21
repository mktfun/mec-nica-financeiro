# Diagnóstico com provas + plano de execução: Importação x Conciliação

Investiguei o banco e o código. Não é "um bug": são 5 causas estruturais que se alimentam entre si. É por isso que consertar uma quebra outra.

## Prova 1 — O mesmo dia tem dois resultados oficiais ao mesmo tempo

Rodei o cálculo do dia 17/09 nas duas formas que o próprio sistema usa hoje:

```text
                     congelado(importação)   recalculado(ao vivo)
Valor disp. contas       R$ 31.262,69            R$ 6.584,19
Diferença final          R$   -850,22            R$ -25.528,72
```

Mesma data, mesma função, dois números. As telas escolhem lados diferentes: a Conciliação lê o congelado; o chat, o assistente e as revisões da importação leem o ao vivo.

## Prova 2 — A importação congela o fechamento ANTES de rodar o pareamento

No fluxo da Importação Central o dia é gravado como "fechado" com números calculados no navegador e só depois os motores de pareamento rodam no banco. O fechamento gravado nunca contém o resultado do pareamento.

## Prova 3 — Duas contabilidades paralelas e cálculo no navegador

Duas rotinas calculam o dia (`calculate_daily_conciliation` e `get_daily_reconciliation_summary`), cada tela chama uma. O critério de "aprovado" está escrito em 4 lugares com 3 tolerâncias (R$ 50, R$ 250 e a regra do banco), e o status volta como `divergent` enquanto telas comparam com `divergence` — comparação que nunca dá verdadeiro.

## Prova 4 — Gravações que não efetivam

A `transactions` que 20 arquivos ainda usam não é mais tabela: é uma visão que só aceita alteração, sem regra de inserção nem exclusão. A exclusão de lançamento na tela da loja opera sobre ela — parece acontecer e não persiste.

## Prova 5 — Vocabulário de status sem regra

Das 126 linhas de extrato, 60 estão com status de pareamento vazio. O campo aceita qualquer texto e o código escreve 10 variações, incluindo `MATCHED` numa tela e `matched` nas outras. Itens somem de uma tela e reaparecem em outra.

Agravante: 192 migrações, 66 delas reescrevendo a mesma função de cálculo, e 3 pares com número de versão repetido.

---

# Como eu faço a correção (ordem obrigatória, uma etapa por vez)

Regra que passa a valer em tudo abaixo: **nenhum número financeiro é calculado no navegador**. O frontend só pede, exibe e manda comandos.

## Etapa 1 — Uma única calculadora do dia

1. Escrever uma migração final que redefine `get_daily_reconciliation_summary` como a única fonte de verdade, devolvendo o dia completo em um só objeto: faturamento, contas, saldo, pátio, cofre, por loja, diferença e status.
2. Remover o modo duplo: o parâmetro que hoje alterna congelado/ao vivo sai da mão da tela. A regra passa a ser do banco — dia fechado devolve o congelado, dia aberto recalcula sempre.
3. Tolerância e status calculados **dentro** dessa função, num único lugar, com vocabulário fixo `approved` / `divergence`.
4. Aposentar `calculate_daily_conciliation` (a função deixa de ser chamada e é removida do código).
5. Verificação da etapa: rodar a função para 5 dias reais e conferir que os totais por loja somam o total global com diferença zero.

## Etapa 2 — Um único hook de leitura no frontend

1. Criar um hook único de resumo do dia (`useDailyReconciliationSummary`) como o **único** ponto que lê o dia. Ele apenas repassa o que o banco devolveu.
2. Apagar do frontend todos os enriquecimentos e recálculos que hoje acontecem depois da resposta (somas de maquininha, cofre, saldos, ajustes) — isso passa a vir pronto do banco.
3. Chave de cache única por data, e uma função única de "atualizar o dia" que todas as telas chamam depois de qualquer ação. Hoje há dezenas de listas de invalidação diferentes, cada uma esquecendo uma chave: some tudo isso.
4. Verificação: Importação, Conciliação, loja individual e chat mostram o mesmo número para o mesmo dia.

## Etapa 3 — Inverter a ordem do fechamento

1. Criar uma única rotina de backend `fechar_dia(data)` que executa, em transação e nesta ordem: ingestão → pareamentos → recálculo → gravação do fechamento → registro de auditoria.
2. O botão de fechar da importação passa a chamar só isso. O navegador para de montar o objeto de fechamento e para de gravar direto em `daily_snapshots`.
3. A rotina é idempotente: rodar duas vezes no mesmo dia dá o mesmo resultado.
4. Verificação: fechar um dia duas vezes seguidas e provar que os números não mudam.

## Etapa 4 — Padronizar status no banco

1. Definir a lista fechada de status de pareamento (ex.: `pending`, `matched`, `batch`, `intercompany`, `cancelled`, `ignored`).
2. Migração: preencher os 60 registros vazios, converter as grafias antigas (`MATCHED`, `matched_batch`, `nao_entrou`, `paid_cash`, etc.) para a lista nova e aplicar restrição de valores nas três tabelas.
3. Trocar no código todas as comparações soltas por um único conjunto de constantes compartilhadas.
4. Verificação: nenhuma linha fora da lista; nenhuma linha vazia.

## Etapa 5 — Fechar os caminhos de escrita quebrados

1. Apontar toda leitura e gravação para as tabelas reais (`ofx_transactions`, `pos_transactions`, `manual_transactions`).
2. Remover exclusão e inserção pela visão `transactions`; cada ação de escrita passa por uma rotina de backend nomeada, nunca por gravação direta espalhada em componente.
3. Verificação: excluir e recriar um lançamento na tela da loja e confirmar no banco que persistiu.

## Etapa 6 — Simplificar o fluxo (o "tantas opções e não sei o quê")

Hoje há caminhos concorrentes: Importação Central, Marco Zero, wizard manual, auditoria de passivo, agente autônomo, chat — todos podendo fechar o dia por conta própria. Passa a ser um caminho só:

```text
1. Enviar arquivos      -> ingestão
2. Revisar pendências   -> só o que o backend marcou como pendente
3. Fechar o dia         -> fechar_dia(data)
4. Conciliação          -> leitura do dia fechado
```

Os outros fluxos deixam de gravar fechamento: viram ferramentas de apoio que só corrigem pendência e pedem recálculo. Chat e agente perdem permissão de escrever número oficial.

---

# Como evitar que volte a quebrar

1. **Fronteira única:** todo cálculo financeiro vive no banco. Regra de revisão: se um arquivo de componente contém soma, subtração ou percentual sobre dinheiro, está errado.
2. **Um caminho de leitura e um de escrita:** um hook para ler o dia, uma rotina para fechar o dia. Nada de tela nova inventando consulta própria.
3. **Vocabulário travado no banco:** status com restrição de valores. Grafia errada passa a falhar na hora da gravação, em vez de sumir silenciosamente da tela.
4. **Testes de invariante rodando sobre dados reais:** total global = soma das lojas; fechar duas vezes não muda nada; reimportar o mesmo arquivo não duplica; nenhum status fora da lista. Qualquer mudança futura que quebre isso aparece na hora.
5. **Parar de empilhar migrações corretivas:** uma versão final consolidada da função, e daqui pra frente cada alteração acompanha o teste de invariante correspondente. Numeração de migração sem repetição.
6. **Auditoria obrigatória:** cada fechamento grava quem fechou, com quais entradas e qual diferença — para achar a causa em minutos em vez de investigar do zero.

## Detalhes técnicos

- Arquivos-chave: `src/hooks/useBackendConciliacao.ts` (41-52, 226-240 e todo o bloco de enriquecimento posterior), `src/components/importacoes/CentralImportWizard.tsx` (~1400-1960), `src/routes/loja.$lojaId.tsx:148`, `src/components/importacoes/wizard/Step2NonRevenueJustifications.tsx`, `src/components/conciliacao/CashVaultCompositionModal.tsx`, `src/hooks/useTransactions.ts`, `src/hooks/useConciliacao.ts`.
- Migração consolidada: versão final única de `get_daily_reconciliation_summary`, nova `fechar_dia(p_date)` transacional e idempotente, `DROP` de `calculate_daily_conciliation`, `CHECK` + backfill de `ofx_transactions.match_status`, `pos_transactions.settlement_status` e `daily_manual_bills.match_status`.
- Nenhum dado financeiro é apagado: apenas normalização de status e recálculo dos dias ainda abertos.

---

# Etapa 7 — OS do import alimentando Faturamento do mês e Recebíveis (com baixa automática)

## Provas do que está errado hoje

1. **Recebíveis praticamente vazio.** A tabela tem só 32 linhas: 27 de cartão de crédito, 4 de débito e **1 boleto**. Nenhuma transferência. `paid_value` é **zero em 100%** das linhas e **nenhuma** tem vínculo com o extrato bancário. Ou seja: baixa automática não existe hoje, e o que aparece na tela é só o valor manual — exatamente como você descreveu.
2. **A OS não guarda a forma de pagamento de forma utilizável.** O campo vem como texto solto, com o valor embutido: `"Credito: 980.00; 980"`, `"PIX: 1000.00; 1000"`, `"Credito: 600.00; Debito: 496.20; Dinheiro: 220.00; 1316.2"`. E **34 OS estão com forma de pagamento vazia**, somando R$ 43.724,24. Sem campo estruturado, é impossível saber com segurança o que é boleto/transferência a receber.
3. **A separação boleto/transferência é feita por expressão regular no navegador**, dentro do processador de OS. Se o texto vier em outra grafia, o recebível simplesmente não nasce — e ninguém percebe, porque "não passa pela nossa mão".
4. **Valores pagos maiores que o total da OS.** No grupo de auto-match, R$ 52.299,80 pagos contra R$ 40.974,41 de total. Isso infla o faturamento/pátio e é parte da diferença que você vê (80 mil esperado x 75 mil no sistema).
5. **Faturamento do mês não é acumulado por regra.** Ele sai da soma dos fechamentos diários existentes: só existem 3 dias gravados em setembro. Mês sem todos os dias fechados = mês sempre menor que o real.

## Como eu faria, sem conflito e sem quebrar

**7.1 — Estruturar a forma de pagamento da OS na ingestão (backend)**
- A quebra do texto de pagamento passa a ser feita no banco, não no navegador, gravando colunas separadas por natureza: dinheiro, débito, crédito, pix, boleto, transferência, "em aberto".
- A soma das naturezas tem que fechar com o valor pago da OS. Não fechando, a OS entra numa fila de revisão em vez de gravar número errado.
- As 34 OS sem forma de pagamento vão para essa mesma fila de revisão, com o valor à vista.

**7.2 — Recebível como consequência automática da OS**
- Toda parcela de boleto e todo valor de transferência/depósito ainda não recebido nasce como recebível vinculado à OS, com loja, número da OS, valor, vencimento e parcela.
- Reimportar a mesma OS **atualiza** o recebível existente (por OS + parcela) em vez de duplicar. Se a OS deixou de ter aquele valor a receber, o recebível é cancelado com registro do motivo — nada é apagado silenciosamente.
- Sem regra nova de negócio no navegador: o import só entrega os dados, o banco decide o que é recebível.

**7.3 — Baixa automática pelo extrato, com parcial**
- Ao importar o extrato, cada entrada de transferência/boleto é confrontada com os recebíveis abertos da mesma loja: primeiro por número de OS no histórico, depois por valor exato, depois por valor aproximado dentro da janela de vencimento.
- Baixa parcial suportada: caiu R$ 2.000 de um recebível de R$ 3.000 → grava R$ 2.000 recebidos, mantém R$ 1.000 aberto e registra o vínculo com a linha do extrato. É exatamente o caso que você citou.
- O que não casar com confiança fica numa lista curta de "confirmar baixa", com o candidato sugerido — em vez de virar órfão invisível.
- Reprocessar o mesmo extrato não dá baixa duas vezes (vínculo único por linha de extrato).

**7.4 — Faturamento do mês com regra própria**
- Passa a ser calculado por período direto das OS e ajustes do mês, não pela soma dos dias fechados. Dia não fechado ainda entra no acumulado do mês.
- A tela mostra a composição: OS do mês + ajustes manuais + o que ficou em revisão. Assim, quando der 75 e você esperava 80, o próprio sistema mostra onde estão os 5 que faltam.

**7.5 — Consertar o passado**
- Recriar os recebíveis de boleto/transferência das OS já importadas, aplicar as baixas que o extrato já comprova e listar o que sobrar para conferência manual.

## Verificação desta etapa
- Uma OS com boleto + transferência gera exatamente os recebíveis esperados; reimportar não duplica.
- Uma entrada de R$ 2.000 no extrato baixa parcialmente um recebível de R$ 3.000 e deixa R$ 1.000 aberto.
- Faturamento do mês fecha com a soma das OS + ajustes, e a diferença contra o esperado é sempre explicável na tela.

---

# Etapa 8 — Diagnóstico do dia 21/09: por que "não rodou" nada

## Provas colhidas agora no banco

1. **Não existe nenhum dado de hoje no banco.** Para 21/09: **0** linhas de extrato, **0** de maquininha, **0** contas a pagar. Mas existem **2 lotes de importação registrados** para essa data. Ou seja: a importação abriu o lote, registrou que rodou, e **nenhuma linha foi gravada**. Nada para pareamento significa "matchs não rodaram" — não tem o que casar.
2. **As contas que você vê na tela são de outro dia.** As contas existem só em 16, 17 e 18/09. Exemplo: Dom Pedro tem R$ 3.066,07 (16/09), R$ 440,00 (17/09) e R$ 3.581,84 (18/09) — soma R$ 4.656,48… o **exatamente** o número que aparece no card de hoje. Já o extrato é filtrado estritamente por data e vem zerado. Daí o retrato: "contas conciliadas" com "saídas OFX zeradas" e divergência em todas as lojas. **A tela compara janelas de tempo diferentes.**
3. **A consulta de contas está quebrada (erro 400).** O app pede as colunas `amount, status` e filtra `status <> ignored` em contas a pagar. **Essa tabela não tem coluna `status`** — o status ali se chama `match_status`. Toda requisição dessas falha, e a tela mostra zero em vez de erro. Vale para 14/09 e 21/09 nos logs que você mandou.
4. **O código que faz essa chamada está fora de sincronia com o banco.** O erro vem de uma cópia local do projeto (pasta `financeiro` na sua máquina), pedindo uma coluna que não existe aqui. Há duas versões do mesmo app divergindo.
5. **A escrita de contas está espalhada em 16 lugares diferentes** do código, cada um com regra própria de data, status e valor. É a razão de "arrumo um, quebra outro".
6. **O extrato do dia aparece zerado inclusive no detalhe da loja**, coerente com o item 1: saldo oficial R$ 22.701,11 herdado do dia anterior, 0 entradas e 0 saídas.

## O que corrigir aqui, além do que já está no plano

**8.1 — Nunca mais falhar em silêncio**
- Toda consulta que erra tem que aparecer na tela como erro, não como zero. Hoje o zero mente.
- A consulta quebrada de contas é corrigida para o nome real do campo, e o vocabulário de status entra na lista fechada da Etapa 4.

**8.2 — Janela de data única para o dia inteiro**
- O dia passa a ter uma definição só, calculada no backend: extrato, maquininha, contas, OS e cofre respondem à mesma janela.
- Conta de dia anterior ainda em aberto aparece em bloco separado e rotulado ("pendências de dias anteriores"), nunca somada como se fosse do dia.

**8.3 — Importação que não mente**
- O lote de importação só é considerado concluído se gravou linhas. Gravou zero → o lote é marcado como falho, com o motivo, e a tela mostra isso.
- Fim do lote fantasma: 2 lotes de hoje com zero linhas não podem existir sem aviso.

**8.4 — Uma versão só do app**
- Consolidar as duas cópias divergentes em uma. Enquanto houver duas, qualquer correção aqui continua sendo desfeita lá.

## Verificação
- Importar hoje novamente: o número de linhas gravadas por arquivo aparece na tela e bate com o banco; se gravar zero, aparece erro.
- Card da loja: contas do dia e saídas do extrato cobrem a mesma janela; pendências antigas aparecem separadas.
- Nenhuma consulta da tela retorna erro 400.
