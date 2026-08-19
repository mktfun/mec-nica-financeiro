# Design: Restaurar Design Original dos Cards de Lojas e Painel de Resumo do Dia (Spec 241)

## Arquitetura Visual & Componentes

```
[Tela de Conciliação - /conciliacao]
  │
  ├── 1. ResumoDiaPanel.tsx (Design Original do Commit 0a092ce)
  │    ├── Header com Gradiente: `bg-gradient-to-r from-[var(--bg-surface)] to-[var(--bg-surface-elevated)]`
  │    │    ├── Seletor de Data com <input type="date"> transparente sobreposto
  │    │    └── KPIs de Topo: "Apurado Sistema" e "Entradas OFX"
  │    │
  │    ├── Grid dos 5 Pilares: `grid grid-cols-2 md:grid-cols-5 gap-4 mb-6`
  │    │    ├── 1. SALDO BANCOS + CARTÕES (`var(--color-accent-light-blue)`) + Sub-linhas OFX & + Maq
  │    │    ├── 2. DINHEIRO MP (`var(--color-accent-teal)`)
  │    │    ├── 3. A RECEBER (`var(--color-primary)`)
  │    │    ├── 4. NA LOJA OS (`var(--color-accent-warning)`)
  │    │    └── 5. CONTAS (MANUAL) (`var(--color-accent-danger)`) + Sub-linhas Juros, Devoluções e OFX Out
  │    │
  │    ├── Consolidação & Balanço (2 Colunas):
  │    │    ├── Esquerda (lg:col-span-2): "Consolidação do Dia" (Caixa Atual, Caixa Anterior, Fluxo Caixa, Faturamento, Disp Contas)
  │    │    └── Direita (lg:col-span-1): "Balanço do Fechamento / Diferença" (Subtotal Contas, Diferença Final apurada com Card de Status)
  │    │
  │    └── AuditTrailBar inferior
  │
  └── 2. Lista de Cards por Loja (conciliacao.index.tsx)
       └── Card Horizontal Contínuo:
            ├── Barra lateral de conformidade: `w-2 h-14 rounded-full`
            ├── Identidade: Nome da Loja, Badges `ENTROU` / `NÃO ENTROU` (+ R$ ...), ID
            ├── Painel Escuro Envelopado: `bg-black/25 p-4 sm:p-5 rounded-2xl border border-white/5 flex-1`
            │    └── Grid de 6 Métricas: Saldo Bancos | Maquininha | PIX | Na Loja OS | Previsto | Diferença
            └── Botão flutuante Raio-X (`group-hover:opacity-100`)
```

---

## Componentes Modificados

| Artefato | Localização | Mudança |
|---|---|---|
| `ResumoDiaPanel.tsx` | `src/components/conciliacao/ResumoDiaPanel.tsx` | Restaurar o JSX, tokens de design system e layout de 2 colunas do commit `0a092ce`, incorporando as devoluções da Spec 240. |
| `conciliacao.index.tsx` | `src/routes/conciliacao.index.tsx` | Restaurar o layout horizontal contínuo clássico dos cards de filiais com barra lateral de status, painel de 6 métricas e botão Raio-X flutuante. |

---

## Detalhamento do JSX dos Cards de Lojas (`conciliacao.index.tsx`)

