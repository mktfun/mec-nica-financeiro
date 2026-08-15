# Design: 209-justify-orphan-ofx-and-store-card-revenue-sync

## 1. Arquitetura Técnica

```
  ┌──────────────────────────────────────────────────────────┐
  │         Aba 4: Banco (Sem Origem)                        │
  │         Linha: "Depósito Avulso R$ 300,00"               │
  └────────────────────────────┬─────────────────────────────┘
                               │
                [Botão: Justificar Entrada]
                               │
                               ▼
  ┌──────────────────────────────────────────────────────────┐
  │         OrphanCategorizationModal                        │
  │  - Categoria: Venda de Sucata / Reembolso Limpa Baú      │
  │  - Justificativa: "Venda de sucata de baterias"          │
  └────────────────────────────┬─────────────────────────────┘
                               │
            [useCategorizeOrphan / Mutation]
                               │
                               ▼
  ┌──────────────────────────────────────────────────────────┐
  │          1. UPDATE transactions SET                      │
  │             manual_category = 'venda_sucata',            │
  │             manual_justification = '...'                 │
  │                                                          │
  │          2. UPDATE / UPSERT daily_snapshots SET          │
  │             faturamento_outros_valor = SUM(justificados),│
  │             faturamento_outros_desc = '...'              │
  └────────────────────────────┬─────────────────────────────┘
                               │
                               ▼
  ┌──────────────────────────────────────────────────────────┐
  │         Painel de Conciliação (ResumoDiaPanel)           │
  │  Faturamento Líquido (R$ 75.005,10)                      │
  │  + Faturamento Outros Justificado (R$ 1.182,15)          │
  │  = Faturamento Total Atualizado (R$ 76.187,25)           │
  │  --> ZERA A DIFERENÇA FINAL (-R$ 0,00)!                  │
  └──────────────────────────────────────────────────────────┘
```

## 2. Componentes e Hooks Afetados

### 2.1 `src/components/conciliacao/OfxSemMatchTable.tsx`
- Adicionar estado `categorizingTx: any | null` para controlar a abertura do modal de justificativa.
- Em cada linha de entrada avulsa:
  - Se `row.manual_category`: exibir Badge com o nome da categoria (ex: `VENDA DE SUCATA`, `REEMBOLSO LIMPA BAÚ`) e tooltip com a justificativa.
  - Se não categorizada: exibir botão **"Justificar Entrada"** (com ícone `FileEdit`).
- Ao concluir a justificativa com sucesso:
  - Invalida queries `['reconciliation_views']`, `['daily-snapshot']`, `['daily-reconciliation-summary']`, `['transactions']`.
  - Exibe toast de sucesso e atualiza o estado localmente.

### 2.2 `src/hooks/useConciliacao.ts` (`useReconciliationViews`)
- Para a Aba 1 (`osVsRede`):
  - Calcular `storeCardRevenue = cardOsList.reduce(...) || totalAdquirenteOfx || totalRedeBruto`.
  - Garantir que cada transação de cartão da loja tenha `os_total` associado à receita de maquininha do sistema/banco, evitando exibir `R$ 0,00`.
- Para a Aba 4 (`ofxSemMatch`):
  - Retornar todas as propriedades `id`, `title`, `subtitle`, `amount`, `occurred_at`, `counterpart_name`, `manual_category`, `manual_justification`.

### 2.3 `src/components/conciliacao/ResumoDiaPanel.tsx` e `useDashboardV2.ts`
- Incluir `faturamento_outros_valor` no cálculo de `Faturamento Total` e `Valor Disponível Contas`:
  ```ts
  const faturamentoTotalDia = faturamentoLiquidoDia + (Number(currentSnapshot?.faturamento_outros_valor) || 0);
  const valorDispContas = faturamentoTotalDia - fluxoCaixaCalculado;
  const diferencaFinal = Math.abs(valorDispContas) - subtotalContasCalculado;
  ```

---

## 3. Cenários de Verificação

- **Cenário 1: Visualização do Faturamento de Cartão**:
  - Usuário abre Conciliação de Dom Pedro (DP) → Aba 1 exibe Faturamento Sistema compatível com o valor de maquininha que entrou no banco (R$ 5.054,52 bruto / R$ 4.911,48 líquido).
- **Cenário 2: Justificativa de Entrada Avulsa (ex: Reembolso / Sucata)**:
  - Usuário entra na Aba 4 (Banco Sem Origem) → Clica em "Justificar Entrada" em um lançamento de R$ 300,00 → Seleciona "Venda de Sucata" e digita justificativa → O lançamento ganha a Badge correspondente, o valor soma em `faturamento_outros_valor`, e no painel de conciliação a Diferença Final é recalculada e zerada!
