# 🎨 Memória Modular: Interface & UX (Frontend)

## [2026-07-24] — Feature ID: agente-fullbleed-layout-and-clean-tabs

**Contexto:** Restauração do layout do Chat do Agente em tela cheia (full-bleed) e substituição de emojisunicode por ícones Lucide React limpos em pílulas muted de navegação.

**Regra aprendida:**
- O Chat do Agente na rota `/agente` deve ser montado em **Tela Cheia Full-Bleed** (`absolute top-16 left-0 right-0 bottom-0 z-30 flex flex-col md:flex-row bg-[var(--bg-canvas)] overflow-hidden`). NUNCA aprisione o chat em caixas minimizadas com altura fixa (ex: `h-[680px]`) ou margens `max-w-7xl`.
- **Zero Emojis Unicode em Headers/Tabs:** NUNCA utilize emojis (`♂`, `⚙️`, `📊`, `🔍`) em pílulas de navegação ou títulos de página. Use exclusivamente ícones vetoriais **Lucide React** (`Bot`, `Key`, `BarChart3`, `Terminal`, `MessageSquare`).
- As pílulas de navegação de abas no header devem usar estilos muted e discretos (`bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-tertiary)] hover:text-white`).

**Risco identificado:** Encapsular o Chat do Agente em containers com `max-w-7xl` ou `h-[680px]` quebra o layout responsivo em tela cheia e encurta a área visível das mensagens.

**Não fazer:** Nunca aprisionar o Chat do Agente em mini-telas ou usar emojis unicode em menus/navegações de header.

## [2026-07-24] — Feature ID: conciliacao-exact-layout-restoration

**Contexto:** Restauração exata do layout original sóbrio e limpo da conciliação conforme commit `298246a` / `dbf1ec5`, removendo orbes 3D artificiais.

**Regra aprendida:**
- O visual preferido da tela de conciliação diária utiliza containers limpos `rounded-2xl border backdrop-blur-3xl shadow-sm` e caixas internas escuras `bg-black/20 p-4 rounded-xl border border-white/5` nos cards de loja.
- Deve-se evitar adicionar esferas radiais 3D de fundo em dashboards executivos que requerem sobriedade visual.
- As 6 colunas do Módulo 1 devem ser encaixadas dentro da caixa interna `bg-black/20` utilizando a tipografia **Inter** com numerais `tabular-nums`.

**Risco identificado:** Adicionar luzes ambiente radiais e gradientes brilhantes artificiais degrada a legibilidade e altera a identidade visual sóbria do dashboard preferida pelo usuário.

**Não fazer:** Nunca reintroduzir esferas de luz radiais 3D de fundo no painel de conciliação.

## [2026-07-24] — Feature ID: font-standardization-modern

**Contexto:** Padronização tipográfica global em todas as telas com a eliminação da fonte monospace "quadrada/caricata" (Courier/Consolas) e adoção oficial das Google Fonts **Inter** e **DM Sans**.

**Regra aprendida:**
- Fazer a ponte de variáveis de tema CSS em `styles.css` mapeando `--font-body`, `--font-sans` e `--font-mono` para `"Inter", sans-serif`.
- Números e valores monetários DEVEM utilizar `tabular-nums` (`font-variant-numeric: tabular-nums`). Isso mantém o alinhamento vertical dos numerais sem precisar aplicar fontes monospaçadas máquina de escrever rústicas.
- Mantemos a hierarquia visual limpa: **DM Sans** em grandes títulos de exibição (`--font-display`) e **Inter** no corpo, tabelas, inputs e numerais.

**Risco identificado:** A classe `font-mono` do Tailwind usa Courier/Consolas se a variável `--font-mono` não for sobrescrita com a fonte Inter + `tabular-nums`.

**Não fazer:** Nunca deixar classes `font-mono` padrão sem remapear para a fonte de UI principal com `tabular-nums`.

## [2026-07-23] — Feature ID: delete-and-clean-all

**Contexto:** Adicionado botão de "Limpar Todos os Dados" na tela `/importacoes` com modal de confirmação e fallback JS client para exclusão de lotes.

