# Proposal: Nova Interface do Chat e Resolução de Ferramentas (chat-ui-minimalist)

## Problema
O usuário relatou dois problemas distintos no agente de Inteligência Artificial:
1. **Falta de Ferramenta Contextual:** O bot falhou em consultar a Ordem de Serviço #1763 por ausência de uma ferramenta (tool) que busque os detalhes de uma OS específica pelo seu número.
2. **Design da Interface de Chat:** A interface de prompt atual não atende à estética desejada. O usuário requisitou a implementação de um novo componente `PromptInput` com animações fluídas (Framer Motion feel) e um visual mais sofisticado. Além disso, as mensagens em que a IA chama ferramentas (Tools / MCP) precisam ser exibidas de maneira "minimalista", semelhante a um bloco expansível de `<think>` ou "tool execution".

## Solução Proposta
1. **Frontend (UI):**
   - Substituir o componente `PromptBox.tsx` pelo novo `PromptInput.tsx` fornecido.
   - Atualizar a exibição no `MessageList.tsx` para interceptar `mcpLogs` (ou `toolCalls`) e renderizá-los em um bloco minimalista recolhível antes da resposta final da IA.
2. **Backend (Edge Function):**
   - Na Edge Function `ai-chat`, adicionar a tool `consulta_detalhes_os` ao dicionário de `mcpTools`. Essa ferramenta não precisa ir até o MCP, podendo fazer um `.select()` direto na tabela `os` do Supabase local (que é mantida sincronizada) garantindo velocidade e precisão.

## Contratos de Dados
- Nenhuma tabela nova será criada.
- A função `ai-chat` utilizará o client existente do Supabase para fazer um `SELECT * FROM os WHERE os_number = :number`.

## API / Interface
- O `PromptInput` requer uma prop `onSubmit(value, meta)`. A chamada de `sendMessage` no `agente.tsx` precisará ser ajustada para aceitar essa assinatura.
- O componente de mensagem receberá e exibirá estados como "Analisando dados...", "Consultando OS...", etc.

## Features Existentes Impactadas
- **Painel do Agente (`src/routes/agente.tsx`)**: O layout terá que ser adaptado à nova estrutura de envio de mensagens do `PromptInput`.

## Risco Principal
- O novo componente `PromptInput` lida com anexos locais (Files) e áudio/voz de maneira complexa, simulando gravações para "sandbox demo". Na versão de produção, essas simulações não integradas poderão falhar. Para mitigar, conectaremos a prop de texto base e ignoraremos anexos temporariamente ou emitiremos placeholders no back-end.
