# Design: Nova Interface do Chat e ResoluçÁo de Ferramentas (chat-ui-minimalist)

## Arquitetura Técnica
1. **Fluxo de Chat Frontend:**
   - Usuário digita e submete no `PromptInput`.
   - `agente.tsx` chama a Edge Function via `supabase.functions.invoke('ai-chat')`.
   - `MessageList.tsx` renderiza mensagens. Caso haja `mcpLogs` anexados, eles serÁo mapeados em um componente compacto tipo "collapsible" ou com ícone giratório (spin) para denotar o raciocínio.
2. **Fluxo da Tool (Backend):**
   - `generateText` detecta a intençÁo de consultar OS.
   - A tool `consulta_detalhes_os` é disparada.
   - A edge function executa `supabaseClient.from('os').select('*').eq('os_number', params.osNumber)`.
   - Retorna o payload à IA para formular a resposta.

## Componentes / Hooks / Funções
- `src/components/chat/PromptInput.tsx` **[NOVO]**: O super-componente fornecido pelo usuário. Substituirá o `PromptBox`.
- `src/components/chat/MessageList.tsx` **[MODIFICAR]**: Incluir estado para exibir blocos do tipo `<think>` ou execuções de ferramentas (tool logs).
- `supabase/functions/ai-chat/index.ts` **[MODIFICAR]**: Adicionar a tool `consulta_detalhes_os` à lista de tools expostas para o modelo.

## Fluxo de UI
1. O usuário abre o Agente e vê o prompt no estilo flutuante expansível.
2. Ao digitar e pressionar "Enter" com a seta para cima, a mensagem sobe.
3. A bolha de resposta do assistente aparece imediatamente, com um bloco translúcido dizendo "Consultando Ordem de Serviço #1763..." com um spinner sutil.
4. Ao concluir, o bloco contrai (minimalista) e a resposta do modelo é exibida.
Restrições: Fonte Inter/Outfit, cores Zinc/Dark.

## Cenários de VerificaçÁo (SCAN → INFER → VERIFY → FIX)
- Cenário 1: "Qual a situaçÁo da OS 1763?" → IA deve acionar a tool de detalhe de OS, retornar dados da base local e compor resposta correta (nÁo deve mais dizer que nÁo tem acesso).
- Cenário 2: Envio de prompt longo → O textarea do `PromptInput` deve crescer animadamente, aplicando blur/scroll de forma fluida sem quebrar layout da página `agente.tsx`.
