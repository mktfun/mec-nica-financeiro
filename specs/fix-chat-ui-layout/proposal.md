# Proposal: Melhorias Visuais e Refatoração UI do Chat (fix-chat-ui-layout)

## Problema
A interface atual do Agente de IA está visualmente inconsistente com o design system principal da aplicação (Mecânica Popular - Zinc-950). O usuário reportou problemas visuais explícitos via screenshot:
1. **[CRÍTICO - Vermelho]**: O cabeçalho secundário "Conectado ao ConciliaMec IAS" no topo da área do chat é redundante e quebra o minimalismo. Deve ser excluído, e o layout afetado (margens, borders) deve ser ajustado.
2. **[AMARELO]**: Os seguintes elementos precisam de refatoração para se alinharem ao design premium e paleta atual (`var(--bg-canvas)`, `var(--bg-surface)`, `var(--text-primary)`, fontes Inter/Outfit):
   - Header do Sidebar ("Oficina GPT Central IAS").
   - Botão "Nova Conversa" (precisa de estilização mais limpa e feedback visual melhor).
   - Lista do Histórico (espaçamentos, hover effects, highlight do estado ativo).
   - Links ancorados na base ("Configurações", "Log do Agente IA", "Log do Motor").
   - Empty State ("Como posso ajudar?") centralizado.
   - Componente `PromptInput` flutuante no rodapé, que atualmente usa cores como `bg-card` e `text-foreground` (shadcn) e precisa usar o CSS Variables globais do projeto.

## Solução Proposta
1. Excluir o bloco `Header Limpo` em `src/routes/agente.tsx`.
2. Refatorar a estilização da Sidebar (cores, paddings, hover states) para usar exclusivamente variáveis CSS (`var(--bg-surface-elevated)`, `var(--border-subtle)` etc.).
3. Refatorar o componente `PromptInput.tsx` para abandonar variáveis Shadcn (`bg-card`, `text-foreground`, `bg-accent`, `ring-ring`) e usar o design system local (`bg-[var(--bg-canvas)]`, `text-[var(--text-primary)]`, etc.), melhorando o input, select de modelos e dropdowns.
4. Ajustar as fontes para o padrão do projeto (geralmente Outfit ou Inter conforme `index.css`).

## Contratos de Dados
- **Nenhum banco de dados ou RLS será tocado.** Trata-se puramente de uma refatoração de UI/CSS.

## API / Interface
- Nenhuma API será tocada. As props dos componentes permanecem as mesmas. Apenas classes do Tailwind serão modificadas.

## Features Existentes Impactadas
- Componente da Página: `AgentePage` (`src/routes/agente.tsx`).
- Componente do Input: `PromptInput` (`src/components/chat/PromptInput.tsx`).
(Não deve impactar a funcionalidade do chat).

## Risco Principal
- O componente `PromptInput` possui muita lógica interna de animação (framer-motion-like CSS, refs, resizes). Tocar nas classes do Tailwind requer precisão para não quebrar o layout flutuante (`absolute`, `inset`, `z-index`) nem as transições `transition-all`.
