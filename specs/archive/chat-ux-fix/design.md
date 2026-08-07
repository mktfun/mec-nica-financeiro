# Design: Chat UX e Comportamento da IA (chat-ux-fix)

## Arquitetura Técnica
O fluxo modificado mantém a Edge Function `ai-chat` inalterada, porém o payload de disparo será atualizado.
`PromptInput` enviará o payload:
```json
{
  "messages": [...],
  "effort": "Low | Medium | Max"
}
```

O Frontend receberá tool invocations durante o stream e renderizará componentes temporários (Spinners ou textos "Consultando Oficina Inteligente via bot...").

## Componentes / Hooks / Funções
1. **`src/components/chat/PromptInput.tsx`:**
   - RemoçÁo da propriedade `models` e inserçÁo estática de "ChatGPT (ConciliaMec)".
   - CriaçÁo de um seletor visual Dropdown contendo "Low", "Medium", "Max".
   - Ajuste do placeholder e ícones (manter upload, áudio e adicionar ícone opcional).
2. **`src/components/chat/MessageList.tsx`:**
   - Wrapper de mensagens em Flexbox com justify (end para User, start para IA).
   - InserçÁo do Avatar `Bot` ou imagem estática (Oficina GPT) à esquerda.
   - AplicaçÁo de `bg-surface-elevated` e bordas arredondadas nos balões da IA.
3. **`src/hooks/useAuth.ts` ou chamadas relativas ao Supabase Client:**
   - RemoçÁo de qualquer tentativa explícita de `supabase.auth.signInWithPassword` em componentes de inicializaçÁo nÁo pertinentes.

## Fluxo de UI
1. O usuário visualiza o chat. 
2. A mensagem do usuário é enviada e posicionada à direita com cor clara.
3. Surge um placeholder "Pensando..." ou o trace da Tool (ex: `toolCall` com nome "consultando_conciliamec").
4. A mensagem final entra à esquerda em um balÁo escuro e legível.

## Cenários de VerificaçÁo
- **Cenário 1:** Envio de pergunta vazia -> Input bloqueado.
- **Cenário 2:** A Edge Function reporta erro 400 da Oficina -> A IA deve responder graciosamente com o conteúdo local em formato limpo.
- **Cenário 3:** Usuário tenta upload ou enviar áudio -> NÁo deve lançar erro 400 de auth no console (sessÁo aproveitada).
