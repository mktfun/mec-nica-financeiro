# Design: Restauração Exata do Visual Original da Conciliação (conciliacao-exact-layout-restoration)

## Estrutura do `ResumoDiaPanel.tsx`

```tsx
<motion.div
  initial={{ opacity: 0, y: -20 }}
  animate={{ opacity: 1, y: 0 }}
  className={`relative rounded-2xl border backdrop-blur-3xl shadow-sm transition-colors duration-500 overflow-hidden ${
    statusSuccess
      ? 'bg-[var(--color-accent-teal)]/5 border-[var(--color-accent-teal)]/20'
      : statusDanger
      ? 'bg-[var(--color-accent-danger)]/5 border-[var(--color-accent-danger)]/20'
      : 'bg-[var(--bg-surface-elevated)] border-[var(--border-subtle)]'
  }`}
>
  {/* Header Section */}
  <div className="p-6 border-b border-[var(--border-subtle)] flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
    ...
  </div>
  
  {/* Painel Interno da Aba Saldo */}
  <div className="p-6 bg-[var(--bg-canvas)]">
    ...
  </div>
</motion.div>
```

## Estrutura dos Cards de Loja em `conciliacao.index.tsx`

```tsx
<Card className="p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-6 transition-all hover:scale-[1.01] hover:bg-white/10 hover:border-white/20 cursor-pointer shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] border border-white/5 backdrop-blur-md">
  <div className="flex-1 flex items-center gap-4">
    <div className={`w-2 h-12 rounded-full ${calc.resultado_final_g31 >= 0 ? 'bg-[var(--color-accent-teal)]' : 'bg-[var(--color-accent-danger)]'}`} />
    <div>
      <p className="font-semibold text-lg">{store.name}</p>
      <p className="text-xs text-[var(--text-tertiary)] font-mono">ID: {store.id}</p>
    </div>
  </div>

  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4 bg-black/20 p-4 rounded-xl border border-white/5 flex-1 font-sans tabular-nums text-xs">
    {/* 6 Colunas do Módulo 1 */}
  </div>
</Card>
```

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)

- **Cenário 1 (Fundo e Estilo dos Cards em `/conciliacao`):**
  - *Ação:* Visualizar a tela de conciliação.
  - *Resultado Esperado:* O painel principal e os cards de loja reaparecem com o fundo limpo e sóbrio exatamente igual às versões de 6 a 7 commits atrás (`298246a`), com caixas internas `bg-black/20` e bordas translúcidas `border-white/5`.
