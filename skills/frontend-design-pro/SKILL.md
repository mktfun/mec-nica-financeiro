---
name: frontend-design-pro
description: Hub central de Design Engineering e eliminação de AI Slop — padrões de Dark UI Zinc-950, restrições negativas, protocolo /audit -> /polish, 48 guidelines do Rauno Freiberg e integração com Shoogle.
---

# Frontend Design Pro — Hub de Design Engineering & Anti-Slop

Guia operacional definitivo de **Design Engineering** para agentes de IA. Elimina o visual genérico de "AI Slop", impondo restrições determinísticas, consistência de superfícies em Dark Mode e rigor ergonômico em aplicações Next.js, React e Tailwind CSS.

---

## 1. O Padrão `DESIGN.md` (Design System Lock)

> [!IMPORTANT]
> **Antes de gerar ou editar qualquer componente de UI, procure por `DESIGN.md` na raiz do projeto.**
> - Se existir, adira **estritamente** aos seus tokens de cores, escala tipográfica e raio de borda.
> - Se não existir no projeto, utilize os tokens canônicos do template em `templates/DESIGN.md.template`.
> - É terminantemente **PROIBIDO** inventar cores hexadecimais arbitrárias (ex.: `bg-[#1e1b4b]`) ou classes fora da especificação.

---

## 2. Protocolo de Auditoria e Refinamento: `/audit` → `/polish`

NUNCA execute ou proponha um "redesign completo" de uma tela funcional. O fluxo deve seguir o roteiro em `references/audit-polish-flow.md`:

1. **Passo 1: `/audit` (Diagnóstico Visual Estrito)**:
   - Inspecione a interface quanto a: contraste WCAG (mínimo 4.5:1), escala tipográfica, ritmo de espaçamento (4px/8px), estados interativos e presença de AI Slop.
   - Emita o diagnóstico sem alterar código.
2. **Passo 2: `/polish` (Micro-Calibração Cirúrgica)**:
   - Aplique ajustes atômicos de padding, border-radius concêntrico, tracking de fonte e contraste de borda.
   - Comandos direcionais auxiliares: `/bolder` (mais peso e presença), `/quieter` (reduzir ruído visual), `/distill` (focar na essência).

---

## 3. Catálogo de AI Slop & Regras Anti-Clichê

Consulte a lista completa com os 67 anti-patterns detalhados em `references/ai-slop-catalog.md`. As 10 proibições mais críticas que o agente DEVE respeitar:

| ❌ Prática de AI Slop Proibida | ID da Regra | ✅ Comportamento Correto |
|---|---|---|
| Gradientes roxo-para-azul em botões/títulos | `purple-violet-gradient` | Usar cores sólidas ancoradas na marca (`bg-indigo-600`). |
| Cards aninhados dentro de cards (Cardocalypse) | `cardocalypse` | Achatar superfícies; usar divisores sutis ou espaçamento. |
| Ícone em quadradinho colorido flutuante acima do H2 | `icon-tile-stack` | Ícone inline alinhado ao texto ou sem container decorativo. |
| Headings com palavras forçadas em itálico serifado | `italic-serif-display` | Tipografia coesa e autêntica à marca sem itálicos clichês. |
| Kickers repetitivos acima de títulos ("FEATURES") | `kicker-above-heading` | Eliminar kickers redundantes; incorporar contexto no título. |
| Alterar `font-weight` (ex.: 400→600) no hover | `font-weight-hover-shift` | Transição de cor ou ring de foco; nunca causar Layout Shift. |
| Emojis (🚀, 🔥, ⚡) como ícones de botões | `emoji-as-icon` | Usar ícones SVG padronizados da biblioteca `lucide-react`. |
| Fundo preto absoluto `#000000` sem profundidade | `pure-black-canvas` | Usar Zinc-950 (`#09090b`) com modelo de elevação de superfícies. |
| Inputs com fonte < 16px no mobile | `ios-zoom-on-input-focus` | Fonte mínima de 16px no mobile (`text-base md:text-sm`). |
| Animações e transições demoradas (> 200ms) | `slow-interaction-duration`| Micro-interações devem durar **no máximo 150ms a 200ms**. |

