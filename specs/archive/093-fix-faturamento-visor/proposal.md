# Proposal: Faturamento Visor & Matemática de Realidade (093-fix-faturamento-visor)

## Problema
1. O Faturamento por Loja na tela de conciliaçÁo está aparecendo zerado (ou próximo de zero) mesmo havendo valores pesados importados tanto de Maquininha quanto de PIX (OFX). Isso gerou Diferenças gigantescas (Ex: Maquininha 4k, Faturamento 0, Diferença 4k). 
2. A causa raiz: O cálculo visual de "Faturamento" em `conciliacao.index.tsx` estava puxando estritamente `faturamento_real_ofx` (o que ignora a Maquininha, que é a própria realidade processada pela Rede).
3. Além disso, o usuário deseja visualizar o "Faturamento Anterior" (acumulado) diretamente no painel de ConsolidaçÁo do Dia, para nÁo perder a referência caso decida reimportar arquivos do zero.

## SoluçÁo Proposta
1. **CorreçÁo do Faturamento Real Visual:** No frontend (`conciliacao.index.tsx`), a variável `faturamento` deve somar nÁo apenas o OFX Matchado, mas também o `cartao_entrou` (Maquininha). Afinal, o crédito processado pela adquirente JÁ É a realidade daquele dia.
   - Fórmula: `Faturamento = Maquininha + PIX Encontrado (no OFX)`
   - Diferença continuará sendo: `(Maquininha + PIX Esperado) - Faturamento` (o que resulta matematicamente em acusar apenas os PIX esperados que NÁO caíram no banco, e nÁo gerar alarme falso com a Maquininha).
2. **ExibiçÁo do Faturamento Anterior:** Inserir um micro-card ou sub-label no `ResumoDiaPanel.tsx` no quadrante de "Faturamento Líquido", exibindo o `faturamento_anterior` (valor consolidado herdado do último fechamento).

## Contratos de Dados
Nenhuma tabela nova. Manteremos as estruturas atuais:
- `cartao_entrou` e `pix_os_expected` via `useModulo1StoresData`.
- O pareamento rápido `pix_os` (PIX que bateu o valor exato no OFX em tempo real).

## API / Interface
- `src/routes/conciliacao.index.tsx`: Modificar cálculo de `faturamento` e ajustar a dependência visual.
- `src/components/conciliacao/ResumoDiaPanel.tsx`: Adicionar a prop `faturamentoAnteriorGlobal` no UI (no quadro "Faturamento Líquido").

## Features Existentes Impactadas
- **[092-fix-faturamento-math]**: Esta spec ajusta o resultado da anterior, corrigindo a omissÁo da Maquininha no lado da "Realidade" na balança.

## Risco Principal
Que o valor de PIX Matchado matematicamente (`storeMod1.pix_os`) sofra falsos positivos (ex: dois depósitos de 100 reais se confundindo). No entanto, isso é visual, e a consolidaçÁo bancária oficial já lida com exceções na camada de matches manuais.
