# Design: CorreçÁo de Reatividade do Chat e RegressÁo de UI (fix-chat-reactivity)

## Arquitetura Técnica
**Problema Atual:**
UI (PromptInput) -> `sendMessage` (async) -> `append()` (throws Exception) -> Thread Assíncrona Aborta -> DB `insert()` nunca executa -> F5 nÁo carrega a mensagem porque ela sumiu.

**Novo Fluxo Resiliente:**
1. UI (PromptInput) dispara `sendMessage()`.
2. GeraçÁo assíncrona da Promise de DB: `supabase.from('messages').insert(...)`
3. A Promise do DB segue em background usando `.then()` e `.catch()` para toast de falha na nuvem, NÁO bloqueando a linha de baixo com `await`.
4. Bloco `try { await append(...) } catch (e) { toast(...) }` executa logo abaixo para otimismo na UI e acionamento da Edge Function.
5. Se a Edge Function falhar (400), o bloco `catch` exibe o toast, a UI nÁo quebra, e como o insert já foi disparado, o F5 recuperará a pergunta do usuário e deixará claro que a Edge Function caiu.

## Interfaces TypeScript
Nenhuma mudança de interface.

## Componentes / Hooks / Funções
**`src/routes/agente.tsx`:**
- Refatorar a funçÁo `sendMessage` para aplicar o padrÁo Non-Blocking DB Fallback.
- Revisar `onFinish` ou `onError` para injetar robustez de estado.

**`src/components/chat/PromptInput.tsx`:**
- Adicionar um estado de tolerância ao `isLoading`. Se o form for desabilitado pelo `isLoading`, e demorar mais de 15 segundos ou der erro, permitir que o usuário digite novamente (embora o `useChat` deva lidar com o reset, a refatoraçÁo do `agente.tsx` cobrirá a principal fonte do erro).

**`src/components/layout/Sidebar.tsx`:**
- Restaurar os links `Log do Agente IA` e `Log do Motor de ConciliaçÁo` no menu lateral principal (se for onde a regressÁo ocorreu, conforme vídeo do usuário "a tela crashou de agente de ia ... as porras das opções no MENU LATERAL DO AGENTE DE IA ta no menu lateral DO SISTEMA ta erradissimo"). 
*Aviso: O usuário reclama que os logs do agente foram movidos PRO MENU LATERAL DO SISTEMA (Sidebar.tsx global) ou vice-versa. Analisar onde estÁo e voltar exatamente como o usuário solicitou (os logs DEVEM estar isolados).*

## Cenários de VerificaçÁo (SCAN → INFER → VERIFY → FIX)
- **Cenário 1:** Usuário nÁo tem chaves de API na tabela `ai_settings` -> Envia mensagem "Teste" -> Mensagem sobe pra tela e pro Supabase -> Retorna erro 400 da Edge Function -> Mensagem do usuário fica persistida no BD (aparece com F5).
- **Cenário 2:** Validar se no `agente.tsx` os logs sumiram e no menu global eles também sumiram e restaurá-los apropriadamente.
