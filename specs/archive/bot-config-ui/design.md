# Design: Bot Config UI & MCP Agent Integration (bot-config-ui)

## Arquitetura Técnica
```
[AgentePage UI]
  ├─ Aba "Bot & MCP"
  │   ├─ Configurações (URL + API Key) → Salva em ai_settings via RPC/Supabase
  │   ├─ BotÁo Testar → Dispara fetch() para <URL>/health e <URL>/api/sync
  │   └─ Bot Logs → Real-time query na tabela bot_audit_logs
  │
  └─ Aba "Chat" (LLM Integration)
      └─ System Prompt instruído com ferramentas disponíveis (MCP).
      └─ LLM pode gerar um block JSON especial ou tool_call que a UI intercepta.
      └─ UI invoca o endpoint remoto (ex: POST /api/sync) com as credenciais cadastradas.
```

## Interfaces TypeScript

```typescript
// ExtensÁo de src/hooks/useAiSettings.ts
export interface AiSettings {
  id?: string;
  provider: string;
  model: string;
  api_key?: string;
  bot_url?: string;
  bot_api_key?: string;
}

// Bot Log Interface
export interface BotAuditLog {
  id: string;
  bot_name: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  payload: any;
  created_at: string;
}
```

## Componentes / Hooks / Funções
1. **Migration SQL**: Adicionar `bot_url` e `bot_api_key` na tabela `ai_settings`.
2. **`useAiSettings` Hook**: Atualizar a `select` e `upsert` para incluir as duas novas colunas.
3. **`AgentePage` (src/routes/agente.tsx)**:
   - Adicionar uma nova aba `bot` (Bot & MCP).
   - SessÁo 1: Inputs para `bot_url` (default `https://bot.tork.services`) e `bot_api_key`.
   - SessÁo 2: BotÁo `Testar ConexÁo`.
   - SessÁo 3: Tabela/lista de Logs consumindo `bot_audit_logs`.
4. **LLM Tool Invocation**:
   - Para que o IA chame o bot, o prompt precisará instruir o bot a retornar um comando como `[TOOL_CALL: sync_bot_now]`. A interface intercepta isso e faz a requisiçÁo pro backend/bot.

## Fluxo de UI
1. Usuário acessa aba "IA" no menu principal.
2. Clica na nova sub-aba "Bot & MCP".
3. Preenche a URL e a API Key, clica em "Salvar".
4. Clica em "Testar" → Toast "Bot respondeu com sucesso!".
5. Na listagem de logs abaixo, o usuário vê histórico do Playwright (trazidos da VPS).

## Cenários de VerificaçÁo (SCAN → INFER → VERIFY → FIX)
- Cenário 1: **Teste de ConexÁo com Sucesso** → Inserir URL válida e Key válida → Clicar em testar → Sucesso.
- Cenário 2: **Teste sem Key** → Inserir URL válida sem Key → Clicar em testar → Retornar Unauthorized.
- Cenário 3: **MCP Acionamento** → No chat de IA, pedir "Rode a automaçÁo da oficina inteligente agora" → O LLM devolve o comando, o frontend intercepta e bate no endpoint configurado.
