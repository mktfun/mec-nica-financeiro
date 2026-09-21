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

# Etapa 8 — Incidente de 21/09: causa comprovada e reparo sem perder dados

## Diagnóstico comprovado no banco e no código

1. **Os arquivos foram lidos e os dados foram gravados, mas em datas incompatíveis.** O log das 09:43 informa 81 lançamentos OFX e 115 transações no lote. O banco confirma no lote `a083037a-82a6-43fe-b634-361ec00f8954`: **81 OFX + 34 vendas de maquininha**.
2. **Todos os 81 OFX do lote de 21/09 foram classificados como 18/09.** Eles têm `occurred_at = 18/09`, `target_date = 18/09`, totalizando **R$ 49.304,69 de entradas** e **R$ 82.309,39 de saídas**. Para `target_date = 21/09`, há **zero OFX**.
3. **As contas estão corretamente em 21/09.** Foram gravadas **56 contas**, total de **R$ 73.509,19**, distribuídas entre as lojas. As 34 vendas de maquininha também estão em 21/09, total bruto de **R$ 53.773,95**.
4. **Os motores não falharam tecnicamente; receberam uma data sem OFX.** `auto_match_saidas('2026-09-21')` e `auto_match_daily_transactions('2026-09-21')` filtram estritamente `target_date = 21/09`. Como os 81 OFX ficaram em 18/09, o resultado legítimo foi 0 matches. O log chamou isso incorretamente de “sucesso”.
5. **A causa está na regra de data da importação.** O import lê a data interna da transação e só a move para a data selecionada quando a diferença é de até 1 dia. Como 18/09 → 21/09 são 3 dias (fim de semana), mantém 18/09. Contas e maquininha usam diretamente a data selecionada, 21/09. Assim, um único lote é partido em duas competências.
6. **A tela de extrato não perdeu os lançamentos.** Ela consulta `target_date = 21/09`, por isso mostra 0. Os 81 lançamentos existem em 18/09 e o saldo oficial de cada loja foi carregado em `reconciliations` de 21/09. Isso produz exatamente a imagem observada: saldo bancário presente, mas entradas/saídas zeradas.
7. **O fechamento foi gravado antes do pareamento e com dados incompatíveis.** Em 21/09 foi criado um fechamento `is_closed = true`, com contas de R$ 73.509,19, faturamento de R$ 69.064,82 e diferença de R$ 18.069,08, embora não houvesse OFX naquela competência. Depois disso os motores rodaram e retornaram zero.
8. **O erro 400 é um segundo defeito confirmado.** `useBackendConciliacao` consulta `daily_manual_bills.select('amount, status').neq('status', 'ignored')`, mas a tabela possui `match_status`, não `status`. A consulta falha e o código mantém um valor alternativo, escondendo o erro como se fosse resultado válido.
9. **O aviso do TanStack não causou os zeros.** É apenas aviso de otimização porque `TesteImportPage` está exportado por um arquivo de rota. Deve ser limpo, mas não participa da importação nem dos matches.
10. **Há três lotes registrados para 21/09.** Um contém 81 OFX datados em 18/09 e 34 vendas em 21/09; outro não tem linhas; o terceiro ficou associado a apenas um OFX posteriormente reatribuído ao lote principal pelo `upsert`. O vínculo de lote também não é imutável hoje.

## Reparo imediato do incidente, preservando o histórico

**8.1 — Não alterar 18/09 automaticamente**
- Não mover os 81 OFX para 21/09 sem validação, pois a data bancária real registrada é 18/09. O sistema deve distinguir **data do movimento bancário** de **data operacional da conciliação**.
- Preservar `occurred_at = 18/09` como prova do extrato e associar o lote a uma competência operacional explícita (`reconciliation_date = 21/09`).

**8.2 — Tornar a competência do lote única**
- A importação recebe uma data operacional única e todos os registros do lote carregam essa associação, sem sobrescrever a data real do banco.
- Contas, maquininha, OS e OFX são pareados pela competência do lote; a tela de extrato pode alternar “movimento bancário” e “fechamento operacional” sem misturar os conceitos.
- A regra cobre fim de semana e feriado: arquivo bancário de sexta usado no fechamento de segunda continua com data bancária de sexta, mas participa explicitamente do lote de segunda.

**8.3 — Reprocessar 21/09 em transação controlada**
- Marcar o fechamento atual de 21/09 como necessitando recálculo, sem apagar snapshot, contas, OFX ou vendas.
- Associar os 81 OFX já existentes à competência operacional de 21/09.
- Rodar, nesta ordem: match de saídas x contas → match de entradas x OS/recebíveis → Rede x OFX → recálculo por loja → novo snapshot → auditoria comparando antes/depois.
- Só substituir o fechamento oficial depois que as invariantes passarem. Se qualquer etapa falhar, reverter o reprocessamento inteiro e manter o fechamento anterior auditável.

**8.4 — Corrigir o falso sucesso**
- Cada etapa registra contagem de entrada, gravada, rejeitada, duplicada e pareada por tipo e loja.
- “Sucesso” exige: contagem esperada = gravada + duplicada justificada; e o motor recebeu registros elegíveis. Zero elegíveis com arquivo contendo 81 OFX vira bloqueio, não sucesso.
- O lote vazio fica como falho/incompleto e não pode fechar o dia.

**8.5 — Corrigir a consulta 400 e a apresentação de erro**
- Trocar `status` por `match_status` na leitura de contas e usar o vocabulário padronizado da Etapa 4.
- Remover o fallback silencioso: falha de consulta mostra “dados indisponíveis” com opção de tentar novamente; nunca R$ 0,00.

**8.6 — Estabilizar o vínculo de importação**
- O `upsert` por loja + FITID não pode trocar silenciosamente o `import_batch_id` de uma transação já existente. Reimportação registra a ocorrência como duplicada no lote novo, preservando o lote original.
- Criar resumo auditável por lote e arquivo: nome, período bancário, competência operacional, quantidade lida, nova, duplicada, rejeitada e motivo.

## Verificação obrigatória de 21/09

- Os 81 OFX permanecem com movimento bancário em 18/09 e participam da conciliação operacional de 21/09.
- Extrato de 21/09, no modo operacional, mostra exatamente 81 lançamentos: R$ 49.304,69 em entradas e R$ 82.309,39 em saídas.
- As 56 contas de R$ 73.509,19 entram no mesmo ciclo dos 81 OFX; o relatório informa quantas casaram e lista cada órfã real.
- Os 34 registros de maquininha de R$ 53.773,95 entram no mesmo ciclo e o Rede x OFX deixa de concluir com “nenhum crédito” sem explicar a janela usada.
- O total global é igual à soma das lojas; nenhum lançamento aparece em duas competências operacionais; reprocessar o lote não duplica nem muda o lote original.
- Nenhuma requisição de contas retorna 400; erro real nunca é renderizado como zero.
- O snapshot final só fica fechado depois dos matches e contém as contagens e o identificador da auditoria que o produziu.

## Ordem de implementação desta correção

1. Criar a competência operacional e o relatório imutável do lote.
2. Corrigir a leitura de contas e remover zeros silenciosos.
3. Alterar os motores para receber a competência/lote validado, não inferir tudo por `target_date`.
4. Reprocessar 21/09 com os registros existentes e auditar antes/depois.
5. Integrar definitivamente esta regra à rotina única `fechar_dia` das Etapas 1–6.
