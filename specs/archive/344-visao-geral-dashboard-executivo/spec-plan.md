# Spec Plan: Refatoração da Tela de Visão Geral (344)

## Tasks

- [x] [DATA & HOOK] Criar o hook executivo canônico `src/hooks/useExecutiveDashboard.ts` integrando a RPC `get_daily_reconciliation_summary` e `get_dashboard_metrics` com tipagem rigorosa `ExecutiveDashboardData`
- [x] [FRONTEND] Criar o componente `src/components/dashboard/ExecutiveHeader.tsx` com data ativa, seletor de fechamentos reais, badge de fechamento aprovado e barra de insights rápidos da diretoria
- [x] [FRONTEND] Criar o componente `src/components/dashboard/ExecutiveKpiBentoGrid.tsx` com os 6 cards mestres (Caixa Atual, Faturamento Total, Contas a Pagar, Fluxo de Caixa, Saldo Bancos Líquido, Pátio Retido)
- [x] [FRONTEND] Criar o componente `src/components/dashboard/ExecutiveFivePillarsBar.tsx` apresentando a equação visual dos 5 Pilares de Caixa
- [x] [FRONTEND] Criar o componente `src/components/dashboard/ExecutiveStoreMatrix.tsx` com a tabela executiva das 10 filiais, ranking de faturamento, barras de proporção, status e links rápidos
- [x] [FRONTEND] Criar o componente `src/components/dashboard/ExecutiveMacroCharts.tsx` com gráficos de tendência financeira dos fechamentos históricos
- [x] [FRONTEND] Refatorar `src/routes/index.tsx` integrando todos os novos componentes com layout Dark Zinc-950 de alto padrão e Skeletons elegantes
- [x] [VERIFY] Testar em tempo real a navegação pelas datas auditadas (14/08, 17/08, 18/08, 19/08, 31/08, 01/09) e executar `npm run build` garantindo zero erros
