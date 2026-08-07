# Spec Plan: Refinamentos UX do Agente e Novo Módulo de Custos (agente-refinements)

## Tasks

### UI Base & Sidebar
- [x] [FRONTEND] `agente.tsx`: Adicionar espaçamento (ex: `pt-16` no wrapper absoluto ou ajuste no AppShell) para impedir sobreposição do Header sobre "Oficina GPT".
- [x] [FRONTEND] `agente.tsx`: Refatorar botão "Nova Conversa" para ter animação/escala fluida.
- [x] [FRONTEND] `PromptInput.tsx`: Alterar a cor da borda ao focar de `border-[var(--color-accent-teal)]` para a cor neutra do Zinc System (ex: `border-[var(--text-secondary)]`).

### Gestão de Histórico (Paginação & Rename)
- [x] [FRONTEND] `agente.tsx`: Limitar renderização inicial a 5 conversas e adicionar botão "Ver mais X conversas" na lista de histórico.
- [x] [FRONTEND] `agente.tsx`: Adicionar botão de lápis (Editar) ao lado da Lixeira de cada conversa. Implementar Prompt/Modal simples nativo para renomear, atualizando via Edge Function ou supabase admin function existente, ou local storage state.

### Auto-Titulação (LLM)
- [x] [FRONTEND] Implementar chamada a LLM secundário (ou endpoint de gerar título) que dispara assim que o bot responde à primeira mensagem (se o título for vazio ou "Nova Conversa"), renomeando a sessão atual automaticamente.

### Navegação (Botões de Voltar)
- [x] [FRONTEND] `logs.agente.tsx`: Adicionar botão `< Voltar` para `/agente`.
- [x] [FRONTEND] `logs.motor.tsx`: Adicionar botão `< Voltar` para `/agente`.
- [x] [FRONTEND] `configuracoes.tsx`: Adicionar botão `< Voltar` para `/agente`.

### Refatoração de Logs do Motor
- [x] [FRONTEND] `logs.motor.tsx`: Trocar o dump bruto JSON `<pre>` por um layout tipo Accordion, separando claramente o Input/Output e fechado por padrão para reduzir poluição visual.

### Nova Rota: Tela de Custos
- [x] [FRONTEND] Criar nova tela `src/routes/custos.tsx` focada no cálculo de uso do Agente IA e Conciliação, contendo Dashboard com métricas.
- [x] [FRONTEND] `__root.tsx` ou Sidebar do app principal: Link para acessar a aba de Custos (pode ficar nas configurações ou sidebar lateral).

- [x] [TEST] Verificar os cenários definidos no `design.md`.