---

## 4. Web Interface Guidelines (Rauno Freiberg)

Consulte o compêndio completo das 48 regras em `references/interface-guidelines.md`. Princípios não-negociáveis de craft:

- **Feedback de Proximidade (Regra 3)**: Feedback visual deve ocorrer colado ao elemento disparador (ex.: checkmark inline ao lado de botão "Copiar"), nunca dependendo exclusivamente de toasts genéricos.
- **Anéis de Foco via Box-Shadow (Regra 32)**: Anéis de acessibilidade de teclado devem usar `box-shadow` / `ring-2`, respeitando o `border-radius` do elemento.
- **Labels Clicáveis (Regra 22)**: O clique no `<label>` DEVE focar o campo correspondente via `htmlFor` + `id`.
- **Mínimo de 44x44px em Telas Touch (Regra 45)**: Todo elemento interativo móvel deve ter área de toque mínima de 44x44px.
- **Isolamento de Hover em Telas Touch**: Estilos de hover nunca devem grudar em smartphones. Envolva regras em `@media (hover: hover)` ou variantes equivalentes.
- **Gradientes Radiais CSS em Vez de Divs Borradas (Regra 39)**: Proibido usar divs com `blur(100px)` para iluminação ambiente; use `radial-gradient` nativo do CSS.

---

## 5. Modelo de Profundidade Dark UI (dark.design)

Consulte as especificações completas em `references/dark-ui-depth.md`.

- **Profundidade por Luminância**: Em modo escuro, sombras pretas projetadas são invisíveis. A elevação se dá pelo clareamento progressivo da superfície:
  - `bg-zinc-950` (#09090b) -> Canvas base
  - `bg-zinc-900` (#18181b) -> Cards primários e painéis
  - `bg-zinc-900/80` -> Headers fixos elevados com `backdrop-blur-md`
  - `bg-zinc-850 / bg-zinc-800` -> Menus flutuantes, modais e tooltips
- **Micro-Bordas e Inner Bevel**:
  - Delimitar cards com `border border-white/10` ou `border-zinc-800`.
  - Aplicar o destaque interno superior de 1px: `shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]`.
- **Hierarquia de Texto Confortável**:
  - Títulos: `text-zinc-100` (#f4f4f5)
  - Corpo / Labels: `text-zinc-300` (#d4d4d8)
  - Secundário / Descrições: `text-zinc-400` (#a1a1aa)
  - Muted / Placeholders: `text-zinc-500` (#71717a)

---

## 6. Fonte Primária de Blocos: Shoogle (`shoogle.dev`)

- **NÃO crie componentes interativos complexos do zero**:
  - Antes de codificar formulários multi-step, tabelas com filtros ou menus dropdown, consulte o **Shoogle** (`shoogle.dev`) — buscador unificado do ecossistema **shadcn/ui**.
  - Utilize blocos testados em acessibilidade (Radix UI) e consistência técnica.
- Adicione componentes oficiais via CLI:
  ```bash
  npx shadcn@latest add dialog dropdown-menu popover table sheet
  ```

---

## 7. Roteamento de Referências

| Necessidade / Domínio de UI | Arquivo de Referência |
|---|---|
| **Catálogo de 67 Anti-Patterns** | `references/ai-slop-catalog.md` |
| **48 Regras de Craft e UX (Rauno)** | `references/interface-guidelines.md` |
| **Elevação de Superfícies Dark** | `references/dark-ui-depth.md` |
| **Fluxo /audit -> /polish** | `references/audit-polish-flow.md` |
| **Template de Design System** | `templates/DESIGN.md.template` |
| **Layouts de Dashboard & App Shell**| `skills/ui-components/references/dashboard-layout.md` |
| **Tabelas de Dados & Filtros** | `skills/ui-components/references/data-table.md` |
| **Formulários & Wizards** | `skills/ui-components/references/forms.md` |
| **Landing Pages Cinematográficas** | `skills/ui-components/references/cinematic-landing-page.md` |
| **Micro-interações e Motion** | `skills/ui-motion/SKILL.md` |
