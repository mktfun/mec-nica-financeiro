# Design: Vinculação de Dinheiro no Cofre e Saldo Consolidado por Filial (295)

## Arquitetura de Agregação por Filial

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        COMPOSIÇÃO DO SALDO CONSOLIDADO POR FILIAL                      │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. EXTRATO OFX (ITAÚ)       ➔ Último bank_total da filial na data                      │
│ 2. DINHEIRO NO COFRE        ➔ SUM(amount) em store_cash_vault para a filial            │
│ 3. MAQUININHAS (REDE)       ➔ Total líquido de vendas do POS a compensar               │
│                                                                                        │
│ ➔ SALDO CONSOLIDADO = (1) Extrato OFX + (2) Dinheiro no Cofre + (3) Maquininhas        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

## Mapeamento por Filial (26/08/2026)

| Loja | OFX (Itaú) | Dinheiro no Cofre | Maquininhas | Saldo Consolidado |
|---|---|---|---|---|
| Dom Pedro (st-01) | -R$ 1.165,43 | R$ 0,00 | +R$ 5.884,23 | +R$ 4.718,80 |
| Jabaquara (st-02) | -R$ 242,73 | R$ 0,00 | +R$ 6.578,59 | +R$ 6.335,86 |
| Santo André (st-08) | -R$ 12.311,55 | +R$ 350,00 (OS 2398) | +R$ 213,77 | -R$ 11.747,78 |
| ... demais 7 lojas | ... | R$ 0,00 | ... | ... |
| **TOTAIS CONSOLIDADOS** | **R$ 30.188,72** | **+R$ 350,00** | **+R$ 22.376,13** | **R$ 52.914,85** |

## Cenários de Teste

- **Cenário 1 (Dinheiro no Cofre da Filial Santo André):**
  - Acessar o modal "Ver Lojas ↗".
  - *Resultado:* A linha de Santo André exibe badge amarelo com `R$ 350,00` e o botão *"Dar Baixa"*.
- **Cenário 2 (Totais do Rodapé do Modal):**
  - Conferir linha "TOTAIS CONSOLIDADOS".
  - *Resultado:* OFX R$ 30.188,72, Dinheiro R$ 350,00, Maquininhas R$ 22.376,13, Total R$ 52.914,85.
