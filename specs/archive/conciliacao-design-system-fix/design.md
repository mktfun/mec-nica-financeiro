# Design: Uniformização Visual da Tela de Conciliação (conciliacao-design-system-fix)

## Mapa de Tokens CSS (Design System Real)

O sistema usa variáveis CSS definidas em `src/styles.css`:

```
Canvas escuro:        var(--bg-canvas)              = #000000 (dark)
Surface elevado:      var(--bg-surface-elevated)    = #16181a (dark)
Surface base:         var(--bg-surface)             = #0a0a0a (dark)
Texto primário:       var(--text-primary)           = #ffffff (dark)
Texto secundário:     var(--text-secondary)         = rgba(255,255,255,0.72) (dark)
Texto terciário:      var(--text-tertiary)          = #8d969e
Borda sutil:          var(--border-subtle)          = rgba(255,255,255,0.06) (dark)
Borda forte:          var(--border-strong)          = rgba(255,255,255,0.12) (dark)
Primary (indigo):     var(--color-primary)          = #494fdf
Primary bright:       var(--color-primary-bright)   = #4f55f1
Teal (sucesso):       var(--color-accent-teal)      = #00a87e
Danger (vermelho):    var(--color-accent-danger)    = #e23b4a
Warning (laranja):    var(--color-accent-warning)   = #ec7e00
Light blue:           var(--color-accent-light-blue) = #007bc2
```

## Componentes Afetados e Mudanças Específicas

### `RedeVsOfxTable.tsx`
- Cards superiores: `<Card variant="elevated" className="p-5">` (remove hardcoded bg-[#050711])
- Card de depósito agrupado: `<Card variant="elevated" className="p-0 overflow-hidden">`
- Header do card de depósito: `bg-[var(--bg-surface)] border-b border-[var(--border-subtle)]`
- Sub-itens de venda: `bg-[var(--bg-canvas)] border border-[var(--border-strong)] rounded-xl`
- Ícones: `text-[var(--color-accent-light-blue)]` (Landmark/banco), `text-[var(--color-accent-teal)]` (CreditCard)
- Badge PAREADO: `<Badge variant="success">` (usa `var(--color-accent-teal)`)
- Badge DIVERGÊNCIA: `<Badge variant="warning">` (usa `var(--color-accent-warning)`)
- Card status (3º card): borda e bg usando `var(--color-accent-teal)/10` ou `var(--color-accent-danger)/10`

### `PixVsOfxTable.tsx`
- Cards superiores: `<Card variant="elevated" className="p-5">`
- Cards de par PIX: `<Card variant="elevated" className="p-5 flex flex-col md:flex-row gap-6">`
- Lado "OS Sistema": `bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-xl p-4`
- Cores dos textos: `text-[var(--text-primary)]`, `text-[var(--text-secondary)]`, `text-[var(--text-tertiary)]`
- Ícones de PIX: `text-[var(--color-primary)]`

### `OsVsRedeTable.tsx`
- Card wrapper: `<Card className="p-0 overflow-hidden">` (padrão)
- Header da tabela: `bg-[var(--bg-surface)] border-b border-[var(--border-subtle)]`
- `thead`: `bg-[var(--bg-canvas)]`
- Linhas: `hover:bg-[var(--bg-surface)]`
- Badge Pareado: `<Badge variant="success">`
- Badge Delta: `<Badge variant="warning">`
- Badge Sem OS: `<Badge variant="danger">`

### `OsDetailModal.tsx`
- Header: `bg-[var(--bg-canvas)] border border-[var(--border-subtle)]`
- Cards de valor: `bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)]`
- Itens de pagamento: `bg-[var(--bg-surface)] border border-[var(--border-strong)]`
- Todos os textos usando variáveis CSS do sistema

## Restrições Visuais
- ❌ NUNCA usar `bg-[#050711]`, `bg-zinc-*`, `border-zinc-*` hardcoded
- ❌ NUNCA usar `text-sky-*`, `text-emerald-*`, `text-amber-*` hardcoded
- ✅ SEMPRE usar `var(--*)` tokens ou `<Card>`/`<Badge>` components
- ✅ Fontes: `font-display` (DM Sans) para títulos, `font-mono` para valores monetários
