# Spec Plan: Melhorias Visuais e RefatoraçÁo UI do Chat (fix-chat-ui-layout)

## Tasks

- [x] [FRONTEND] Editar `src/routes/agente.tsx`: Excluir o bloco do cabeçalho "Conectado ao ConciliaMec IAS" (linha 346-352).
- [x] [FRONTEND] Editar `src/routes/agente.tsx`: Refatorar os estilos do Sidebar (Header, botÁo Nova Conversa, Histórico e Base) para alinhar à paleta global `var(--bg-canvas)`, `var(--bg-surface-elevated)`, `var(--text-primary)`, `var(--border-subtle)`.
- [x] [FRONTEND] Editar `src/routes/agente.tsx`: Refatorar as cores e alinhamento do componente "Empty State" (Como posso ajudar?).
- [x] [FRONTEND] Editar `src/components/chat/PromptInput.tsx`: Substituir classes Shadcn soltas (ex: `bg-card`, `bg-background`, `text-foreground`, `text-muted-foreground`, `bg-muted`) por variáveis do design system `bg-[var(--bg-canvas)]`, `bg-[var(--bg-surface)]`, `text-[var(--text-primary)]`, etc.
- [x] [FRONTEND] Editar `src/components/chat/PromptInput.tsx`: Consertar as cores do Menu Dropdown de Modelos e Tooltips para terem alto contraste com o fundo escuro.
- [x] [TEST] Verificar no navegador (localhost:8080/agente) se as modificações geraram a UI minimalista esperada sem quebrar as animações.
