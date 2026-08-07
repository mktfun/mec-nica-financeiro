# Proposal: Streaming de Raciocínio, Logs MCP e Correção Lógica (chat-mcp-debug-ux)

## Problema
O agente parece estar "travado", dando respostas sem sentido ou lentas, e o usuário não consegue auditar as buscas. Isso acontece por 3 motivos críticos:
1. **Falta de Streaming e "Black Box"**: A Edge Function atual usa `generateText` síncrono. A UI (MessageList) fica aguardando toda a resposta da IA e da API externa terminarem em background. O usuário não vê a IA "pensando" nem os "Logs do MCP" acontecendo em tempo real.
2. **Erro Grosseiro de Mapeamento**: A IA não sabe que "Rei do Óleo" é uma franquia e, ao receber "Rei do Óleo Mauá", tentou chutar a loja "Rei do Módulo" (a única que ela achou ter "Rei" no nome). Isso resultou em valores "0,00" para a OS, porque a OS não existia naquela loja.
3. **Contas a Pagar Poluídas**: O robô externo traz todas as contas. O LLM não está instruído a omitir as que possuem status "PAG", poluindo o retorno e gerando tabelas irreais quando o usuário só quer o que está em aberto.

## Solução Proposta
1. **Instalar `@ai-sdk/react` e implementar Streaming**: Substituir o envio manual de mensagens no frontend (em `agente.tsx`) pelo hook `useChat`. Na Edge Function (`index.ts`), trocar `generateText` por `streamText` usando `toDataStreamResponse()`. Isso fará a IA digitar em tempo real e exibir os blocos de ferramentas do MCP enquanto processam.
2. **Correção do Mapeamento "Rei do Óleo" no Prompt**: Adicionar ao `SYSTEM_PROMPT` a regra clara para que a IA associe "Rei do Óleo Mauá" à loja "Maua", evitando buscar OS no "Rei do Módulo".
3. **Filtro Estrito para 'Contas a Pagar'**: Atualizar a descrição da tool `consulta_contas_pagar_oficina` obrigando a IA a descartar do JSON qualquer resultado onde o status for "PAG".

## Contratos de Dados
- Não haverá mudança em tabelas do Supabase.

## API / Interface
- Front-end: `agente.tsx` e `MessageList.tsx` passarão a consumir o hook `useChat` do pacote oficial da Vercel AI, manipulando estados de ferramentas (tool invocations) nativamente.
- Back-end: `supabase/functions/ai-chat/index.ts` usará `streamText` com `maxSteps: 5`.

## Risco Principal
Refatorar a comunicação de Chat Síncrona para Streaming (`useChat`) no `agente.tsx` exige re-escrever como a conversa é salva no banco. Vamos precisar garantir que a mensagem só seja gravada localmente após a stream terminar, utilizando o callback `onFinish` do `useChat`.
