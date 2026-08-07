# Spec Plan: Refinamentos UX do Agente e Novo Módulo de Custos (agente-refinements)

## Tasks

### UI Base & Sidebar
- [x] [FRONTEND] `agente.tsx`: Adicionar espaçamento (ex: `pt-16` no wrapper absoluto ou ajuste no AppShell) para impedir sobreposiçÁo do Header sobre "Oficina GPT".
- [x] [FRONTEND] `agente.tsx`: Refatorar botÁo "Nova Conversa" para ter animaçÁo/escala fluida.
- [x] [FRONTEND] `PromptInput.tsx`: Alterar a cor da borda ao focar de `border-[var(--color-accent-teal)]` para a cor neutra do Zinc System (ex: `border-[var(--text-secondary)]`).

### GestÁo de Histórico (PaginaçÁo & Rename)
- [x] [FRONTEND] `agente.tsx`: Limitar renderizaçÁo inicial a 5 conversas e adicionar botÁo "Ver mais X conversas" na lista de histórico.
- [x] [FRONTEND] `agente.tsx`: Adicionar botÁo de lápis (Editar) ao lado da Lixeira de cada conversa. Implementar Prompt/Modal simples nativo para renomear, atualizando via Edge Function ou supabase admin function existente, ou local storage state.

### Auto-TitulaçÁo (LLM)
- [x] [FRONTEND] Implementar chamada a LLM secundário (ou endpoint de gerar título) que dispara assim que o bot responde à primeira mensagem (se o título for vazio ou "Nova Conversa"), renomeando a sessÁo atual automaticamente.

### NavegaçÁo (Botões de Voltar)
- [x] [FRONTEND] `logs.agente.tsx`: Adicionar botÁo `< Voltar` para `/agente`.
- [x] [FRONTEND] `logs.motor.tsx`: Adicionar botÁo `< Voltar` para `/agente`.
- [x] [FRONTEND] `configuracoes.tsx`: Adicionar botÁo `< Voltar` para `/agente`.

### RefatoraçÁo de Logs do Motor
- [x] [FRONTEND] `logs.motor.tsx`: Trocar o dump bruto JSON `<pre>` por um layout tipo Accordion, separando claramente o Input/Output e fechado por padrÁo para reduzir poluiçÁo visual.

### Nova Rota: Tela de Custos
- [x] [FRONTEND] Criar nova tela `src/routes/custos.tsx` focada no cálculo de uso do Agente IA e ConciliaçÁo, contendo Dashboard com métricas.
- [x] [FRONTEND] `__root.tsx` ou Sidebar do app principal: Link para acessar a aba de Custos (pode ficar nas configurações ou sidebar lateral).

- [x] [TEST] Verificar os cenários definidos no `design.md`.
