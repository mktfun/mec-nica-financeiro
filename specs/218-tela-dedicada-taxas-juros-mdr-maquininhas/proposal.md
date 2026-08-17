# Proposal: Tela Dedicada de Auditoria de Taxas, MDR de Maquininhas e Juros (218)

## Problema
Atualmente, as informações de auditoria de taxas de cartão (MDR) e divergência contratual de maquininhas estavam dispersas e o menu continha a rota legada `/alertas`.
O gestor financeiro precisa de um painel completo para:
1. **Ver por dia** a evolução do faturamento bruto, líquido, retenção de taxas em R$ e a % de taxa média diária cobrada pelas adquirentes (Rede).
2. **Auditar por transação** (linha a linha) cada venda de cartão com:
   - Valor Bruto da Venda (R$)
   - Valor Líquido Creditado (R$)
   - Valor Total Retido de Taxa (R$)
   - **Taxa Efetiva Real Cobrada (%)** = $\left(1 - \frac{\text{valor\_liquido}}{\text{valor\_venda\_bruto}}\right) \times 100$
   - **Taxa Contratada de Referência (%)**
   - **Desvio / Diferença (%)** e **Valor Cobrado a Maior (R$)**
3. Identificar instantaneamente discrepâncias contratuais por filial, bandeira e modalidade de parcelamento.
4. Exportar a relação das cobranças indevidas formatada em CSV para contestação com a adquirente/gerente de contas.

## Solução Proposta
1. **Substituição da rota `/alertas` por `/taxas`:**
   - Criar `src/routes/taxas.tsx` integrada ao AppShell.
   - Atualizar a navegação (`Sidebar.tsx` e `BottomNav.tsx`) trocando o item *Alertas* por *Taxas & Juros* (`/taxas`) com ícone `%`.
   - Manter redirect de `/alertas` para `/taxas`.
2. **Visão Analítica Diária (Evolução & Agrupamento por Dia):**
   - Gráfico diário de barras/linhas com Bruto, Líquido e Taxas retidas.
   - Tabela de consolidação diária: Data, Qtd Transações, Bruto (R$), Líquido (R$), Taxas Retidas (R$), MDR Médio Efetivo (%) vs MDR Contratado (%).
3. **Visão Analítica Transacional (Linha a Linha):**
   - Tabela com paginação, busca por NSU/Autorização, filtros por Loja, Bandeira, Modalidade e status de divergência.
   - Colunas explícitas com valores monetários e percentuais de cada venda: Bruto, Líquido, Taxa R$, MDR Efetivo %, MDR Contratado %, Desvio % e Prejuízo R$.
4. **Gerenciador de Contratos de Taxas (`pos_fee_contracts`):**
   - Modal para cadastro e alteração das taxas contratadas por bandeira e prazo de parcelamento.
5. **Exportação CSV para Contestação:**
   - Gera arquivo detalhado com todas as transações que tiveram cobrança a maior para solicitação de estorno.

## Contratos de Dados
- **Tabelas Supabase:**
  - `pos_fee_contracts`: `acquirer`, `brand`, `method`, `installments_range`, `contracted_mdr_percent`, `anticipation_fee_percent`, `active`.
  - `receivables` e relatórios de vendas importados da Rede.
- **RPCs:**
  - `get_mdr_audit_summary(p_start_date, p_end_date, p_store_id)`

## API / Interface
- **Componentes:**
  - `src/routes/taxas.tsx`
  - `src/components/taxas/TaxasDashboardView.tsx`
  - `src/components/taxas/DailyFeesBreakdownTable.tsx`
  - `src/components/taxas/TransactionFeesTable.tsx`
  - `src/components/taxas/ContractFeeEditorModal.tsx`
- **Hooks:**
  - `src/hooks/useMdrAudit.ts`
  - `src/hooks/useFeeContracts.ts`

## Risco Principal
- **Risco:** Volume elevado de transações de cartão por período impactar a renderização da tabela.
- **Probabilidade:** Média.
- **Impacto:** Reversível.
- **Mitigação:** Paginação de 25/50 itens por página com busca reativa e totalizadores agregados no topo.
