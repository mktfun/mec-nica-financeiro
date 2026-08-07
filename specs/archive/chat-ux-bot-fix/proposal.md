# Proposal: UX do Chat e Integração com VPS Bot (chat-ux-bot-fix)

## Problema
1. O design visual dos balões de chat (`MessageList.tsx`) e do indicador de digitação (thinking state) está obsoleto, destoando da interface premium do input recém-criado (`PromptInput.tsx`). A animação é estática, "pesada", e não transmite a fluidez de produtos tech atuais (o framer-motion está subaproveitado).
2. O agente de IA não consegue recuperar dados externos do sistema "Oficina Inteligente" (contas a pagar, agenda, etc). Quando aciona as tools de VPS localizadas em `tools-oficina.ts`, as requisições falham porque o `bot_url` pode estar nulo nas configurações ou a URL está quebrando (`undefined/api/...`). Consequentemente, o bot retorna uma desculpa vaga sobre erro no sistema.

## Solução Proposta
1. **Frontend (UI/UX):** Refatorar `MessageList.tsx` para um visual premium (dark mode elegante, glassmorphism sutil / borders suaves em Zinc), estritamente alinhado com o `PromptInput`. Ajustar animações de entrada (spring physics) e criar um "thinking state" vibrante e orgânico.
2. **Backend (Edge Function):** Refatorar `tools-oficina.ts` para introduzir fallbacks robustos de ambiente (`https://bot.tork.services`) caso o Banco de Dados não forneça a URL via `ai_settings`. Melhorar a captura de erros HTTP para que logs claros de HTTP Status retornem para a IA gerir a frustração do usuário.

## Contratos de Dados
- Nenhuma alteração estrutural no Banco de Dados. O Edge Function usará variáveis de ambiente ou hardcode seguro fallback (`bot.tork.services`) para a integração VPS se `ai_settings` estiver em branco para aquele usuário.

## API / Interface
- `MessageList.tsx`: Melhoria nas props visuais e `framer-motion` variants (usando `ease: [0.175, 0.885, 0.32, 1.275]` para consistência com o Prompt).
- `tools-oficina.ts`: Fallbacks de constantes:
  `const BOT_URL = settings?.bot_url || Deno.env.get('BOT_URL') || 'https://bot.tork.services';`
  `const BOT_API_KEY = settings?.bot_api_key || Deno.env.get('BOT_API_KEY') || '';`

## Features Existentes Impactadas
- Tela do Agente `/agente`
- Módulo de Integração Cloudflare/VPS (Edge Functions)

## Risco Principal
- O risco principal é a chave de API de comunicação com a VPS estar incorreta ou ausente no Edge Function (Deno.env), fazendo a integração externa continuar retornando HTTP 401 Unauthorized. Isso não quebra o sistema local, mas fará com que o Agente continue sem conseguir acessar o financeiro legado da VPS.
