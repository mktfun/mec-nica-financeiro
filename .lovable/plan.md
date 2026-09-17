# Diagnóstico com provas: por que Importação e Conciliação não fecham

Investiguei o banco e o código. Não é "um bug": são 5 causas estruturais que se alimentam entre si. É por isso que consertar uma quebra outra.

## Prova 1 — O mesmo dia tem dois resultados oficiais ao mesmo tempo

Rodei o cálculo do dia 17/09 nas duas formas que o próprio sistema usa hoje:

```text
                     congelado(importação)   recalculado(ao vivo)
Valor disp. contas       R$ 31.262,69            R$ 6.584,19
Diferença final          R$   -850,22            R$ -25.528,72
```

Mesma data, mesma função, dois números. As telas escolhem lados diferentes: a tela de Conciliação lê o valor congelado, o chat, o assistente e as revisões da importação leem o valor ao vivo. Então "abrir de uma forma e na conciliação estar de outra" é exatamente isso, comprovado.

## Prova 2 — A importação congela o fechamento ANTES de rodar o pareamento

No fluxo da Importação Central, o dia é gravado como "fechado" com números calculados no navegador e só depois os motores de pareamento (rede, pix, contas) rodam no banco. Resultado: o fechamento gravado nunca contém o resultado do pareamento. Todo lançamento pareado depois "não vai para onde deveria ir" — ele existe, mas o número oficial do dia já foi selado sem ele.

## Prova 3 — Existem duas contabilidades paralelas

Duas rotinas diferentes calculam o dia (`calculate_daily_conciliation` e `get_daily_reconciliation_summary`), cada tela chama uma. Além disso o critério de "aprovado" está escrito em 4 lugares com 3 tolerâncias diferentes (R$ 50, R$ 250 e a regra interna do banco), e o status volta escrito como `divergent` enquanto parte das telas compara com `divergence` — comparação que nunca dá verdadeiro.

## Prova 4 — Gravações que não efetivam

A tabela `transactions` que 20 arquivos do app ainda usam não é mais uma tabela: é uma visão que só aceita alteração. Não tem regra de inserção nem de exclusão. Consequência concreta: a exclusão de lançamento na tela da loja e a leitura por `fitid` na importação operam sobre um objeto que não suporta essas operações — a ação parece acontecer na tela e não persiste.

## Prova 5 — Vocabulário de status sem regra

No banco: das 126 linhas de extrato, 60 estão com status de pareamento vazio. O campo aceita qualquer texto e o código escreve 10 variações diferentes, incluindo `MATCHED` em maiúsculo numa tela e `matched` minúsculo nas outras. Quem filtra por "pendente" não enxerga o vazio; quem filtra por `matched` não enxerga o `MATCHED`. Itens somem de uma tela e reaparecem em outra.

Contexto agravante: 192 arquivos de migração, sendo 66 deles reescrevendo a mesma função de cálculo, e 3 pares com o mesmo número de versão (ordem de aplicação ambígua).

## Plano de correção (ordem obrigatória)

Etapa 1 — Fonte única da verdade
- Eleger `get_daily_reconciliation_summary` como única calculadora do dia e aposentar `calculate_daily_conciliation`.
- Eliminar o modo duplo: o parâmetro que alterna congelado/ao vivo passa a ter uma regra única — dia fechado lê congelado, dia aberto recalcula. Nenhuma tela escolhe.
- Centralizar tolerância e status num único lugar do backend; frontend só exibe. Padronizar `divergence`.

Etapa 2 — Inverter a ordem no fechamento da importação
- Rodar todos os motores de pareamento primeiro, e só então gravar o fechamento — usando os números devolvidos pelo backend, não os calculados no navegador.
- Remover a matemática financeira duplicada do navegador nesse fluxo.

Etapa 3 — Padronizar status no banco
- Definir a lista fechada de status de pareamento, preencher os 60 registros vazios, aplicar restrição de valores e normalizar as 10 grafias no código para a lista única.

Etapa 4 — Fechar os caminhos de escrita quebrados
- Apontar leitura/gravação para as tabelas reais (`ofx_transactions`, `pos_transactions`, `manual_transactions`) e remover exclusão/inserção pela visão `transactions`.

Etapa 5 — Verificação
- Comparar, para 5 dias reais, o número da Importação com o da Conciliação e provar que são idênticos; repetir importação para provar que reimportar não altera resultado.

## Detalhes técnicos

- Arquivos-chave: `src/hooks/useBackendConciliacao.ts` (linhas 41-52 e 226-240), `src/components/importacoes/CentralImportWizard.tsx` (linhas ~1843-1960 e 1422), `src/routes/loja.$lojaId.tsx:148`, `src/components/importacoes/wizard/Step2NonRevenueJustifications.tsx`, `src/components/conciliacao/CashVaultCompositionModal.tsx`.
- Nova migração consolidada: versão final única da RPC de resumo, `CHECK` em `ofx_transactions.match_status` / `pos_transactions.settlement_status` / `daily_manual_bills.match_status`, backfill dos nulos, e regras `INSTEAD OF INSERT/DELETE` removidas do escopo (código deixa de usar a visão).
- Nenhum dado financeiro é apagado; apenas normalização de status e recálculo dos dias abertos.
