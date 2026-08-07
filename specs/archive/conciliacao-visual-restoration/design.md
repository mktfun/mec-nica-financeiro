# Design: RestauraçÁo Estética Total e Animações da ConciliaçÁo (conciliacao-visual-restoration)

## Componente Reconstruído `ResumoDiaPanel.tsx`

```tsx
<motion.div
  initial={{ opacity: 0, y: -20, scale: 0.98 }}
  animate={{ opacity: 1, y: 0, scale: 1 }}
  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
  className={`relative rounded-3xl border backdrop-blur-3xl shadow-2xl transition-colors duration-500 overflow-hidden ${
    statusSuccess
      ? 'bg-[var(--color-accent-teal)]/5 border-[var(--color-accent-teal)]/30'
      : statusDanger
      ? 'bg-[var(--color-accent-danger)]/5 border-[var(--color-accent-danger)]/30'
      : 'bg-[var(--bg-surface-elevated)]/90 border-white/10'
  }`}
>
  {/* Luzes ambiente de fundo */}
  <div className="absolute -top-32 -left-32 w-96 h-96 bg-[var(--color-primary)]/15 opacity-20 blur-3xl rounded-full pointer-events-none" />
  <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[var(--color-accent-teal)]/15 opacity-20 blur-3xl rounded-full pointer-events-none" />
  
  ...
</motion.div>
```

## Cards de Loja em `conciliacao.index.tsx`

```tsx
{stores.map((store, index) => (
  <motion.div
    key={store.id}
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, delay: index * 0.04 }}
  >
    <Link to="/conciliacao/$lojaId" params={{ lojaId: store.id }} search={{ date: selectedDate }}>
      <Card className="p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-6 transition-all duration-300 hover:scale-[1.015] hover:bg-[var(--bg-surface-elevated)]/90 hover:border-white/25 hover:shadow-[0_12px_40px_rgba(0,0,0,0.4)] cursor-pointer border border-white/10 backdrop-blur-md rounded-2xl group relative overflow-hidden">
        {/* Glow no hover */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />
        ...
      </Card>
    </Link>
  </motion.div>
))}
```

## Cenários de VerificaçÁo (SCAN → INFER → VERIFY → FIX)

- **Cenário 1 (Entrada e Animações da Tela `/conciliacao`):**
  - *AçÁo:* Carregar a página principal de conciliaçÁo.
  - *Resultado Esperado:* O Hero Card principal desliza suavemente com efeito glow ambiente; os cartões de lojas surgem de forma escalonada e respondem ao mouse com elevaçÁo 3D (`scale 1.015`) e brilho.
