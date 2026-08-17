# Spec Plan: Tela Dedicada de Auditoria de Taxas, MDR de Maquininhas e Juros (218)

## Tasks

- [ ] [FRONTEND/HOOKS] Criar hook `src/hooks/useFeeContracts.ts` para consulta e edição de contratos na tabela `pos_fee_contracts`.
- [ ] [FRONTEND/HOOKS] Expandir `src/hooks/useMdrAudit.ts` com agregação diária (`DailyMdrSummary`) e enriquecimento de transações individuais com cálculo de MDR Efetivo %, MDR Contrato %, Desvio % e Prejuízo R$.
- [ ] [FRONTEND/COMPONENTS] Criar modal `src/components/taxas/ContractFeeEditorModal.tsx` para edição de alíquotas contratuais.
- [ ] [FRONTEND/COMPONENTS] Criar painel completo `src/components/taxas/TaxasDashboardView.tsx` em Dark Zinc-950 com:
  - 5 KPIs de topo (Bruto, Líquido, Custo de Taxas R$, MDR Médio %, Cobrança a Maior R$).
  - Aba 1: **Visão por Dia** (Gráfico diário de evolução + tabela consolidada dia a dia).
  - Aba 2: **Visão por Transação** (Tabela detalhada linha a linha com busca, filtros de divergência, valores e percentuais de cada venda).
  - Aba 3: **Visão por Loja** (Ranking das 10 filiais e taxas cobradas).
  - Aba 4: **Visão por Bandeira** (Comparativo Visa, Master, Elo, Hiper, PIX).
  - Botão de exportação CSV para contestação bancária.
- [ ] [FRONTEND/ROUTES] Criar nova rota `src/routes/taxas.tsx` integrada ao AppShell.
- [ ] [FRONTEND/ROUTES] Atualizar rota `src/routes/alertas.tsx` para redirecionar para `/taxas`.
- [ ] [FRONTEND/LAYOUT] Atualizar `src/components/layout/Sidebar.tsx` e `src/components/layout/BottomNav.tsx` substituindo "Alertas" por "Taxas & Juros" (`/taxas`).
- [ ] [QUALITY/GATE] Executar `cmd.exe /c "npm run build"` garantindo 0 erros de compilação.
- [ ] [TEST] Validar visão diária, extrato linha a linha por transação e exportação de contestação.
