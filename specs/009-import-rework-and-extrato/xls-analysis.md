# Análise da Planilha 1543_ConferenciaOSxFinanceiro.xls

## Estrutura detectada

| Col | Nome | Tipo | Exemplo |
|-----|------|------|---------|
| 0 | OS | Número | 1663 |
| 1 | Data (Abertura/Faturamento) | Serial Excel | 46146 → 04/05/2026 |
| 2 | Cliente | Texto | MARCO HENRIQUE |
| 3 | Placa | Texto | HNY4E77 |
| 4 | Regra de Negociação | Texto | null |
| 5 | Status | Texto | "Finalizada" / "Aberta" |
| 6 | Finalizada em | Serial Excel (float) | 46160.53 → 28/05/2026 14:30 |
| 7 | Data do Faturamento | Serial Excel | 46146 → 04/05/2026 |
| 8 | R$ Produto | Número | 3613.98 |
| 9 | R$ Serviço | Número | 3786.00 |
| 10 | R$ Total da OS | Número | 7399.99 |
| 11 | Total Pagto na OS | Número | 7400.00 |
| 12 | Restante na OS | Número | -0.009 |
| 13 | Total no Financeiro | Número | 0 |
| 14 | Forma(s) de Pagamento | Texto | "PIX: 7400.00; Credito: 200.00;" |

## Formas de Pagamento identificadas
- `PIX` → recebe no mesmo dia (D+0)
- `Credito` → recebe em 30 dias (D+30) 
- `Debito` → recebe no dia seguinte (D+1)
- `PAGAMENTO EM CONTA` → recebe no mesmo dia (D+0)
- `Dinheiro` → não apareceu nesta amostra, mas usuário mencionou

## Datas importantes
- **Data (col 1)**: Data de abertura/entrada da OS
- **Data do Faturamento (col 7)**: = Data de abertura (mesmo valor)
- **Finalizada em (col 6)**: Data real de fechamento/pagamento — ESTA é a data usada para o "dia do faturamento"

## Rodapé da planilha (linha TOTAL)
- R$ Produto: 61.955,69
- R$ Serviço: 47.502,18
- R$ Total OS: 109.457,87
- Total Pagto: 106.120,20
- Restante: 3.337,67

## Bug no Parser Atual
O parser filtra por `closed_at === targetDate` mas a planilha tem apenas 1 OS com `Finalizada em` = 28/05/2026 (OS 1686: R$ 8.550,00 Crédito). Por isso só aparece R$ 8.550 crédito.
O usuário quer importar TODA a planilha do período e ver o histórico filtrado por data, não importar só o dia específico.
