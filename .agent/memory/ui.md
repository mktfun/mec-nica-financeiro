# 🎨 Memória Modular: Interface & UX (Frontend)

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
