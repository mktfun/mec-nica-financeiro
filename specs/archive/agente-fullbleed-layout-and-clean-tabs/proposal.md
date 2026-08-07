# Proposal: Restauração do Chat Full-Bleed e Navegação Muted Sem Emojis em `/agente` (agente-fullbleed-layout-and-clean-tabs)

## Problema

1. O layout do Chat em `/agente` foi restrito a um container minimizado (`h-[680px] max-w-7xl`), destruindo a experiência original de tela cheia (full-bleed) que aproveitava todo o viewport.
2. A barra de abas continha caracteres estranhos e emojis empilhados (`♂⚙️ Provedores`, `📊 Telemetria`, etc.), violando as diretrizes de UI sóbria, elegante e profissional do projeto.
3. O título ocupava espaço vertical excessivo com badges chamativos e desnecessários.

## Solução Proposta

1. **Restauração Completa do Chat Full-Bleed em Tela Cheia:**
   - Quando a aba **Chat** estiver selecionada, o container utilizará `absolute top-16 left-0 right-0 bottom-0 z-30 flex flex-col md:flex-row bg-[var(--bg-canvas)] overflow-hidden`.
   - O chat volta a ocupar 100% da altura e largura da tela sem bordas ou caixas internas.

2. **Remoção Completa de Emojis e Harmonização Visual Muted:**
   - Eliminação total de todos os emojis unicode (`♂`, `⚙️`, `📊`, `🔍`, etc.).
   - Utilização exclusiva de ícones vetoriais **Lucide React** (`Bot`, `Key`, `BarChart3`, `Terminal`, `Settings`).
   - Barra de abas discreta no canto superior direito do header em tom cinza sóbrio (`text-[var(--text-tertiary)] hover:text-white bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)]`).

3. **Abas de Telemetria e Provedores em Layouts Limpos:**
   - Quando o usuário clicar em **Provedores**, **Telemetria** ou **Inspector JSON**, a tela exibirá o painel correspondente com padding confortável e tipografia Inter/Outfit.

## Contratos de Dados
Nenhuma alteração de schema. Reutilização pura de `ai_execution_logs` e `ai_settings`.

## Features Existentes Impactadas
- `src/routes/agente.tsx` (restaurado chat full-bleed e limpos botões de aba)

## Risco Principal
Quebra de overflow no scroll do chat em telas pequenas.
*Mitigação:* Usar `flex-1 overflow-y-auto` com `messagesEndRef` e `absolute bottom-6` no PromptBox.
