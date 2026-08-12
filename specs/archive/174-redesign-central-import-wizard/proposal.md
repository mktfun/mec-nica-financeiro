# Proposal: Redesign Central Import Wizard (174)

## Problema
O usuário reclamou que, embora a funcionalidade de salvamento da conciliação (Feature 172) esteja funcionando perfeitamente, a interface gráfica da última etapa (Step 4 - Salvando/Diário de Operações) ainda exibe o "log antigo fudido" de texto (baseado no mapeamento do estado `importLogs`). O objetivo era substituir este log textual pelo design de passos visuais animados (`AgentStageItem` com bolinhas/status que antes ficavam no modal do agente) para um visual mais premium, e reformular o design do restante do Wizard, que não foi alterado.

## Solução Proposta
Vamos redesenhar a Etapa 4 do `CentralImportWizard` e dar um "premium polish" geral ao componente:
1. Remover completamente o `importLogs.map(...)` que exibe texto cru.
2. Renderizar o array `importStages` usando o componente `<AgentStageItem stage={stage} />`.
3. Ajustar os layouts (grids, bordas, cores) ao longo dos Steps 1 ao 4, aplicando os princípios do `ui.md` e `frontend-design-pro` (Zinc-950, bordas sutis, animações suaves, sem glassmorphism exagerado mas com visual clean e profissional).

## Contratos de Dados
- Não há mudanças de banco de dados, RLS, Edge Functions ou RPCs necessárias. É uma alteração estrita de UI/UX no frontend.

## API / Interface
- `src/components/importacoes/CentralImportWizard.tsx`: O JSX será atualizado para remover o bloco de "Diário de Operações" antigo e usar `<AgentStageItem>`.
- O layout das demais etapas (Dropzone, Selects de Mapeamento, botões de ação) receberá polimento (sombras, hover states).

## Features Existentes Impactadas
- Fluxo de Importação Central (Front-End)

## Risco Principal
- Impacto: Reversível (Apenas UI).
- Probabilidade: Baixa.
- Mitigação: Reverter as mudanças de UI via git caso algo quebre a acessibilidade.
