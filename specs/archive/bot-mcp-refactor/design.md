# Design: Refatoração do Bot para API de Consulta MCP (bot-mcp-refactor)

## Arquitetura Técnica

```
[ Agente (React Frontend) ]
        | (Envia Mensagem do Chat)
        v
[ Edge Function: ai-chat ]
        | 1. Consulta 'ai_settings' do Supabase para obter 'bot_url' e 'bot_api_key'.
        | 2. Inicializa o provedor do LLM (OpenAI/Anthropic/Google).
        | 3. Disponibiliza as MCP Tools (ex: 'consulta_os_semana') configuradas no AI SDK.
        |
        | Se a IA decidir invocar 'consulta_os_semana':
        | -> A IA emite a chamada de ferramenta.
        | -> A função 'execute' da tool envia o 'bot_url' e 'bot_api_key' repassados por parâmetro para o Bot.
        v
[ Edge Function: mcp-proxy (ou lógica in-line no ai-chat) ]
        | 4. Dispara POST para '{bot_url}/v1/jobs' passando { action, params } e header 'X-Api-Key'.
        | 5. Faz o polling do job no bot via GET '{bot_url}/v1/jobs/:id' até sucesso/falha.
        | 6. Devolve o JSON parseado de volta para a Edge Function principal.
        v
[ Crawler Playwright Remoto ]
        | 7. Faz a raspagem real.
```

## Interfaces TypeScript
*Nenhuma nova interface de banco de dados, usaremos as existentes de `ai_settings`.*

Payload de `invokeMCP` na camada Deno:
```ts
interface InvokeMCPPayload {
  action: string;
  params: any;
  config: {
    mcpUrl: string;
    apiKey: string;
  };
}
```

## Componentes / Hooks / Funções
1. **`src/routes/agente.tsx`**: Remover regex de `[BOT_SYNC:*]` e voltar a depender do objeto `toolResults` que é devolvido pelo backend de forma fluída.
2. **`supabase/functions/ai-chat/index.ts`**: Atualizar as chamadas de `invokeMCP` para injetar `settings.bot_url` e `settings.bot_api_key` se presentes. 
3. **`supabase/functions/mcp-proxy/index.ts`**: Ler `mcpUrl` e `workerKey` vindos de `req.json()` prioritariamente. Somente recorrer a `Deno.env` como *fallback*.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1:** Usuário pergunta no chat "Busque as OS de hoje". A IA chama a tool `consulta_os_semana`. A `mcp-proxy` utiliza a URL e Key customizadas do Supabase para bater na VPS, o crawler roda, e a resposta é devolvida sem intervenção de gambiarras em string no frontend.
- **Cenário 2:** Usuário não cadastrou `bot_url` na tabela `ai_settings`. O `ai-chat` tenta usar o fallback ou exibe erro: "Ferramenta de scraping indisponível: configure a URL do bot na aba 'Bot & MCP'."
