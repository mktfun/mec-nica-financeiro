# Proposal: Dashboard Fintech V2 — Visão Executiva Completa (062)

## Problema

O dashboard atual (`/`) é superficial e desordenado para um gestor de rede de oficinas:

1. **`HeroBalance`**: Exibe apenas "Saldo Consolidado Global" calculado de `transactions` (OFX). Não mostra caixa real, faturamento, contas, fluxo nem diferença.
2. **`QuickActions`**: Atalhos genéricos que poluem o espaço sem valor analítico.
3. **`MotorStatus`**: Card redundante — a informação de divergências pertence à tela de Conciliação.
4. **`RecentActivity`**: Lista OS grandes e atrasadas — util mas não faz parte do contexto de dashboard financeiro executivo. Pode ser mantida mas rebaixada.
5. **`StoreRankingChart`**: Mostra top 5 saldos bancários por loja — bom dado, mas renderizado sozinho sem contexto de faturamento nem contas.

**Resultado:** O gestor abre o sistema e vê um número grande centralizado que não responde às perguntas reais de negócio: "Quanto tenho disponível? Quanto preciso pagar? O que sobra?".

## Solução Proposta

Reescrever a rota `src/routes/index.tsx` e os componentes de dashboard para uma **grade fintech executiva de 3 faixas**:

### Faixa Topo — KPIs Críticos (4 cards)
| Card | Dado | Fonte |
|---|---|---|
| Saldo Total | Soma de `bank_total` das reconciliações mais recentes por loja | `reconciliations` |
| Caixa Atual | Saldo bancário positivo + Dinheiro em loja (patio_os dinheiro) + A receber | Cálculo composto |
| Contas a Pagar | Soma de `valor_em_aberto` de `oficina_contas` WHERE tipo='PAGAR' e status≠'PAG' | `oficina_contas` |
| Diferença | Caixa Atual − Contas a Pagar | Cálculo |

### Faixa Meio — Blocos Analíticos (4 cards)
| Card | Dado | Fonte |
|---|---|---|
| Faturamento Atual vs Anterior | OS Total do mês selecionado vs mês anterior | `reconciliations.os_total` agrupado por mês |
| Fluxo de Caixa | Caixa Atual − Caixa do mês anterior (bank_total mais recente vs anterior) | `reconciliations` |
| A Receber | Soma de `paid_value` de OSs `em_aberto` + `pago_parcial` | `patio_os` |
| Veículos em Pátio | Count de OS `em_aberto` e valor total retido | `patio_os` |

### Faixa Base — Tabela Por Loja + Gráfico
- **Tabela**: Loja | Saldo Atual | Faturamento do Período | Contas do Período | Resultado Líquido | Status Conciliação
- **Gráfico**: 1 `BarChart` horizontal por loja — "Faturamento × Contas" (Recharts já disponível)

## Componentes a DELETAR (sem valor no novo layout)
- `QuickActions.tsx` — remover do dashboard (pode manter o arquivo para usar em outro lugar)
- `MotorStatus.tsx` — remover do dashboard (informação pertence à tela de Conciliação)
- `HeroBalance.tsx` — substituído pelos 4 KPI Cards do topo

## Componentes a CRIAR
- `KpiCard.tsx` — card genérico para KPI (valor, label, tendência, ícone, cor)
- `useDashboardV2.ts` — hook que agrega todos os dados necessários numa única query composta
- `StoreTableDashboard.tsx` — tabela por loja (substitui RecentActivity como bloco base)
- `FaturamentoVsContasChart.tsx` — gráfico de barras horizontais faturamento × contas por loja

## Contratos de Dados

### Fontes confirmadas (tabelas existentes)
- `reconciliations` → `store_id`, `date`, `os_total`, `bank_total`, `financial_total`, `divergence`, `status`
- `patio_os` → `store_id`, `status`, `total_value`, `paid_value`, `payment_method`
- `oficina_contas` → `store_id`, `valor_em_aberto`, `tipo`, `status` ← tabela nova criada na migração 20260803
- `transactions` → `store_id`, `amount`, `type`, `source`, `target_date`

### Cálculos padronizados
```
saldo_total = SUM(bank_total mais recente por loja de reconciliations)
faturamento_atual = SUM(os_total de reconciliations WHERE mês = selectedMonth)
faturamento_anterior = SUM(os_total WHERE mês = selectedMonth - 1)
contas_a_pagar = SUM(valor_em_aberto de oficina_contas WHERE tipo='PAGAR' AND status NOT IN ('PAG'))
a_receber = SUM(total_value - paid_value de patio_os WHERE status IN ('em_aberto','pago_parcial'))
veiculos_patio = COUNT(patio_os WHERE status='em_aberto')
caixa_atual = saldo_total + a_receber
fluxo_caixa = saldo_total - saldo_total_mes_anterior
diferenca = caixa_atual - contas_a_pagar
```

## Features Existentes Impactadas
- `src/routes/index.tsx` — reescrita completa da composição visual
- `HeroBalance.tsx`, `QuickActions.tsx`, `MotorStatus.tsx` — removidos do dashboard (arquivos mantidos)
- `StoreRankingChart.tsx` — mantido mas integrado à faixa base com dados ampliados
- `RecentActivity.tsx` — rebaixado para opcional/removido
- Hook `useDashboardSummary` — mantido mas estendido

## Risco Principal
`oficina_contas` depende do cron de sync rodar para ter dados. Se a tabela estiver vazia (usuário novo ou cron não rodou), os cards de "Contas a Pagar" mostrarão R$ 0 — o comportamento é correto mas pode confundir. Solução: tooltip explicativo e estado vazio informativo.

## Não fazer
- Não criar novas tabelas no banco. Todos os dados já existem.
- Não usar TailwindCSS ad-hoc. Usar as CSS vars do design system existente (`--color-primary`, `--bg-surface`, etc.).
- Não criar um gráfico de linha ou pizza. O único gráfico é o bar chart horizontal.