```tsx
<div key={store.id} className="relative group">
  <Link
    to="/conciliacao/$lojaId"
    params={{ lojaId: store.id }}
    search={{ date: selectedDate }}
    className="block transition-all hover:scale-[1.005] duration-200"
  >
    <Card className={`p-4 sm:p-5 border flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-6 transition-all shadow-md hover:shadow-xl ${
      isDiferencaOk ? 'hover:border-[var(--color-accent-teal)]/40' : 'hover:border-[var(--color-accent-danger)]/40'
    }`}>
      
      {/* Nome da Loja & Status */}
      <div className="w-full xl:w-64 shrink-0 flex items-center gap-4">
        <div className={`w-2 h-14 rounded-full ${isDiferencaOk ? 'bg-[var(--color-accent-teal)]' : 'bg-[var(--color-accent-danger)]'}`} />
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-base sm:text-lg text-white leading-tight">{store.name}</p>
            {log.status_compensacao === 'entrou' && (
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                ENTROU
              </span>
            )}
            {(log.status_compensacao === 'parcial' || log.status_compensacao === 'nao_entrou') && (log.nao_entrou_valor || 0) > 0 && (
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                NÃO ENTROU (+ {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(log.nao_entrou_valor || 0)})
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--text-tertiary)] font-mono mt-0.5">ID: {store.id}</p>
        </div>
      </div>

      {/* Painel Único de Fundo Contínuo Envelopando as 6 Métricas */}
      <div className="bg-black/25 p-4 sm:p-5 rounded-2xl border border-white/5 flex-1 font-sans tabular-nums text-xs">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-6 xl:gap-8 items-center">
          
          {/* 1. Saldo Bancos + Cartões */}
          <div>
            <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1">
              Saldo Bancos + Cartões
            </span>
            <p className="font-bold text-sm text-[var(--color-accent-light-blue)] font-mono">
              <AnimatedNumber value={log.saldo_banco} format="currency" />
            </p>
            <div className="text-[10px] text-[var(--text-tertiary)] mt-0.5 flex flex-col font-mono">
              <span>OFX: <AnimatedNumber value={log.saldo_banco_ofx ?? log.saldo_banco} format="currency" /></span>
              {(log.nao_entrou_valor || 0) > 0 && (
                <span className="text-amber-400 font-semibold">
                  + Maq: + {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(log.nao_entrou_valor || 0)}
                </span>
              )}
            </div>
          </div>

          {/* 2. Maquininha */}
          <div>
            <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1">
              Maquininha
            </span>
            <p className="font-bold text-sm text-[var(--color-primary)] font-mono">
              <AnimatedNumber value={log.maquininha} format="currency" />
            </p>
          </div>

          {/* 3. PIX */}
          <div>
            <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1">
              PIX
            </span>
            <p className="font-bold text-sm text-[var(--color-primary)] font-mono">
              <AnimatedNumber value={log.pix} format="currency" />
            </p>
          </div>

          {/* 4. Na Loja OS */}
          <div>
            <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1">
              Na Loja OS
            </span>
            <p className="font-bold text-sm text-[var(--color-accent-warning)] font-mono">
              <AnimatedNumber value={log.na_loja_os} format="currency" />
            </p>
          </div>

          {/* 5. Previsto */}
          <div>
            <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1">
              Previsto
            </span>
            <p className="font-bold text-sm text-[var(--text-primary)] font-mono">
              <AnimatedNumber value={previstoAjustado} format="currency" />
            </p>
            {storeAllJustified > 0 && (
              <span className="text-[9px] text-blue-400 block mt-0.5 font-medium">
                (- <AnimatedNumber value={storeAllJustified} format="currency" /> just.)
              </span>
            )}
          </div>

          {/* 6. Diferença */}
          <div className="xl:border-l xl:border-white/10 xl:pl-6">
            <span className={`text-[10px] uppercase font-bold tracking-wider block mb-1 ${
              isDiferencaOk ? 'text-[var(--color-accent-teal)]' : 'text-[var(--color-accent-danger)]'
            }`}>
              Diferença
            </span>
            <p className={`font-bold text-sm font-mono ${isDiferencaOk ? 'text-[var(--color-accent-teal)]' : 'text-[var(--color-accent-danger)]'}`}>
              <AnimatedNumber value={diferencaCalculada} format="currency" />
            </p>
          </div>

        </div>
      </div>

    </Card>
  </Link>

  {/* Botão Raio-X — flutuante sobre o Card, fora do Link para não navegar */}
  <button
    onClick={(e) => { e.stopPropagation(); e.preventDefault(); setBreakdownStore({ id: store.id, name: store.name }); }}
    title="Ver transações detalhadas desta loja"
    className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold bg-[var(--bg-canvas)]/80 border border-[var(--border-subtle)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] hover:border-[var(--color-primary)]/40 transition-all opacity-0 group-hover:opacity-100"
  >
    <Search size={11} />
    Raio-X
  </button>
</div>
```

---

## Cenários de Verificação
- **Cenário 1 (Visual ResumoDiaPanel):** O painel do dia exibe o cabeçalho com gradiente de fundo, 5 pilares proporcionais com os tokens `var(--bg-surface-elevated)`, consolidação de 2 colunas e badge de status harmônico.
- **Cenário 2 (Visual Cards de Filiais):** Cada loja é renderizada em card horizontal único com a barra lateral vertical `w-2 h-14`, as 6 métricas em envelope escuro `bg-black/25` e botão Raio-X no hover.
- **Cenário 3 (Consistência Contábil):** Subtotal de contas continua incluindo `devolucoes_rede`, `subtotalContasCalculado` bate com o backend e `last_payment_date` continua ativo.
- **Cenário 4 (Build):** `npm run build` compila sem erros TypeScript.
