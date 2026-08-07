# Proposal: Oficina AI v2 - Refatoração de UX e Edge Function (oficina-ai-v2)

## Problema
A experiência atual com o Agente de IA (Oficina GPT) está sofrendo de vários problemas de UX e de rastreabilidade:
1. **UX do Input**: O texto de placeholder é muito longo e quebra o layout. O seletor de modelos está hardcoded ("ChatGPT", "Medium") em vez de permitir a seleção real de tiers de IA (GPT-3.5/Flash, GPT-4o-mini, GPT-4o).
2. **UX de Execução (Mock)**: O estado de `isLoading` na UI do chat exibe um mock estático e "feio" ("Consultando Oficina Inteligente...", "Verificando relatórios locais") que não reflete a execução real das tools e passa uma sensação de sistema falso.
3. **Telemetria Quebrada**: As novas tools externas (MCP) criadas na Edge Function (ex: `consulta_contas_pagar_oficina`, `consulta_agenda_oficina`) não estão gravando logs no Supabase (`mcp_logs`), o que impede a auditoria no painel de Telemetria do sistema.
4. **Prompt Monolítico**: A Edge Function `ai-chat` usa um system prompt muito extenso com hardcoding de 10 lojas e regras complexas empilhadas, o que confunde o LLM, em contraste com a abordagem modular ("COMPLETISSIMO") exigida como referência.

## Solução Proposta
1. **Refatoração do PromptInput**: Limpar o placeholder e reestruturar o seletor de modelos para espelhar os tiers de inteligência ("Rápido", "Equilibrado", "Avançado"), passando essa configuração dinamicamente para o backend.
2. **Refatoração do MessageList**: Remover o mock estático do `isLoading` e implementar um feedback visual responsivo que pode, no futuro, consumir os `tool_calls` parciais retornados pela Vercel AI SDK ou pelo menos exibir um loading minimalista padrão Apple/OpenAI sem fingir steps textuais estáticos.
3. **Correção da Telemetria (Edge Function)**: Envolver o código das chamadas externas (fetch para o bot) em um wrapper que execute o `supabaseClient.from('mcp_logs').insert(...)`, assim como já é feito na `consulta_os_detalhe_completo`.
4. **Modularização do System Prompt**: Limpar o system prompt atual da Edge Function, removendo o hardcoding excessivo e tornando as ferramentas mais auto-descritivas (granular prompt design).

## Contratos de Dados
- Tabela `mcp_logs` (já existente): Passará a receber inserts garantidos de TODAS as tools externas (ação, params, resultado).
- Não haverá criação de novas tabelas.

## API / Interface
- Modificação no Componente `PromptInput` (React).
- Modificação no Componente `MessageList` (React).
- Modificação na Edge Function `ai-chat/index.ts` (Deno).

## Features Existentes Impactadas
- Chat Principal (UX).
- Telemetria de Logs (Supabase).
- Mapeamento de Lojas.

## Risco Principal
- **Regressão na Roteirização de Lojas**: Ao remover o hardcoding de lojas do system prompt, o LLM pode errar o "slug" (ex: mandar "Maua" em vez do ID longo do supabase). Precisaremos garantir que a Edge Function injete essa lista dinamicamente, ou que as tools façam um fuzzy match no back-end.
