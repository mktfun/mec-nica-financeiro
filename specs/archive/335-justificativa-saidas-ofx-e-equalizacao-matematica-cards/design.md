# Design: Justificativa Completa de Saídas OFX e Equalização Matemática do Split nos Cards (335)

## 1. Arquitetura e Fluxo de Dados

```
[Operador na Tela da Filial: /conciliacao/st-06]
                    │
                    ▼
       (Clica em "Justificar" no Débito OFX)
                    │
                    ▼
       [OrphanCategorizationModal]
       ├── Modo: transactionType = 'out'
       ├── Categoria: 'Peças / Fornecedor Avulso'
       └── Destino: 'Somar ao Contas a Pagar (Despesa Extra)'
                    │
                    ▼
          [useCategorizeOrphan]
                    │
                    ▼
     [RPC resolve_orphan_saida_ofx]
      ├── Cria/Atualiza em daily_manual_bills (is_extra = true)
      └── Atualiza ofx_transactions (matched_bill_id = <id>)
                    │
                    ▼
  [Invalidação de Cache no React Query]
  - ['daily-reconciliation-summary']
  - ['daily-manual-bills']
  - ['transactions']
                    │
                    ▼
   [RPC get_daily_reconciliation_summary]
      ├── Recalcula contas_loja_total
      └── dif_saidas ZERA (R$ 0,00)
                    │
                    ▼
[StoreCardModulo1: Card da Filial Atualiza Instantaneamente para APROVADO]
```

---

## 2. Interfaces TypeScript

```ts
export interface StoreCardData {
  storeId: string;
  storeName: string;
  avatarUrl?: string | null;
  saldoBanco: number | null;
  maquininha: number | null;
  pix: number | null;
  naLojaOs: number | null;
  previsto: number | null;
  diferenca: number | null;
  
  // Entradas (Créditos do Extrato)
  entradasRealizadas: number | null;    // Total OFX Entradas (ex: R$ 14.167,17)
  entradasConciliadas: number | null;   // Créditos Conciliados/Reconhecidos (ex: R$ 12.355,17)
  entradasPrevisto: number | null;      // Fallback retrocompatível
  diferencaEntradas: number | null;     // Diferença a Justificar (+R$ 1.812,00)
  
  // Saídas (Débitos do Extrato)
  saidasOfx: number | null;             // Total OFX Saídas (ex: R$ 4.501,00)
  contasLoja: number | null;            // Contas Conciliadas/Reconhecidas (ex: R$ 350,00 -> R$ 4.501,00)
  diferencaSaidas: number | null;       // Diferença a Justificar (-R$ 4.151,00 -> R$ 0,00)
  
  dinheiroLoja: number | null;
  ofxMaquininhas?: number | null;
  pixTotal?: number | null;
  statusCompensacao: 'entrou' | 'parcial' | 'a_compensar' | 'sem_movimento';
  naoEntrouValor: number | null;
  status: 'approved' | 'divergent' | 'pending' | 'conciliado';
  isMissingData?: boolean;
}
```

---

## 3. Mutações em Arquivos Existentes [MODIFY]

1. `supabase/migrations/20260901000012_fix_store_split_linear_subtraction_and_expenses.sql`:
   - Refinamento da RPC `get_daily_reconciliation_summary` projetando `entradas_conciliadas` e `contas_loja_total` calculados com rigor linear.
2. `src/components/conciliacao/StoreExtratoBancarioView.tsx`:
   - Remoção do bloqueio de saídas na coluna Ações. Habilitar botão "Justificar" para débitos bancários.
3. `src/components/conciliacao/OrphanCategorizationModal.tsx`:
   - Implementação polimórfica para `transactionType === 'out'`.
4. `src/hooks/useCategorizeOrphan.ts`:
   - Chamada da RPC `resolve_orphan_saida_ofx` para transações de saída.
5. `src/components/conciliacao/StoreCardModulo1.tsx`:
   - Rótulos claros e subtração linear no Split ($A - B = C$ com sub-rótulos descritivos).
6. `src/components/conciliacao/ConciliacaoLojasView.tsx`:
   - Repasse dos campos `entradas_conciliadas` e `contas_loja_total`.

---

## 4. Cenários de Verificação (SCAN → INFER → VERIFY → FIX)

### Cenário 1: Justificar Saída Bancária (PIX R$ 4.151,00 em Planalto `st-06`)
- **Estado Inicial:** Planalto com `Saídas OFX: R$ 4.501,00`, `Contas Conciliadas: R$ 350,00`, `Dif. Saídas: -R$ 4.151,00` (Divergente).
- **Ação:** No extrato da Planalto, clicar em "Justificar" no PIX do Luis Henrique de R$ 4.151,00, escolher "Peças" e "Somar ao Contas a Pagar".
- **Resultado Esperado:**
  - `Contas Conciliadas` sobe para `R$ 4.501,00`.
  - `Dif. Saídas` zera para `R$ 0,00` [Verde].
  - Na Holding, `Contas (Manual)` e `Subtotal Contas` somam R$ 4.151,00 perfeitamente.

### Cenário 2: Batimento Linear de Entradas ($14.167,17 - 12.355,17 = 1.812,00$)
- **Estado Inicial:** Planalto com `OFX Entradas: R$ 14.167,17`.
- **Exibição do Card:**
  - Coluna 1: `OFX Entradas: R$ 14.167,17` (Sub-label: `Rede D-1 + Avulsos`)
  - Coluna 2: `Créditos Conciliados: R$ 12.355,17` (Sub-label: `Lotes Identificados`)
  - Coluna 3: `Dif. a Justificar: +R$ 1.812,00` (Sub-label: `Créditos a Justificar`)
- **Resultado Esperado:** O operador enxerga a subtração exata $14.167,17 - 12.355,17 = 1.812,00$, com 0 dúvida cognitiva.
