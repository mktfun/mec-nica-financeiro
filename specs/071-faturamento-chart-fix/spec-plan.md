# Checklist de Implementação: Spec 071

## Tasks

- [x] [FRONTEND] Ajuste de Eixo Y (Anti-Wrap)
  - [x] Criar o componente `CustomYAxisTick`.
  - [x] Remover o prop `tick={{...}}` atual do `YAxis` e usar `tick={<CustomYAxisTick />}`.
  - [x] Garantir que o nome da loja caiba visualmente no espaço de 130px.

- [x] [FRONTEND] Limpeza Visual
  - [x] Remover as tag `<LabelList>` de dentro dos componentes `<Bar>`.
  - [x] Alterar o cálculo da altura da div de `chartData.length * 55` para `chartData.length * 38`.

- [x] [FRONTEND] Correção do Tooltip
  - [x] Adicionar `allowEscapeViewBox={{ x: true, y: true }}` ao `<Tooltip>`.
  - [x] Desativar animação do tooltip (`isAnimationActive={false}`) caso haja flickering no escape.
  - [x] Garantir que a `margin={{ right: ... }}` dê espaço (usar 16 ou 20 em vez de 50).
