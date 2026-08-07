# Design: RefatoraçÁo UI ConciliaçÁo (ui-refactor)

## Arquitetura Técnica
A nova arquitetura para a renderizaçÁo do frontend fará um parsing linear (flat map) dos dados retornados por `useReconciliationViews`.
- **Maquininha**: A interface vai iterar sobre `redeVsOfx.rede` e `redeVsOfx.unassignedRedeTxs`. A verificaçÁo do banco será binária, baseada no ID constar ou nÁo num grupo pareado (`depositGroups`) ou se há `unassignedRedeTxs`.
- **PIX**: A interface vai iterar linearmente sobre a lista agregada `pixVsOfx.osPix`. Vai utilizar o objeto `pixVsOfx.pixGroups` para verificar se `isMatched` é true (significando que o PIX "Entrou").

## Componentes / Hooks / Funções
- **src/hooks/useConciliacao.ts**: Nenhum ajuste pesado na lógica central, pois o objeto `depositGroups` e as propriedades de `osPix` e `unassignedRedeTxs` já carregam os links de que precisamos.
- **src/components/conciliacao/RedeVsOfxTable.tsx**: O componente inteiro será substituído por uma `table` tailwind com as colunas: 
  - Data / Status
  - DescriçÁo / Método
  - OS Vinculada (buscando do matching existente)
  - Valor Bruto
  - Taxa (%)
  - Taxa (R$)
  - Valor Líquido
  - Status Banco ("Entrou" ou "NÁo Entrou" Badge)
- **src/components/conciliacao/PixVsOfxTable.tsx**: O componente inteiro será substituído por uma `table` tailwind com as colunas:
  - OS Vinculada
  - Valor PIX OS
  - Status Banco ("Entrou" ou "NÁo Entrou" Badge)

## Fluxo de UI
1. O usuário acessa a página de Detalhes da ConciliaçÁo de Loja (`/conciliacao/$lojaId`).
2. Ele percebe apenas 4 abas (em vez de 5, já que "Alertas" foi removida).
3. Ao clicar em **Maquininha (Líq) → Banco**, ele nÁo verá mais cartões aninhados. Ao invés disso, uma tabela limpa exibe todas as suas transações de maquininha uma a uma, mostrando claramente as taxas descontadas de cada transaçÁo, se a transaçÁo identificou qual OS está vinculada, e um badge visual "Entrou" caso ela conste em algum `depositGroup`.
4. Ao clicar em **PIX (OS → Banco OFX)**, ele verá a lista de PIXs processados/identificados pelas Ordens de Serviço do Pátio (até as nÁo finalizadas), e um badge ao lado indicando se este PIX foi correspondido com algum depósito no Banco.

## Cenários de VerificaçÁo (SCAN → INFER → VERIFY → FIX)
- **Cenário 1:** Acessar a página `conciliacao/loja/ID`. A aba "Alertas de Exceções" nÁo deve existir.
- **Cenário 2:** Na aba de Maquininha, uma transaçÁo da Rede nÁo mapeada pelo OFX deve aparecer na tabela com Badge Vermelho indicando "NÁo Entrou".
- **Cenário 3:** Na aba de PIX, uma OS que nÁo teve seu PIX verificado no banco deve constar na listagem com Badge "NÁo Entrou".
