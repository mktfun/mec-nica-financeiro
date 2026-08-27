# Design: Equalização Canônica dos Saldos das 10 Filiais e Fechamento Diário (298)

## Arquitetura de Dados

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        COMPOSIÇÃO CANÔNICA POR FILIAL                                  │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. Saldo Bancário OFX (Itaú)        ➔ Extrato bruto bancário (pode ser positivo/neg)    │
│ 2. Cartões A Compensar (Rede Líquido)➔ Vendas do dia D0 a liquidar                     │
│ 3. Dinheiro no Cofre               ➔ Numerário físico da loja (store_cash_vault)      │
│                                                                                        │
│ ➔ SALDO CONSOLIDADO = OFX + Cartões A Compensar + Cofre                                │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

## Mapeamento Exato das 10 Filiais (26/08/2026)

| Loja | OFX Puro | Cartões A Comp. | Cofre | Saldo Consolidado | Status |
|---|---|---|---|---|---|
| **Planalto** | -R$ 3.845,74 | R$ 0,00 | R$ 0,00 | **-R$ 3.845,74** | 🔴 Descoberto |
| **Piraporinha** | R$ 3.552,78 | R$ 399,94 | R$ 0,00 | **R$ 3.952,72** | 🟢 Positivo |
| **Mauá** | R$ 4.455,20 | R$ 0,00 | R$ 0,00 | **R$ 4.455,20** | 🟢 Positivo |
| **Kennedy** | R$ 612,42 | R$ 2.614,62 | R$ 0,00 | **R$ 3.227,04** | 🟢 Positivo |
| **Rudge Ramos** | R$ 2.664,32 | R$ 0,00 | R$ 0,00 | **R$ 2.664,32** | 🟢 Positivo |
| **Santo André** | -R$ 12.311,55 | R$ 213,77 | R$ 350,00 | **-R$ 11.747,78** | 🔴 Descoberto (Cofre R$ 350) |
| **Rei do Módulo** | R$ 14.033,84 | R$ 612,16 | R$ 0,00 | **R$ 14.646,00** | 🟢 Positivo |
| **Jorge Beretta** | R$ 25.663,26 | R$ 1.338,61 | R$ 0,00 | **R$ 27.001,87** | 🟢 Positivo |
| **Dom Pedro I** | -R$ 1.165,43 | R$ 5.884,23 | R$ 0,00 | **R$ 4.718,80** | 🟢 Positivo |
| **Jabaquara** | -R$ 242,73 | R$ 5.615,16 | R$ 0,00 | **R$ 5.372,43** | 🟢 Positivo |

## Cenários de Teste (Quality Gate)
- **Cenário 1 (10 Lojas com Saldos Idênticos ao Excel):**
  - Consultar `get_daily_reconciliation_summary('2026-08-26')`.
  - *Resultado:* Todas as 10 lojas retornam exatamente os valores da tabela acima.
- **Cenário 2 (Caixa Atual Exato):**
  - Validar se Caixa Atual = **R$ 151.642,60**.
- **Cenário 3 (Saldos Negativos Destacados):**
  - Validar que Planalto e Santo André são identificados com saldo negativo e alerta de limite.
