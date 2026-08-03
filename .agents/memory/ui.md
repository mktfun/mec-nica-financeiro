## [2026-08-03] — [Feature ID: 058-ai-agent-ux-costs]

**Contexto:** O workspace do Agente de IA foi refatorado para ser um contêiner Single Page Application interno em `agente.tsx`. O usuário pode navegar entre Chat, Configurações, Logs e Custos sem sofrer um reload ou redirecionamento global.

**Regra aprendida:** Em vez de usar rotas globais do `@tanstack/react-router` para subseções muito conectadas ao contexto do usuário (como os logs daquele agente), utilize uma variável de estado `activeView` no componente pai que exibe e oculta painéis (como `ConfiguracoesPanel`, `CustosPanel`, `LogsAgentePanel`) sob demanda.

**Risco identificado:** Crescimento desordenado do arquivo `agente.tsx`. É crítico extrair sub-telas para arquivos separados na pasta `src/components/agente/` (e.g. `LogsAgentePanel.tsx`), e renderizá-los condicionalmente na view principal, garantindo um código limpo.

**Não fazer:** Não jogue a rota `/configuracoes` na barra lateral global se ela está intimamente ligada apenas ao contexto da ferramenta do Agente IA. O usuário deve focar no workspace.
