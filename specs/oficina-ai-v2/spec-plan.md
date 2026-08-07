# Spec Plan: Oficina AI v2 (oficina-ai-v2)

## Tasks

- [ ] [FRONTEND] Ajustar `PromptInput.tsx`: alterar placeholder, adequar lista de `models` para refletir os LLMs (Flash, Pro) e limpar selects desnecessários.
- [ ] [FRONTEND] Ajustar `MessageList.tsx`: remover mock estático "Consultando Oficina Inteligente/Verificando relatórios locais" e substituir por loader neutro animado.
- [ ] [BACKEND] Refatorar Edge Function `ai-chat/index.ts`: Extrair `supabaseClient.from('mcp_logs').insert` para um helper central e aplicá-lo em todas as ferramentas (`consulta_contas_pagar_oficina`, `consulta_agenda_oficina`, etc).
- [ ] [BACKEND] Refatorar Edge Function `ai-chat/index.ts`: Limpar e granularizar o System Prompt (inspirado no padrÁo do `renew-assist-pro`).
- [ ] [TEST] Verificar painel de Telemetria (Logs) se as consultas ao MCP estÁo sendo registradas no banco local do Supabase.
- [ ] [TEST] Interagir no chat e validar UX visual e fluxo de chamadas.
