# Design: Equalizacao da Conciliacao com a Planilha Oficial (CONCILIACAO 2708.xlsx) (304)

## Arquitetura e Mapeamento de Celulas do Excel

| Indicador Contabil | Formula / Celula Excel | Valor Planilha Oficial | Acao no Sistema |
|---|---|:---:|---|
| **SALDO BANCOS (OFX Positivo)** | `G13 = SUM(E17,E27,E38,E49,E72,E85,E100,E114)` | **R$ 82.615,97** | Card Bancos exibe `saldo_bancos_positivo` (8 contas) |
| **DINHEIRO MP** | `G14` | **R$ 20.225,00** | Campo manual `dinheiro_mp` |
| **A RECEBER** | `G15 = SUM(RECEBIVEIS!B3, B8, B16)` | **R$ 8.349,67** | Campo manual `a_receber_manual` |
| **NA LOJA OS (PATIO)** | `G16 = SUM(OS!D10..D92)` | **R$ 65.603,74** | Tabela `patio_os` / `reconciliations.na_loja_os` |
| **SOMA DOS ATIVOS** | `G17 = SUM(G13:G16)` | **R$ 176.794,38** | Soma interna dos 4 pilares ativos |
| **(-) CHEQUE ESPECIAL** | `G18 = SUM(E6,E61)` | **-R$ 22.040,20** | Dedução única no fechamento contábil |
| **CAIXA ATUAL** | `G21 = G17 - G18` | **R$ 154.754,18** | `caixa_atual` oficial do dia |
| **CAIXA ANTERIOR** | `G22` | **R$ 151.642,60** | `caixa_anterior` (26/08) |
| **FLUXO DE CAIXA** | `G23 = G21 - G22` | **+R$ 3.111,58** | `fluxo_caixa` do dia |
| **FATURAMENTO DO DIA** | `G26 = G43 - G44` | **R$ 23.864,38** | Odometro Hoje (891.663,62) - Ontem (867.799,24) |
| **VALOR DISP. CONTAS** | `G29 = G27 - G28` | **R$ 20.752,80** | Faturamento (23.864,38) - Fluxo (3.111,58) |
| **CONTAS A PAGAR** | `G30 = 9.535,72 + 10.000 + 1.217,11` | **R$ 20.752,83** | Contas + Prolabore Daniel + Juros Rede |
| **DIFERENCA FINAL** | `G31 = G29 - G30` | **-R$ 0,03** | Diferença desprezível de 3 centavos (Aprovado ?) |

## Mudancas no Backend & Frontend

### 1. RPC `get_daily_reconciliation_summary`
- `saldo_bancos_positivo`: **R$ 82.615,97**
- `saldo_negativo_itau`: **R$ 22.040,20**
- `total_saldo_banco_positivo`: **R$ 82.615,97** (igual a G13 do Excel)
- `caixa_atual`: **R$ 154.754,18**
- `faturamento_periodo`: **R$ 23.864,38**
- `valor_disp_contas`: **R$ 20.752,80**
- `subtotal_contas`: **R$ 20.752,83**
- `diferenca_final`: **-0.03**

### 2. Frontend `ResumoDiaPanel.tsx`
- Sincronizar o Card "Saldo Bancos" para exibir `R$ 82.615,97`.
- Exibir Caixa Atual de `R$ 154.754,18` e Fluxo de Caixa de `+R$ 3.111,58`.
- Exibir Faturamento do Dia de `R$ 23.864,38` e Valor Disp. Contas de `R$ 20.752,80`.
- Exibir Contas a Pagar de `R$ 20.752,83` com Diferença Final de `-R$ 0,03` (Aprovado).
