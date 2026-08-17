# Design: Tela Dedicada de Auditoria de Taxas, MDR de Maquininhas e Juros (218)

## Arquitetura Técnica

```mermaid
graph TD
    A[Menu '/taxas'] --> B[Route 'src/routes/taxas.tsx']
    B --> C[TaxasDashboardView.tsx]
    C --> D[5 Top KPI Cards]
    C --> E[Seletor de Visualização: Visão Diária | Visão Transacional | Visão por Loja]
    C --> F[Gráfico Recharts: Evolução Diária Bruto vs Líquido vs Taxas]
    C --> G[Tabela Diária: Faturamento, Líquido, Taxa R$, % Efetiva e Desvio]
    C --> H[Tabela Transacional: Detalhe Linha a Linha com MDR Real % vs Contrato %]
    C --> I[Modal de Contratos: Edição das taxas no Supabase 'pos_fee_contracts']
    C --> J[Botão de Exportação CSV para Contestação]
```

## Interfaces TypeScript

```typescript
export interface DailyMdrSummary {
  date: string;
  totalGross: number;
  totalNet: number;
  totalFee: number;
  effectiveMdrPercent: number;
  expectedFee: number;
  divergenceAmount: number;
  transactionCount: number;
}

export interface TransactionMdrDetail {
  id: string;
  date: string;
  storeId: string;
  storeName: string;
  establishmentNumber?: string;
  brand: string;
  method: string;
  installments: number;
  nsu?: string;
  authorization?: string;
  grossAmount: number;
  netAmount: number;
  feeAmount: number;
  effectiveMdrPercent: number;
  contractedMdrPercent: number;
  deltaPercent: number;
  overchargedAmount: number;
  status: 'conforme' | 'atencao' | 'divergente';
}
```

## Componentes & Layout

1. **`src/routes/taxas.tsx`:** Rota principal de Taxas & Juros no AppShell.
2. **`src/components/taxas/TaxasDashboardView.tsx`:**
   - **Header:** Filtro de período com atalhos, filtro por loja (10 filiais), filtro por bandeira e botões de ação ("Gerenciar Taxas do Contrato" e "Exportar Contestação CSV").
   - **5 KPI Cards:**
     - 💳 Total Bruto Transacionado (R$)
     - 💵 Total Líquido Creditado (R$)
     - 📉 Custo de Taxas / Retenção Total (R$)
     - 📊 Taxa Efetiva Média Global (%)
     - 🚨 Cobrança a Maior / Prejuízo (R$)
   - **Abas de Visualização Interna:**
     - 📅 **Por Dia (Evolução Diária):** Gráfico comparativo diário + tabela consolidada dia a dia.
     - 📋 **Por Transação (Extrato Linha a Linha):** Tabela detalhada de cada venda com valor bruto, líquido, taxa cobrada em R$, taxa efetiva %, taxa de contrato %, desvio % e prejuízo R$.
     - 🏢 **Por Loja (Multi-Filial 1:N):** Breakdown das 10 filiais com taxa média e desvios por loja.
     - 🏷️ **Por Bandeira:** Comparativo Visa, Mastercard, Elo, Hipercard, PIX.
3. **`src/components/taxas/ContractFeeEditorModal.tsx`:** Modal para o gestor ajustar as alíquotas contratuais no Supabase.
4. **`src/hooks/useFeeContracts.ts`:** Hook TanStack Query para carregar e salvar `pos_fee_contracts`.
5. **`src/hooks/useMdrAudit.ts`:** Hook que consolida as transações importadas, calcula o MDR real linha a linha e agrupa por dia, loja e bandeira.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1 (Visão Diária):** O usuário seleciona o período e vê a tabela dia a dia com a soma do bruto, líquido, retenção em R$ e a % de taxa média de cada dia.
- **Cenário 2 (Visão Transacional):** O usuário clica na aba "Por Transação" e vê a listagem de vendas individuais com o cálculo explícito:
  $$\text{MDR Efetivo (\%)} = (1 - (\text{Líquido} / \text{Bruto})) \times 100$$
  e o desvio contra o contrato cadastrado.
- **Cenário 3 (Filtro de Divergências):** Clicar em "Apenas Cobranças a Maior" filtra instantaneamente a tabela exibindo somente as vendas onde a adquirente cobrou taxa acima do contrato.
- **Cenário 4 (Exportação CSV):** Clicar no botão "Exportar Contestação" gera uma planilha formatada com todas as vendas divergentes e colunas de estorno para o banco.
- **Cenário 5 (Navegação):** O menu lateral exibe "Taxas & Juros" no lugar de "Alertas" e a rota `/alertas` redireciona para `/taxas`.
