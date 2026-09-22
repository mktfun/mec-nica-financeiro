# Plano: Cartões a Compensar, Saldo do Extrato e Saldo Consolidado por Filial (22/09)

## Regra aprovada por você

Cartão só fica "a compensar" no que **ainda não caiu na conta**. Se de R$ 100 caiu R$ 1, ficam R$ 99 a compensar — nunca R$ 100, senão o R$ 1 que já está no saldo do banco é contado duas vezes.

Saldo do extrato continua sendo o valor do arquivo do banco. O que tem que fechar é a soma:

```text
Saldo Consolidado = Saldo do Extrato + Dinheiro no Cofre + Cartão que ainda não caiu
```

Mauá: -12.964,64 + 0 + 3.679,12 = **-9.285,52**
Beretta: 48.111,02 + 0 + 0 = **48.111,02**

## O que a verificação no banco provou

1. **Todas as 13 vendas de cartão do dia 22 estão gravadas como "a compensar", com valor liquidado zero** — inclusive as que já caíram. O resultado do motor de conciliação Rede x extrato **nunca é gravado de volta** na venda.
2. **O "a compensar" da tela não vem do motor.** Ele é recalculado somando toda venda de cartão do dia cujo status não seja "entrou"/"liquidado". Como nenhuma venda recebe esse status, o total do dia sempre aparece inteiro. É exatamente isso que produz os R$ 382,00 de Beretta e os R$ 4.671,32 de Mauá.
3. **As vendas do arquivo da Rede são do dia 21 e o extrato usado também é do dia 21**, os dois entrando no fechamento do dia 22. Ou seja: parte do arquivo da Rede já caiu no extrato do mesmo pacote, e essa parte precisa ser descontada.
4. **Faltam lançamentos no extrato importado.** Conferindo saldo anterior + lançamentos contra o saldo final gravado:
   - Mauá: -20.798,12 + 6.841,28 = -13.956,84, mas o saldo gravado é -12.964,64. Sobra **exatamente R$ 992,20** — o valor líquido do débito VISA do dia. Esse crédito já está dentro do saldo, mas não foi importado como lançamento.
   - Beretta: 52.731,18 + 5.533,92 - 10.540,16 = 47.724,94, contra o saldo gravado de 48.111,02. Sobram **R$ 386,08**, na faixa do débito MASTERCARD de R$ 382,00.
   Sem esses lançamentos o motor não tem como saber que o dinheiro caiu, e o valor volta para "a compensar".
5. **Os créditos da Rede que aparecem no extrato são de lotes anteriores** (Mauá R$ 405,61 + R$ 493,27 + R$ 942,40; Beretta R$ 3.981,28). Eles não podem ser usados para quitar as vendas do arquivo do dia — foi essa dedução cega que, nas tentativas anteriores, zerou o "a compensar" de todas as lojas.

## Correção proposta

### 1. Fechar o buraco do extrato (causa de origem)
- Na leitura do arquivo do banco, conferir por filial: `saldo final − (saldo anterior + lançamentos) = 0`.
- Se sobrar diferença, o arquivo não foi lido por completo: a importação avisa a filial e o valor faltante, em vez de seguir em silêncio.
- Corrigir a captura de lançamentos para que os créditos de cartão que já estão dentro do saldo entrem como lançamento.

### 2. Gravar o resultado do motor na venda
- Cada venda do arquivo da Rede passa a receber, ao fim da conciliação: status (`entrou`, `parcial` ou `a_compensar`), valor já creditado e data do crédito.
- O motor só pode casar venda com crédito do extrato quando houver evidência: mesmo valor líquido, ou lote da mesma bandeira com soma igual. Crédito de lote antigo não quita venda do dia.
- Casamento parcial é permitido e é a base da sua regra: caiu R$ 1 de R$ 100 → venda fica `parcial`, creditado R$ 1, a compensar R$ 99.

### 3. Uma fórmula só para "a compensar"
- O valor a compensar de cada filial passa a ser **valor líquido da venda menos o valor já creditado**, lido do que o motor gravou:

```text
A Compensar (filial) = Σ (valor líquido da venda − valor já creditado)
```

- Somem-se apenas parcelas maiores que zero; venda totalmente creditada entra com zero.
- A tela para de recalcular por conta própria e para de usar os atalhos atuais ("se não veio nada, usa o total da Rede"). Ela só exibe o número já apurado.

### 4. Saldo consolidado sem dupla contagem
- `Saldo Consolidado = Saldo do Extrato + Cofre + A Compensar`, com o "a compensar" da fórmula acima.
- Trava de segurança: o "a compensar" de uma filial nunca pode incluir valor que o próprio motor marcou como creditado; se isso acontecer, a filial fica sinalizada em vez de exibir número errado.

### 5. Somente do dia 22 em diante
Nada de dias fechados anteriores será reescrito, conforme você pediu.

## Como saberemos que ficou certo

- Mauá: extrato -12.964,64, a compensar **3.679,12**, consolidado **-9.285,52**, com o débito de R$ 992,20 marcado como já creditado.
- Beretta: extrato 48.111,02, a compensar **0,00**, consolidado **48.111,02**.
- As outras 8 filiais continuam mostrando o "a compensar" que realmente não caiu (não volta a zerar tudo).
- Em toda filial: saldo anterior + lançamentos = saldo final, sem sobra.
- Rodar a importação duas vezes dá o mesmo resultado, sem duplicar valor.
- A soma da coluna "a compensar" das 10 filiais é igual ao total do topo do modal e ao valor usado no fechamento do dia.

## Arquivos afetados (blast radius)

- `src/lib/parsers/ofxParser.ts` — captura de lançamentos e conferência saldo anterior + lançamentos = saldo final.
- `src/lib/matchers/reconciliadorRedeOfx.ts` — casamento com evidência, crédito parcial, proibição de usar crédito de lote antigo.
- `src/components/importacoes/CentralImportWizard.tsx` — gravar status/valor creditado nas vendas e bloquear conclusão quando o extrato não fecha.
- `src/hooks/useBackendConciliacao.ts` — passar a ler o "a compensar" apurado, sem recalcular nem usar atalhos.
- `src/components/conciliacao/SaldoBancosDetailModal.tsx` — apenas exibir; remover as regras de fallback e o total fixo escrito no rodapé.
- Migração Supabase — preencher `settlement_status`, `settled_amount`, `settled_date` em `pos_transactions` e devolver o campo de a compensar já calculado na consulta de conciliação.

## Pré-requisito técnico

O build está quebrado por dois módulos que não existem no projeto: `src/lib/sandbox/sandboxStorage` e `src/lib/llm-matcher` (este último é importado justamente pelo motor Rede x OFX). Eles precisam ser criados ou os imports removidos antes de qualquer alteração, senão nada compila e não há como validar os números.
