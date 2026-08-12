# Spec Plan: Marco Zero Global Completo (169-marco-zero-globals)

## Tasks

- [x] [BACKEND] Criar arquivo de migration no Supabase: `supabase/migrations/20260812100300_add_metadata_to_daily_snapshots.sql` com: `ALTER TABLE daily_snapshots ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;`
- [x] [FRONTEND/PARSER] Atualizar a interface `MarcoZeroGlobalData` no `src/lib/parsers/marcoZeroParser.ts` para conter as 15 chaves numéricas (Dinheiro MP, A Receber, Negativo, Caixa Anterior, Caixa Atual, Faturamento Atual, Faturamento Anterior, Fluxo Caixa, etc).
- [x] [FRONTEND/PARSER] Refatorar a lógica `parseMarcoZeroPlanilha`:
  - Iterar sobre as `Object.values(row)` ou `Object.keys(row)` para não depender dos índices fixos `6` e `7`.
  - Se algum valor (seja string ou `cleanNumber`) der match nos rótulos de Global Data, pegar o valor da propriedade vizinha que for um número válido.
  - Implementar normalização de acentos forte (lidando com "ITAÁš", "Â±").
- [x] [FRONTEND/UI] Atualizar o `MarcoZeroWizard.tsx` para apresentar o novo `globalData` expandido (Grid layout para caber as 15 variáveis sem poluir).
- [x] [FRONTEND/UI] Atualizar o Payload do botão `handleConfirm` em `MarcoZeroWizard.tsx` para enviar: `faturamento: global.faturamentoAtual`, `caixa_atual: global.caixaAtual` e injetar as métricas de acompanhamento secundárias dentro do campo `metadata` no INSERT.
- [x] [TEST] Re-fazer upload da planilha com o script rodando e validar se "VALOR DISPONÍVEL PARA CONTAS", "PROLABORE DANIEL" e "SALDO ITAÚ" aparecem com valores reais invés de R$ 0.
