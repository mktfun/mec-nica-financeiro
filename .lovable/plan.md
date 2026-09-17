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