**Regra aprendida:**
- Para exclusões de lotes ou limpeza global de banco de dados, utilize sempre o fallback de deleção ordenada via JS Client (`conciliation_matches` → `transactions` → `patio_os` → `receivables` → `reconciliations` → `import_logs` → `import_batches`) acompanhado de `qc.clear()` para purgar imediatamente o cache do React Query no navegador.
- Botões de ações de destruição em massa devem ter cor de perigo (vermelho/danger) e exigi confirmação em modal explícito.

**Risco identificado:** Apenas invalidar queries (`invalidateQueries`) sem executar `qc.clear()` pode manter objetos cacheados na memória do navegador.

**Não fazer:** Nunca confiar exclusivamente em RPCs de deleção sem implementar um fallback JS Client resiliente.

## [2026-07-24] — Feature ID: wizard-and-logs-enhancement

**Contexto:** Reformulação do Wizard de Importação com Terminal de Logs de Processamento em Tempo Real (Step 4) e navegação direta para a tela de Conciliação.

**Regra aprendida:**
- Wizard de processos pesados deve ter um passo dedicado de Terminal UI Headless para emitir logs de progresso em tempo real enquanto as requisições assíncronas são concluídas.
- Após o salvamento, apresentar botões de navegação direta (ex: "Ir para a Tela de Conciliação →") para evitar que o usuário precise fechar alertas manuais ou buscar a rota no menu lateral.

**Risco identificado:** Redirecionar o usuário sem dar tempo de visualização do log de término pode gerar incerteza se todos os registros foram gravados.

**Não fazer:** Nunca usar `alert()` síncrono para notificar o sucesso de grandes importações em lote.

## [2026-07-24] — Feature ID: conciliacao-design-system-fix

**Contexto:** Correção de inconsistência visual na tela de conciliação por loja (`conciliacao.$lojaId.tsx`). Quatro componentes (`OsVsRedeTable`, `RedeVsOfxTable`, `PixVsOfxTable`, `OsDetailModal`) foram criados em iteração anterior com classes Tailwind de cor hardcoded (`bg-[#050711]`, `border-zinc-800`, `text-emerald-400`, `text-sky-400`, etc.) em vez dos tokens CSS do design system do projeto.

**Regra aprendida:**
- O projeto usa CSS Custom Properties definidas em `src/styles.css` como tokens de design. NUNCA use cores Tailwind hardcoded (`zinc-*`, `emerald-*`, `sky-*`, `amber-*`) em componentes novos.
- Mapa de correspondência obrigatório:
  - Fundo principal → `bg-[var(--bg-canvas)]` ou `<Card variant="elevated">`
  - Fundo elevado → `<Card variant="elevated">` (usa `var(--bg-surface-elevated)` automaticamente)
  - Fundo painel → `bg-[var(--bg-surface)]`
  - Bordas → `border-[var(--border-subtle)]` ou `border-[var(--border-strong)]`
  - Texto principal → `text-[var(--text-primary)]`
  - Texto secundário → `text-[var(--text-secondary)]`
  - Texto terciário → `text-[var(--text-tertiary)]`
  - Verde (sucesso/teal) → `text-[var(--color-accent-teal)]` / `<Badge variant="success">`
  - Azul (banco/OFX) → `text-[var(--color-accent-light-blue)]`
  - Laranja (warning) → `text-[var(--color-accent-warning)]` / `<Badge variant="warning">`
  - Vermelho (danger) → `text-[var(--color-accent-danger)]` / `<Badge variant="danger">`
  - Indigo (primary) → `text-[var(--color-primary)]` / `<Badge variant="brand">`
- Os componentes `<Card>` e `<Badge>` do sistema já herdam os tokens automaticamente — use-os sem sobrescrever cor.

**Risco identificado:** Hardcodar cores Tailwind cria uma "paleta paralela" que não responde ao tema (light/dark mode) e faz novos componentes parecerem de outro sistema visualmente.

**Não fazer:** NUNCA usar `bg-[#050711]`, `bg-zinc-900`, `border-zinc-800`, `text-emerald-*`, `text-sky-*`, `text-amber-*` em componentes de interface. Sempre referenciar o design system via CSS Custom Properties.
