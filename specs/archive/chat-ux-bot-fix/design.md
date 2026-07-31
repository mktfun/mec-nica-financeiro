# Design: UX do Chat e Integração com VPS Bot (chat-ux-bot-fix)

## Arquitetura Técnica
1. **Edge Function (`ai-chat/tools-oficina.ts`):** 
   Intercepta a chamada da ferramenta (toolCall). Se `settings.bot_url` for vazio, assume `https://bot.tork.services`. Verifica `response.ok`. Se falhar, retorna um erro JSON rastreável `{ error: "HTTP 401 - Unauthorized. Verifique o Token da API." }` que será lido pelo Agente LLM para dar um diagnóstico honesto ao usuário, ao invés de apenas "Ocorreu um erro".
2. **Frontend (`MessageList.tsx`):**
   Utilização de utilitários Tailwind dark-mode premium (`bg-zinc-900/40`, `border-zinc-800/60`, `text-zinc-200`) e animações spring. O spinner (typing indicator) não usará simples delays de opacidade, mas sim uma animação em cadeia moderna para simular inteligência e processamento, similar a produtos de ponta (Cursor/Claude).

## Interfaces TypeScript
Nenhuma nova interface. Aproveitaremos `Message` já exportada pelo SDK/Local.

## Componentes / Hooks / Funções
- `src/components/chat/MessageList.tsx`: Redesign completo dos balões. Avatar do "Oficina GPT" repensado para um ícone minimalista e não um azul genérico. Balão do Usuário em estilo bolha sólida; balão da IA sem fundo fechado, com tipografia em evidência (estilo Chat IDE moderno).
- `supabase/functions/ai-chat/tools-oficina.ts`: Atualização das funções `consulta_os_detalhe_completo`, `consulta_contas_pagar_oficina`, etc., adicionando logs e URL fix.

## Fluxo de UI
1. Usuário envia prompt usando o novo input liso.
2. O "thinking state" (3 pontinhos animados) entra com uma transição suave.
3. Quando o `fetch` responde (stream ou final), o balão da resposta entra usando um efeito de slide vertical orgânico.
4. Qualquer tool chamada exibirá o painel "MCP" retrátil minimizado para o usuário debugar caso algo falhe.

## Infra / Deploy (se aplicável)
- O Edge Function exigirá re-deploy no ambiente remoto via CLI: `supabase functions deploy ai-chat` (tarefa executada pós-commit da alteração do TypeScript).

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1:** Consulta de "contas a pagar para amanhã" sem configuração prévia no DB → O script fará append de URL usando `bot.tork.services`, requisita a Cloudflare, obtém os dados json se autorizado.
- **Cenário 2:** Renderização de mensagens complexas no UI → Os balões preservam legibilidade, markdown formata as listas elegantes sem quebrar o padding arredondado.
