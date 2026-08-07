# Design: RestauraçÁo do Painel Unificado de Fechamento por Loja com Espaçamento Amplo (fix-store-closing-unified-panel-layout)

## Arquitetura do Layout

```
[Card da Loja (Dom Pedro, Jabaquara, etc.)]
   │
   ├── Nome & ID da Loja (Coluna Esquerda)
   │
   └── Painel ÚNICO de Fundo Contínuo (Coluna Direita - flex-1)
         │  bg-black/25 p-4 sm:p-5 rounded-2xl border border-white/5
         │
         └── Grade Interna Sem Caixa Individual (6 colunas)
               ├── Col 1: SALDO (text-accent-light-blue)
               ├── Col 2: MAQUININHA (text-accent-teal)
               ├── Col 3: PIX (text-primary)
               ├── Col 4: NA LOJA OS (text-accent-warning)
               ├── Col 5: FATURAMENTO (text-primary-bright)
               └── Col 6: DIFERENÇA (text-accent-teal ou danger com borda/divisória sutil)
```

## Estrutura JSX Proposta (`src/routes/conciliacao.index.tsx`)

```tsx
{/* Único Fundo de Painel Contínuo Envelopando as 6 Métricas */}
<div className="bg-black/25 p-4 sm:p-5 rounded-2xl border border-white/5 flex-1 font-sans tabular-nums text-xs">
  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-6 xl:gap-8 items-center">
    
    {/* 1. Saldo */}
    <div>
      <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1">
        Saldo
      </span>
      <p className="font-bold text-sm text-[var(--color-accent-light-blue)] font-mono">
        <AnimatedNumber value={saldoItau} format="currency" />
      </p>
    </div>

    {/* 2. Maquininha */}
    <div>
      <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1">
        Maquininha
      </span>
      <p className="font-bold text-sm text-[var(--color-accent-teal)] font-mono">
        <AnimatedNumber value={maquininha} format="currency" />
      </p>
    </div>

    {/* 3. PIX */}
    <div>
      <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1">
        PIX
      </span>
      <p className="font-bold text-sm text-[var(--color-primary)] font-mono">
        <AnimatedNumber value={pixOs} format="currency" />
      </p>
    </div>

    {/* 4. Na Loja OS */}
    <div>
      <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1">
        Na Loja OS
      </span>
      <p className="font-bold text-sm text-[var(--color-accent-warning)] font-mono">
        <AnimatedNumber value={naLojaOs} format="currency" />
      </p>
    </div>

    {/* 5. Faturamento */}
    <div>
      <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1">
        Faturamento
      </span>
      <p className="font-bold text-sm text-[var(--text-primary)] font-mono">
        <AnimatedNumber value={faturamento} format="currency" />
      </p>
    </div>

    {/* 6. Diferença */}
    <div className="xl:border-l xl:border-white/10 xl:pl-6">
      <span className={`text-[10px] uppercase font-bold tracking-wider block mb-1 ${
        isDiferencaOk ? 'text-[var(--color-accent-teal)]' : 'text-[var(--color-accent-danger)]'
      }`}>
        Diferença
      </span>
      <p className={`font-bold text-sm font-mono ${isDiferencaOk ? 'text-[var(--color-accent-teal)]' : 'text-[var(--color-accent-danger)]'}`}>
        <AnimatedNumber value={diferenca} format="currency" />
      </p>
    </div>

  </div>
</div>
```

## Cenários de VerificaçÁo (SCAN → INFER → VERIFY → FIX)

- **Cenário 1 (Visual do Painel Único):**
  - AçÁo: Abrir a página `/conciliacao` e observar o card de cada loja.
  - Resultado esperado: As 6 colunas compartilham o mesmo fundo escuro contínuo do painel (`bg-black/25`), sem 6 caixinhas pretas isoladas flutuando.

- **Cenário 2 (Espaçamento e Legibilidade):**
  - AçÁo: Verificar a distância entre as 6 colunas.
  - Resultado esperado: O espaçamento (`gap-6 xl:gap-8`) garante visual amplo, elegante e fácil de ler sem sobreposiçÁo de textos.
