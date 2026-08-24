# Design: Ajuste Matemático Estrito da RPC de Conciliação (Spec 273)

## Arquitetura de Cálculo Dinâmico na RPC

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Saldo Bancário Líquido (OFX 10 Bancos)                   │
│    v_saldo_bancos = R$ 61.456,10                            │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Dinheiro no Cofre das Lojas + Cartões a Compensar        │
│    v_dinheiro_em_lojas = R$ 1.845,00                        │
│    v_cartoes_a_compensar = R$ 0,00                          │
│    -> v_total_saldo_banco = R$ 63.301,10                    │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Patrimônio Dinâmico / Caixa Atual                        │
│    v_caixa_atual = v_total_saldo_banco (63.301,10) +        │
│                    v_dinheiro_mp (13.393,00) +              │
│                    v_a_receber (10.694,50) +                │
│                    v_na_loja_os (91.993,66)                 │
│    -> v_caixa_atual = R$ 179.382,26                         │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Fluxo de Caixa Dinâmico                                  │
│    v_fluxo_caixa = 179.382,26 - 150.600,29 = +R$ 28.781,97 │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Valor Disponível Contas                                  │
│    v_valor_disp_contas = 70.811,56 - 28.781,97 = 42.029,59 │
└─────────────────────────────────────────────────────────────┘
```

## Modificações no Backend
- Migração SQL `20260824000005_fix_math_caixa_atual_and_saldo_total.sql` atualizando exclusivamente a lógica interna da função `get_daily_reconciliation_summary`.

## Modificações no Frontend
- Em `ResumoDiaPanel.tsx`, garantir que o valor principal do Card 1 consuma `summary.total_saldo_banco`.
