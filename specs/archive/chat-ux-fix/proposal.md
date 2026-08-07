# Proposal: Chat UX e Comportamento da IA (chat-ux-fix)

## Problema
O chat do "Oficina GPT" na rota `/agente` sofre de diversas deficiências de UI/UX e comportamento:
1. **UI:** Mensagens nÁo possuem formato de balÁo, nÁo distinguindo claramente IA (esquerda) do Usuário (direita). O input exibe seletores de modelos confusos e em inglês (GPT 5.5, Opus, etc). 
2. **UX de Processamento:** Quando a IA invoca tools remotas, nÁo há indicaçÁo ("pensando") visual, parecendo que a tela travou.
3. **Comportamento da IA:** A IA tenta buscar dados no Bot remoto para perguntas de conciliaçÁo financeira local, falha, e devolve mensagens de erro descontextualizadas em vez de priorizar o banco de dados local. Além disso, questiona o usuário em vez de proativamente gerar resumos para perguntas vagas.
4. **Erros de Auth:** O chat dispara requisições para `/auth/v1/token?grant_type=password` com payloads incorretos na montagem ou na chamada de tools (como áudio/anexos), ignorando a sessÁo já existente.

## SoluçÁo Proposta
1. **Frontend UI:**
   - Refatorar `MessageList.tsx` para renderizar balões de chat (Usuário à direita, IA à esquerda).
   - Refatorar `PromptInput.tsx` para remover o dropdown de modelos (fixar "ChatGPT (ConciliaMec)") e introduzir o seletor de Profundidade: `Low`, `Medium`, `Max`.
   - Adicionar estado visual de "Pensando / Consultando..." enquanto aguarda resoluçÁo de tools.
2. **Comportamento e Fallback (Prompt / Tool logic):**
   - Ajustar o System Prompt da Edge Function (ou do backend) para alterar a ordem de resoluçÁo: prioridade absoluta para dados locais (Supabase).
   - Ensinar a IA a relatar dados locais disponíveis mesmo quando a API externa (Bot) falhar, sem interromper o fluxo com erro genérico.
3. **AutenticaçÁo:**
   - Limpar a inicializaçÁo do Supabase no Frontend, removendo tentativas explícitas de re-autenticaçÁo manual em componentes de Upload e Chat, reutilizando a sessÁo JWT do `auth.getSession()`.

## Contratos de Dados
- **Configurações:** Possível leitura de preferências da profundidade no Client (mantida em state local ou Zustand, passada para a chamada do LLM).
- Nenhuma alteraçÁo no Schema de banco de dados, apenas uso correto do token JWT nas requisições.

## API / Interface
- O payload de envio da mensagem para a Edge Function precisará incluir o nível de esforço (`effort` = Low | Medium | Max) para que a IA decida quantas tools acionar.

## Features Existentes Impactadas
- Rota `/agente`
- Componente `PromptInput` e `MessageList`

## Risco Principal
- Quebrar o parseamento do Markdown do ReactMarkdown ao embutir os textos nos balões.
- A remoçÁo da re-autenticaçÁo explícita pode revelar que o Token do JWT nÁo estava sendo adequadamente renovado, exigindo atençÁo no middleware de auth.
