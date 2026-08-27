# Design: Blindagem Definitiva de Snapshots Imutáveis e Consolidação Canônica de 26/08 (299)

## Arquitetura de Imutabilidade

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                          FLUXO DE FECHAMENTO & IMUTABILIDADE                           │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. Salvar Fechamento (UI)                                                              │
│    ➔ Upsert em daily_snapshots com is_closed = true, closed_at = NOW(), metadata       │
│                                                                                        │
│ 2. Consulta get_daily_reconciliation_summary(p_date)                                   │
│    ➔ Se daily_snapshots.is_closed = true:                                              │
│         CURTO-CIRCUITO: Retorna Snapshot Imutável (latência < 5ms)                     │
│         ZERO CONSULTA A patio_os, ofx_transactions OU reconciliations                  │
│                                                                                        │
│ 3. Próximo Dia (ex: 27/08):                                                            │
│    ➔ SELECT caixa_atual FROM daily_snapshots WHERE date < '2026-08-27'                 │
│         ➔ Lê perfeitamente R$ 151.642,60 como Caixa Anterior!                          │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

## Payload Canônico do Dia 26/08/2026

| Campo | Valor Canônico 26/08 |
|---|---|
| `date` | `2026-08-26` |
| `is_closed` | `true` |
| `saldo_bancario` | `R$ 50.794,86` (OFX 30.188,72 + A Comp. 20.256,14 + Cofre 350,00) |
| `dinheiro_mp` | `R$ 15.323,00` |
| `a_receber_manual` | `R$ 8.349,67` |
| `total_patio` | `R$ 77.525,07` |
| `caixa_atual` | `R$ 151.642,60` |
| `saldo_negativo_itau` | `R$ 15.943,52` |
| `faturamento` | `R$ 867.870,82` (Odômetro Base + R$ 29.046,09 de Faturamento Líquido) |
| `contas_a_pagar` | `R$ 16.974,94` |
| `juros_rede` | `R$ 2.069,58` |
| `metadata.caixa_anterior` | `R$ 141.440,93` |
| `metadata.fluxo_caixa` | `R$ 10.201,67` |
| `metadata.faturamento_periodo` | `R$ 29.046,09` |
| `metadata.valor_disp_contas` | `R$ 18.844,42` |
| `metadata.subtotal_contas` | `R$ 19.044,52` |
| `metadata.diferenca_final` | `-R$ 200,10` |

## Cenários de Teste (Quality Gate)
- **Cenário 1 (Imutabilidade de 26/08):**
  - Consultar `get_daily_reconciliation_summary('2026-08-26')`.
  - *Resultado:* Retorna `is_closed: true`, Caixa Atual R$ 151.642,60, Caixa Anterior R$ 141.440,93, Fluxo R$ 10.201,67, Diferença -R$ 200,10.
- **Cenário 2 (Caixa Anterior do Dia 27/08):**
  - Consultar `get_daily_reconciliation_summary('2026-08-27')`.
  - *Resultado:* `caixa_anterior` do dia 27/08 é exatamente R$ 151.642,60.
- **Cenário 3 (Blindagem contra alterações em OSs):**
  - Fazer mutação em OSs com data aberta hoje.
  - *Resultado:* O dia 26/08 permanece 100% inalterado.
