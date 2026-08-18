# Proposal: Faturamento Incremental no Gráfico Macro, Suporte a Saldo Negativo e Nomenclatura "Unidades" (229)

## 1. Ajustes Solicitados pelo Usuário

### A. Faturamento Incremental no Gráfico de Evolução Macro
- **Problema:** O gráfico macro plotava o odômetro acumulado bruto (ex: 496k e 592k), distorcendo a escala visual em relação ao Saldo e às Contas do dia.
- **Solução:** Na RPC PostgreSQL `get_dashboard_metrics`, calcular o faturamento de cada dia no `historicoMacro` como o **Faturamento Incremental do Período** (14/08: R$ 75.005,10 | 17/08: R$ 96.172,06), alinhado 100% com o card principal.

### B. Tratamento Robusto de Saldo Negativo por Unidade
- **Problema:** Contas bancárias com saldo negativo (cheque especial/descoberto) não podem compor fatias normais de gráfico em pizza (geometria inválida).
- **Solução:**
  - **No Donut Chart:** Renderizar a distribuição dos saldos positivos e exibir um **Badge de Alerta Informativo** em vermelho/coral quando houver unidades com saldo negativo: `⚠️ 1 unidade com saldo negativo (-R$ X)`.
  - **No Painel de Ranking Lateral:** Unidades com saldo negativo são listadas com destaque em vermelho (`var(--color-accent-danger)`), badge de `Negativo`, barra proporcional em vermelho e sinal negativo.
  - **Nos Indicadores de Topo:** Exibir o Saldo Líquido Real (soma algébrica das positivas menos as negativas) e identificar se há unidade em estado descoberto.

### C. Padronização da Nomenclatura ("Filial" $\rightarrow$ "Unidade")
- Substituir todos os termos "Filial / Filiais" por "Unidade / Unidades" em todo o Dashboard (Tabs, títulos, tooltips, legendas, cards de ranking e contadores).
