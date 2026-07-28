# Design: Ajuste de Rótulos e Mapeamento do Card de Fechamento por Loja (fix-store-closing-card-labels-and-values)

## Arquitetura de Mapeamento dos Mini-Cards

```
[Card de Fechamento por Loja (conciliacao.index.tsx)]
                       │
                       ├── 1. Saldo (R$ saldoItau - Extrato bancário Itaú OFX do dia)
                       ├── 2. Maquininha (R$ maquininha - Vendas cartão Rede)
                       ├── 3. PIX (R$ pixOs - Recebimentos PIX das OSs do dia)
                       ├── 4. Na Loja OS (R$ naLojaOs - Saldo pendente/em aberto no pátio)
                       ├── 5. Faturamento (R$ faturamento - Faturamento/Receita bruta das OSs)
                       └── 6. Diferença (R$ faturamento - (maquininha + pixOs))
```

## Mapeamento de Código em `src/routes/conciliacao.index.tsx`

```tsx
{/* 1. Saldo */}
<div className="p-3 bg-black/40 rounded-xl border border-white/10 flex flex-col justify-between min-w-0">
  <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block truncate">
    Saldo
  </span>
  <p className="font-bold text-sm text-[var(--color-accent-light-blue)] mt-1 font-mono">
    <AnimatedNumber value={saldoItau} format="currency" />
  </p>
</div>

{/* 2. Maquininha */}
<div className="p-3 bg-black/40 rounded-xl border border-white/10 flex flex-col justify-between min-w-0">
  <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block truncate">
    Maquininha
  </span>
  <p className="font-bold text-sm text-[var(--color-accent-teal)] mt-1 font-mono">
    <AnimatedNumber value={maquininha} format="currency" />
  </p>
</div>

{/* 3. PIX */}
<div className="p-3 bg-black/40 rounded-xl border border-white/10 flex flex-col justify-between min-w-0">
  <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block truncate">
    PIX
  </span>
  <p className="font-bold text-sm text-[var(--color-primary)] mt-1 font-mono">
    <AnimatedNumber value={pixOs} format="currency" />
  </p>
</div>

{/* 4. Na Loja OS */}
<div className="p-3 bg-black/40 rounded-xl border border-white/10 flex flex-col justify-between min-w-0">
  <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block truncate">
    Na Loja OS
  </span>
  <p className="font-bold text-sm text-[var(--color-accent-warning)] mt-1 font-mono">
    <AnimatedNumber value={naLojaOs} format="currency" />
  </p>
</div>

{/* 5. Faturamento */}
<div className="p-3 bg-black/40 rounded-xl border border-white/10 flex flex-col justify-between min-w-0">
  <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block truncate">
    Faturamento
  </span>
  <p className="font-bold text-sm text-[var(--text-primary)] mt-1 font-mono">
    <AnimatedNumber value={faturamento} format="currency" />
  </p>
</div>

{/* 6. Diferença */}
<div className={`p-3 rounded-xl border flex flex-col justify-between min-w-0 ${
  isDiferencaOk ? 'bg-[var(--color-accent-teal)]/10 border-[var(--color-accent-teal)]/30' : 'bg-[var(--color-accent-danger)]/10 border-[var(--color-accent-danger)]/30'
}`}>
  <span className={`text-[10px] uppercase font-bold tracking-wider block truncate ${
    isDiferencaOk ? 'text-[var(--color-accent-teal)]' : 'text-[var(--color-accent-danger)]'
  }`}>
    Diferença
  </span>
  <p className={`font-bold text-sm mt-1 font-mono ${isDiferencaOk ? 'text-[var(--color-accent-teal)]' : 'text-[var(--color-accent-danger)]'}`}>
    <AnimatedNumber value={diferenca} format="currency" />
  </p>
</div>
```

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)

- **Cenário 1 (Exemplo Dom Pedro):**
  - Saldo = R$ 0,00 (Sem OFX na data)
  - Maquininha = R$ 9.160,48
  - PIX = R$ 0,00
  - Na Loja OS = R$ 0,00
  - Faturamento = R$ 13.003,33
  - Diferença = R$ 3.842,85 (13.003,33 - 9.160,48 - 0,00)
