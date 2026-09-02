# 🏛️ Conselho Deliberativo Técnico: Refatoração da Visão Geral

**Data:** 02/09/2026  
**Tema:** Refatoração Completa do Zero da Tela de Visão Geral (Dashboard Executivo da Diretoria)  
**Status:** CONCLUÍDO (Decisão: **GO — Aprovado com Arquitetura Executiva**)

---

## 👥 Round 1: Posições das Personas

### 1. O Pragmático
> *"A tela quebrou porque o hook `useBackendDashboard` mapeava propriedades inexistentes (`res.porLoja`, `res.saldoTotal`), enquanto a RPC retornava `data.stores`, `data.total_saldo`, etc. Não devemos inventar nova lógica matemática no frontend. Devemos conectar a tela diretamente à RPC canônica `get_daily_reconciliation_summary` / `get_dashboard_metrics`, que já está validada com 100% de paridade nos fechamentos de agosto e setembro."*

### 2. O Cético
> *"Uma tela para a Diretoria não pode tolerar telas pretas, 'NaN' ou 'R$ 0,00' quando houver delay de rede. Precisamos de TypeScript estrito (`DashboardExecutiveData`), Skeletons elegantes que espelham o layout exato durante o fetch, e fallbacks robustos para quando uma filial não tiver movimento. Além disso, a navegação entre datas deve carregar dados atômicos sem piscar ou perder o contexto."*

### 3. O Arquiteto
> *"A tela deve seguir o Design System Dark Zinc-950 / Indigo-500 / Emerald, estruturada em 4 blocos de elite:*
> 1. **Header Executivo:** Data ativa, status do dia (Aprovado / Em Conciliação), seletor de dias com fechamento real e resumo rápido.
> 2. **Bento Grid dos 6 Indicadores Mestres:** Caixa Atual Consolidado, Faturamento Total (com odômetro e meta), Subtotal de Contas, Fluxo de Caixa Líquido, Saldo Bancos Líquido (com Cheque Especial detalhado) e Veículos Retidos em Pátio (com valor total).
> 3. **Matriz de Performance das 10 Filiais:** Tabela executiva com ranking por faturamento, saldo em banco, pátio retido, status de conciliação e acesso em 1 clique para a filial.
> 4. **Painel de Tendência Macro:** Gráfico comparativo de Faturamento vs Contas vs Caixa nos últimos 7 fechamentos."*

### 4. O Advogado do Diabo
> *"A diretoria não quer apenas uma tabela fria. Quer saber em 3 segundos:*
> - *O caixa do grupo cresceu ou diminuiu hoje?*
> - *Qual loja faturou mais e qual loja está com mais dinheiro preso no pátio?*
> - *Temos alguma conta bancária no negativo estourando juros?*
> *O design precisa destacar esses 3 insights instantaneamente através de mini-badges inteligentes."*

---

## ⚔️ Round 2: Refutação Cruzada & Consenso

- **O Pragmático aceitou o Cético:** O contrato de dados será tipado formalmente em `src/types/dashboard.ts` e haverá um mapper puro testado via script para blindar contra qualquer `undefined`.
- **O Arquiteto incorporou o Advogado do Diabo:** Além da tabela, haverá uma barra de "Executive Insights" no topo mostrando o campeão de faturamento do dia e o alerta de cheque especial.
- **O Cético aprovou o layout modular:** 0 dependências externas desnecessárias, usando apenas TanStack Query, Framer Motion, Lucide Icons e Tailwind CSS.

---

## 📜 Round 3: Síntese e Decisão Final (GO)

**Recomendação Unânime do Conselho:**
1. **Contrato de Dados:** Mapear diretamente da RPC `get_dashboard_metrics` / `get_daily_reconciliation_summary` com fallback para `daily_snapshots`.
2. **Design Visual:** Padrão Fintech Dark Zinc-950, cantos arredondados `rounded-2xl`, bordas sutis `border-zinc-800/80`, tipografia mono tabular para valores financeiros, badges esmeralda/âmbar/carmesim.
3. **Módulos da Tela:**
   - `ExecutiveHeader.tsx` (Controles temporais + Badge de Fechamento Oficial)
   - `ExecutiveKpiBentoGrid.tsx` (6 KPIs Mestres com micro-variações percentuais)
   - `ExecutivePillarsAccordion.tsx` (Detalhamento visual dos 5 Pilares de Caixa)
   - `ExecutiveStoreMatrix.tsx` (Matriz analítica com busca, ranking e status das 10 lojas)
   - `ExecutiveMacroCharts.tsx` (Gráfico de evolução financeira multi-dias)
