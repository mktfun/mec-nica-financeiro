# Design: Melhorias Visuais e Refatoração UI do Chat (fix-chat-ui-layout)

## Arquitetura Técnica
A alteração será puramente no layout (React/TailwindCSS). Sem fluxos de dados ou integrações backend afetadas.
As variáveis globais de CSS (`var(--bg-canvas)`, `var(--bg-surface)`, `var(--text-primary)`, `var(--border-subtle)`) serão injetadas nas tags `className` dos elementos para que correspondam à estética global Zinc-950 da aplicação.

## Interfaces TypeScript
Nenhuma nova interface. Os contratos de `PromptInput` e `AgentePage` continuam os mesmos.

## Componentes / Hooks / Funções
1. **`src/routes/agente.tsx`**:
   - Remoção do bloco: `<div className="px-6 py-3 flex justify-between items-center z-10 border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]">...</div>`
   - Ajuste das classes do Sidebar:
     - Header do Agente IA e Histórico com estilos padronizados e clean.
     - Hover e estado ativo da lista de histórico mais visíveis e contrastantes (usar fundos sutis).
     - Empty State atualizado para utilizar cores da paleta local de forma vibrante.

2. **`src/components/chat/PromptInput.tsx`**:
   - Substituição massiva das cores hardcoded do Tailwind/Shadcn (ex: `bg-card`, `bg-background`, `text-foreground`, `text-muted-foreground`, `bg-muted`, `border-border`) por variáveis locais.
   - Refatoração dos botões circulares, modais de modelos e ícones para respeitarem `bg-[var(--bg-surface-elevated)]` e `hover:bg-[var(--bg-surface-elevated-hover)]`.

## Fluxo de UI
Restrições visuais do usuário: 
- Deve ser adaptado ao design do sistema (dark mode, minimalista, botões bem definidos).
- O header com o status "Conectado" deve desaparecer.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1**: Renderização inicial da tela `/agente`.
  - Ação: Navegar para `/agente` sem histórico.
  - Resultado esperado: A tela exibe o Sidebar sem header de status, as cores são escuras, com alto contraste.
- **Cenário 2**: Focar no `PromptInput`.
  - Ação: Clicar no campo de input.
  - Resultado esperado: As bordas reagem sutilmente sem quebrar o layout escuro. Os seletores de modelo e menus dropdown seguem o fundo Zinc.
