# Design: Redesign do Painel de Orquestração dos Agentes de Importação (230)

## 1. Redesign de `AgentStageItem.tsx`
- Identidade visual para cada agente com ícones especializados (`Car`, `CreditCard`, `Landmark`, `Sparkles`).
- Header expansível com micro-indicador de atividade (radar pulse quando `running`, badge verde com check quando `success`).
- Sub-etapas estilizadas como eventos de terminal com fonte mono e marcadores dinâmicos.

## 2. Redesign de `CentralImportWizard.tsx` (Etapa 4)
- Remoção do grid quadrado de 4 cards e barra gradiente pesada.
- Container centralizado focado na lista de agentes e console de telemetria.
- Banner de conclusão harmonizado com tokens padrão do sistema.
