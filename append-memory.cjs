const fs = require('fs');
const path = require('path');

const uiPath = path.join(__dirname, '.agent/memory/ui.md');
const supabasePath = path.join(__dirname, '.agent/memory/supabase.md');
const featuresPath = path.join(__dirname, 'spec/global/features.md');

const uiAppend = `\n\n## [2026-07-29] — [Feature ID: chat-ux-bot-fix]

**Contexto:** O design do chat (MessageList.tsx) foi modernizado para seguir o estilo estético de PromptInput.tsx e o loading state estático foi trocado por um spring-bouncing.
**Regra aprendida:** Use framer-motion transições (spring, stiffness 260, damping 20) invés de CSS estático em elementos interativos pesados.
**Risco identificado:** Evitar vazamento de cores de glassmorphism em telas mobile que quebrem legibilidade (Zinc-900 fixo usado com borders).
**Não fazer:** Não misture backgrounds transparentes sem uma border definida em balões de chat.
`;

const supabaseAppend = `\n\n## [2026-07-29] — [Feature ID: chat-ux-bot-fix]

**Contexto:** A configuração de falha de conexão do agente MCP foi mapeada para retornar payload JSON explícito com a falha.
**Regra aprendida:** Edge Functions (tools-oficina.ts) que acessam bot externo da VPS exigem fallbacks com Deno.env ou bot.tork.services em caso de settings ausentes.
**Risco identificado:** A falta da chave API do Cloudflare Tunnel ou do token da VPS causaria erro 401 que quebra o agente. O fail-safe garante log amigável.
**Não fazer:** Nunca retorne "Erro inesperado" no edge function; faça fetch.ok check e retorne { error: "HTTP STATUS - Detalhe" } explícito.
`;

const featuresAppend = `\n- **Bot de IA / MessageList (chat-ux-bot-fix):** Frontend MessageList reconstruído com framer-motion (spring bounce) e suporte robusto a fetch do VPS bot via Edge Functions.`;

if(fs.existsSync(uiPath)) fs.appendFileSync(uiPath, uiAppend);
if(fs.existsSync(supabasePath)) fs.appendFileSync(supabasePath, supabaseAppend);
if(fs.existsSync(featuresPath)) fs.appendFileSync(featuresPath, featuresAppend);
console.log('Appended memory and features');
