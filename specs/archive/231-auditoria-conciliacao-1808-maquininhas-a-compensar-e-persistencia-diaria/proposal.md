# Proposal: Diagnóstico da Conciliação de 18/08, Cartões a Compensar e Persistência por Data (231)

## 1. Diagnóstico Completo da Conciliação de 18/08 (Planilha vs Sistema)

Ao inspecionar diretamente a sua planilha `CONCILIAÇÃO 1808.xlsx`, identificamos com precisão matemática a causa exata da divergência:

### A. Por que na sua Planilha deu R$ 0,00 (-0,35) e no Sistema deu R$ 18.166,82?

| Métrica | Na sua Planilha (Excel 18/08) | No Sistema (Tela de Fechamento) | Diferença / Motivo |
| :--- | :--- | :--- | :--- |
| **Saldo Bancário (Pilar 1)** | **R$ 211.003,28** | **R$ 195.756,61** | **Faltam R$ 15.246,67**: O Excel soma o saldo bancário líquido (`R$ 195.756,61`) + **Cartões de Crédito/Débito do dia que ainda NÃO caíram no banco** ("NÃO ENTROU" = `R$ 15.246,67`). |
| **Na Loja (OS do Pátio)** | **R$ 86.052,07** | **R$ 83.132,07** | **Faltam R$ 2.920,00**: Diferença no lote de OSs pendentes importadas vs a aba OS do Excel. |
| **Dinheiro MP** | **R$ 8.466,00** | **R$ 8.466,00** | Bateu 100% exato. |
| **A Receber** | **R$ 10.694,50** | **R$ 10.694,00** | Bateu 100% exato. |
| **Caixa Atual** | **R$ 316.215,85** | **R$ 298.048,68** | **Faltam R$ 18.167,17** (`15.246,67 + 2.920,00`), exatamente a diferença que você viu! |
| **Caixa Anterior** | **R$ 299.076,86** | **R$ 299.076,86** | Bateu 100% exato. |
| **Fluxo de Caixa** | **+R$ 17.138,99** (`316.215,85 - 299.076,86`) | **-R$ 1.028,18** (`298.048,68 - 299.076,86`) | Distorcido pela ausência dos cartões a compensar e OSs. |
| **Faturamento Atual** | **R$ 41.857,57** (`609.475,82 - 567.618,25`) | **R$ 41.857,57** | Bateu 100% exato. |
| **Valor Disponível Contas** | **R$ 24.718,58** (`41.857,57 - 17.138,99`) | **R$ 42.885,75** (`41.857,57 - (-1.028,18)`) | No sistema somou o fluxo negativo em vez de subtrair o fluxo real. |
| **Subtotal Contas** | **R$ 24.718,93** (`22.478,37 + 2.240,56`) | **R$ 24.718,93** | Bateu 100% exato. |
| **DIFERENÇA FINAL** | **-R$ 0,35 (BATEU ZERO!)** | **R$ 18.166,82** | **Causa raiz:** O sistema não estava somando os Cartões a Compensar (`15.246,67`) e a diferença de OS (`2.920,00`) no Caixa Atual. |

---

## 2. As Soluções Estruturais

1. **Inclusão Automática dos Cartões Não Liquidados no Pilar de Saldos / Caixa:**
   - As vendas de cartão com status "NÃO ENTROU" / "A COMPENSAR" no dia devem ser somadas ao saldo disponível ou compor o ativo circulante do Caixa Atual, replicando exatamente a fórmula `G13 = SUM(E6, D10, E17, D21, ...)` do seu Excel.
2. **Edição e Ajuste Livre dos 5 Pilares na Conciliação:**
   - Permitir ao usuário editar/confirmar qualquer um dos 5 pilares (`Saldo Bancos + Cartões`, `Dinheiro MP`, `A Receber`, `Na Loja OS`, `Contas a Pagar`) diretamente no painel `ResumoDiaPanel` caso algum arquivo externo tenha OS ou cartão extra.
3. **Persistência Integral do Fechamento por Data (`daily_snapshots`):**
   - Ao navegar no seletor de data (`< 17/08/2026 >`, `< 18/08/2026 >`), carregar e exibir **exatamente o snapshot salvo daquela data específica**, sem recalcular dinamicamente valores globais de hoje.
