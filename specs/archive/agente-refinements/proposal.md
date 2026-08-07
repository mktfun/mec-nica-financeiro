# Proposal: Refinamentos UX do Agente e Novo Módulo de Custos (agente-refinements)

## Problema
O usuário apontou várias arestas na experiência do Agente IA e nas telas de Log/ConfiguraçÁo:
1. O input continua com bordas da cor errada (verde/teal em focus), distoando do padrÁo Zinc-950.
2. O header do sidebar ("Oficina GPT") sofre sobreposiçÁo parcial pelo header global do sistema.
3. O botÁo de "Nova Conversa" é rígido e carece de micro-interações (animações de clique/hover).
4. O histórico de conversas nÁo gera títulos úteis; apenas lista "Nova Conversa". E quando cresce muito, nÁo possui limites nem paginaçÁo visual (ex: mostrar os últimos 5 e botÁo "Ver mais").
5. O histórico precisa de funcionalidade para renomear uma conversa manualmente.
6. As telas de Logs (`logs.agente.tsx`, `logs.motor.tsx`) e `configuracoes.tsx` nÁo possuem botÁo de "Voltar" (para facilitar o retorno rápido à central).
7. A tela do Log do Motor exibe os payloads brutos abertos (`<pre>`), poluindo a tela. É impossível analisar facilmente o Input/Output e os dados de contexto isoladamente.
8. **Falta de visibilidade de Custos:** NÁo existe um painel de Custos detalhados (ConciliaçÁo vs Chat) por período e requisições.

## SoluçÁo Proposta
**Frente 1: UI/UX do Chat (`agente.tsx`, `PromptInput.tsx`)**
- Corrigir o foco do input para usar uma borda zinc (var(--border-subtle) ou var(--text-secondary)) em vez da cor de destaque do tema base.
- Adicionar `mt-4` ou espaçamento adequado no topo do sidebar do `agente.tsx` para evitar que o Header do app "coma" o título "Oficina GPT".
- Refatorar o botÁo "Nova Conversa" injetando transições de scale (`active:scale-95`) e animações no ícone de "Plus".
- Implementar paginaçÁo simulada no Histórico: Mostrar apenas as últimas 5 conversas, ocultar o restante, adicionar um botÁo de expansÁo ("Ver mais X conversas...").
- Adicionar opçÁo de "Renomear" no menu/botões em cada item do histórico (Hover action ao lado do botÁo de deletar).

**Frente 2: NavegaçÁo e Logs (`logs.motor.tsx`, `logs.agente.tsx`, `configuracoes.tsx`)**
- Adicionar um botÁo padrÁo `← Voltar` (com Lucide ArrowLeft) apontando para `/agente` no topo destas telas.
- Refatorar completamente a listagem do `logs.motor.tsx`: 
  - Usar um componente de Accordion nativo ou `<details>/<summary>` (Tailwind estilizado).
  - Dividir o visual em `Resumo do Step`, `Input (Request)`, `Output (Response)` e metadados.
  - Payloads renderizados dentro das abas recolhidas para nÁo poluir a view geral.

**Frente 3: Auto-titulaçÁo e Dashboard de Custos**
- **Auto-Title:** Interceptar a primeira mensagem do usuário via Hook ou na resposta do Agente para invocar um micro-LLM (flash-lite ou chamada rapida via Edge Function) que resuma a mensagem em até 4 palavras, atualizando a `conversation` na tabela `chat_conversations`.
- **Nova Tela (Custos):** Criar `src/routes/custos.tsx` (Dashboard). 
  - Gráficos ou listagem de métricas divididas entre "ConciliaçÁo" e "Chat".
  - Seletor de período (Mês Atual, Semana, Hoje).
  - Requisitará uma nova tabela ou o uso da existente (os logs atuais ou uma nova `usage_logs`). *Para MVP e segurança, usaremos os dados já disponíveis em `bot_logs` caso tenham custos/tokens anotados, ou mockaremos a casca para uma futura integraçÁo total com Claritas/LLM usage.*

## Contratos de Dados
- **Tabela `chat_conversations`:** Já possui o campo `title`. Será criado o fluxo de atualizaçÁo (Update) desse campo a partir de uma mutaçÁo frontend ou RPC Supabase.
- **Tabela `usage_logs` (Nova - a avaliar):** Se nÁo existir uma tabela de uso para custos de token por requisiçÁo, uma migraçÁo será necessária, ou faremos a UI primeiro injetando os dados de contexto de `bot_logs`. 
  - *DecisÁo:* Faremos a UI da tela de custos preparada para receber os dados, lendo os metadados agregados na UI ou consumindo `bot_logs`.

## API / Interface
- Componente `Sidebar` modificado com estado de `showAllHistory` (boolean).
- Novo componente de Accordion LogCard para a tela de log do motor.
- Nova página/rota Tanstack `src/routes/custos.tsx`.

## Risco Principal
- O "Auto-Title" requer que a IA execute uma chamada paralela sem interromper o fluxo do Chat stream principal. Precisamos tratar a concorrência no `useChat` ou delegar para a Edge Function de forma fire-and-forget.
- Ajuste das margens do AppShell vs App Header exige validaçÁo VLM para checar se o overlap sumiu.
