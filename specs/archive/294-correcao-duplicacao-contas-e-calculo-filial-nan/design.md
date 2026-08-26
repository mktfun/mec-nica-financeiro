# Design: Correção Definitiva de Duplicação de Contas e Resolução de R$ NaN por Filial (294)

## Arquitetura de Deduplicação de Contas a Pagar

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              FLUXO DE CONTAS A PAGAR (DEDUPLICADO)                     │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. IMPORTAÇÃO (useContasAPagarImport)                                                  │
│    - Grava itens detalhados em daily_manual_bills (com external_code)                  │
│    - Atualiza snapshot.contas_a_pagar                                                  │
│                                │                                                       │
│                                ▼                                                       │
│ 2. RPC get_daily_reconciliation_summary                                                │
│    - Consulta SUM(amount) de daily_manual_bills para o dia                             │
│    - Se SUM > 0 ➔ contas_manual = SUM(daily_manual_bills) [DEDUPLICADO!]               │
│    - Se SUM = 0 ➔ contas_manual = snapshot.contas_a_pagar [FALLBACK]                   │
│                                │                                                       │
│                                ▼                                                       │
│ 3. RESUMO CONCILIAÇÃO & PAINEL                                                         │
│    - Contas a Pagar = Exatamente o total do arquivo importado (1x)                     │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

## Métricas por Filial nos Cards

```tsx
// Tratamento resiliente no React (conciliacao.index.tsx):
const maquininhaVal = log.maquininha ?? log.rede_liquido ?? 0;
const pixVal = log.pix ?? log.pix_os ?? 0;
const naLojaVal = log.na_loja_os ?? log.patio_os ?? 0;
const previstoVal = log.previsto_ofx ?? (maquininhaVal + pixVal);
const diferencaVal = log.diferenca ?? 0;
```

## Cenários de Verificação

- **Cenário 1 (Importação de Despesas de R$ 15.000):**
  - Importar arquivo com 20 contas somando R$ 15.000.
  - *Resultado:* O painel exibe Contas a Pagar = R$ 15.000 (e NÃO R$ 30.000).
- **Cenário 2 (Fechamento por Filial - 10 Lojas):**
  - Acessar `/conciliacao?date=2026-08-26`.
  - *Resultado:* Todas as 10 lojas exibem valores monetários válidos (ex: Dom Pedro: Maquininha R$ 5.884,95, PIX R$ 1.845,00), ZERO `R$ NaN`.
