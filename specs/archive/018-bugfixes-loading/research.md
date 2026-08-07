# Research - 018 Bugfixes & Loading

## Contexto e Problema
1. **Bug do Checkbox (D+1):** O usuário relatou que ao importar planilhas do dia 28, o sistema ainda mantém os recebimentos de cartÁo como "a receber" (pendentes), mesmo que a regra de 1 dia útil (D+1) já devesse ter marcado como recebido no dia de hoje (02 de Junho). 
Ao analisar o código (`src/hooks/useImportProcessor.ts`), descobriu-se que recebíveis duplicados (mesma data, tipo e valor) sÁo **ignorados** na reimportaçÁo para evitar duplicaçÁo de dados. Isso impede que um recebível que foi salvo como "pendente" no passado seja atualizado para "recebido" quando o usuário reimporta a mesma planilha em uma data futura.
2. **Design do LoadingSpinner:** O usuário reclamou que o spinner de carregamento atual (um círculo SVG com `strokeDasharray="30 100"` que rotaciona, parecendo bolinhas coloridas) está "feio" e nÁo condiz com o SDD de design moderno 2026. A exigência é por um design mais limpo, profissional, usando microinterações suaves (ex: Skeleton loaders ou progress bars abstratas).

## Análise de Código
- `src/hooks/useImportProcessor.ts` -> A seçÁo `Process Receivables` (linha 189) faz a checagem `isDuplicate`. Se for duplicado, o código apenas usa `continue`. A soluçÁo é permitir um *Upsert* condicional: se o registro existir como "pendente" e a nova importaçÁo calcular que ele agora está "recebido" (por conta de `due_date <= todayStr`), o status deve ser atualizado.
- `src/components/ui/LoadingSpinner.tsx` -> Atualmente utiliza `framer-motion` para rotacionar um SVG estático. A substituiçÁo será por um design Liquid Glass/Minimalista mais moderno, com animaçÁo fluida (ex: barra de progresso indeterminada tipo Apple ou pulso suave).

## Referências
- O SDD de 2026 exige (de acordo com `ux-ui-architect-2026`): Apple Liquid Glass, animações com Framer Motion baseadas em física e ausência de elementos "baratos" como spinners de pontinhos padrÁo.
