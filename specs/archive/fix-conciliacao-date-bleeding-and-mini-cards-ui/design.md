# Design: CorreçÁo do Vazamento de Datas no Saldo OFX e Redesign dos Mini-Cards de Fechamento por Loja (fix-conciliacao-date-bleeding-and-mini-cards-ui)

## Arquitetura Técnica

```
[Seletor de Data na ConciliaçÁo (selectedDate)]
                       │
                       ▼
[useModulo1StoresData(selectedDate)] ──► Consulta patio_os e transactions filtrando .eq('target_date', selectedDate)
                       │
                       ├── Se existirem lançamentos bancários na data:
                       │     saldoItau = saldo_banco_itau da data
                       └── Se NÁO existirem lançamentos bancários na data:
                             saldoItau = 0.00 (Zero vazamento)
                       │
                       ▼
[Card Fechamento por Loja em conciliacao.index.tsx]
                       │
                       └── Grid Responsivo (2 cols mobile / 3 cols tablet / 6 cols desktop)
                             ├── Mini-Card 1: Faturamento (R$ total OSs do dia)
                             ├── Mini-Card 2: Maquininha (R$ vendas cartÁo do dia)
                             ├── Mini-Card 3: PIX (R$ PIX OSs do dia)
                             ├── Mini-Card 4: Na Loja OS (R$ saldo aberto em patio_os)
                             ├── Mini-Card 5: Faturamento Itaú OFX (R$ 0,00 se sem OFX na data)
                             └── Mini-Card 6: Diferença (Faturamento - Maquininha - PIX)
```

## Estrutura do Novo Componente de Mini-Card

```tsx
<div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 bg-[var(--bg-surface)] p-3 rounded-xl border border-[var(--border-subtle)] font-sans tabular-nums text-xs">
  {/* Cada métrica em uma caixa dedicada com z-index e min-width seguros */}
  <div className="p-3 bg-white/5 rounded-lg border border-white/5 flex flex-col justify-between min-w-0">
    <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block truncate">
      Faturamento
    </span>
    <p className="text-sm font-bold text-[var(--text-primary)] mt-1 font-mono">
      <AnimatedNumber value={faturamento} format="currency" />
    </p>
  </div>
  ...
</div>
```

## Cenários de VerificaçÁo (SCAN → INFER → VERIFY → FIX)

- **Cenário 1 (Dia sem ConciliaçÁo):**
  - Estado inicial: Selecionar no calendário uma data sem importaçÁo de extrato nem movimentaçÁo.
  - AçÁo: Observar os cards de "Fechamento por Loja".
  - Resultado esperado: Todos os indicadores, incluindo `FATURAMENTO ITAÚ (OFX)`, mostram `R$ 0,00`.

- **Cenário 2 (VisualizaçÁo em Telas Médias e Pequenas):**
  - Estado inicial: Redimensionar o navegador ou abrir os cards de fechamento por loja.
  - AçÁo: Verificar a legibilidade dos 6 títulos de colunas.
  - Resultado esperado: Nenhum título se sobrepõe ou se choca com a métrica vizinha.
