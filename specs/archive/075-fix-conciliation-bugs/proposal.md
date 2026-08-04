# Proposal: Correções de Conciliação (075)

## Problema
1. O **Saldo Banco Itaú Global** está exibindo valores na casa dos milhões (ex: R$ 17.998.662,00) enquanto os saldos individuais das lojas estão corretos. Isso ocorre porque o sistema está somando o `<LEDGERBAL>` (Saldo Bruto do OFX) de todos os arquivos importados. Como os arquivos de filiais podem ser derivados de uma mesma conta corporativa (holding), somar os saldos brutos multiplica o saldo da holding pelo número de arquivos/lojas, gerando distorções irreais.
2. O componente de navegação por setas (Date Picker) na tela de Conciliação está bloqueado permitindo avançar apenas até "ontem", impedindo o fechamento e navegação na data de "hoje".

## Solução Proposta
1. Mudar a origem do dado Global de `totalBancarioRaw` (Soma de `<LEDGERBAL>`) para `totalBancarioIn` (Soma real das transações de entrada do extrato) no arquivo `src/components/conciliacao/ResumoDiaPanel.tsx` e `src/routes/conciliacao.index.tsx`. Isso garantirá que o total do dia reflita as entradas processadas e baterá exatamente com a soma dos saldos das lojas individuais (que já usam as transações de entrada via `bankInDate`).
2. Remover a restrição `getDefaultDate()` (que retorna ontem) do botão de "Próximo Dia" no calendário, permitindo o avanço até o dia atual (`new Date().toISOString().substring(0,10)`).

## Contratos de Dados
- Nenhuma alteração no Supabase. O banco de dados já possui os valores de `<TRNAMT>` (entradas) persistidos corretamente na tabela `transactions`.

## API / Interface
- `src/routes/conciliacao.index.tsx`: Corrigir o estado `disabled` da seta de "Próximo Dia" e o repasse da prop de Saldo.
- `src/components/conciliacao/ResumoDiaPanel.tsx`: Substituir o uso de `totalBancarioRaw` por `totalBancarioIn` como fallback do Saldo Bancário antes de salvar o Snapshot Global.

## Features Existentes Impactadas
- Tela Principal de Conciliação (UI).
- Dashboard Resumo Global (G13 - Saldo Banco Itaú).

## Risco Principal
Baixíssimo. Estamos substituindo um somatório de saldos estáticos (que não deve ser feito para contas holding) pela soma transacional determinística do dia.
