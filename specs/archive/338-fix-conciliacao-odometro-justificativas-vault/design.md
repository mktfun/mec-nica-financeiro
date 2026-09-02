# Design: Correção Integral da Conciliação Diária, Odômetro Anterior, Justificativas e Cofre (338)

## Arquitetura e Fluxo de Dados

```
[Importação Centralizada (Step 0 a 3)]
                    ↓ (Grava draft: is_closed = false)
[Step 1: Pagamentos sem OS (Step1UnregisteredPayments)]
  ├── Busca OFX PIX e POS pendentes com queries corrigidas (sem erro 42703)
  └── Vínculo 1-clique manual com OS da loja
                    ↓
[Step 2: Justificativas (Step2NonRevenueJustifications)]
  ├── Entradas -> Salva ofx_transactions + Upsert daily_revenue_adjustments
  └── Saídas   -> Chama resolve_orphan_saida_ofx + Upsert daily_manual_bills (is_extra=true)
                    ↓
[Step 3: Cofre Daniel (Step3CashVaultDaniel)]
  └── Busca store_cash_vault com join stores(name) (Sem erro 42703 store_name)
                    ↓
[Step 4: Auditoria Final (Step4FinalAuditAndClose) & Dashboard]
  └── Invoca RPC get_daily_reconciliation_summary
        ├── Extrai Odômetro Anterior do Snapshot Anterior (R$ 1.010.869,29)
        ├── Calcula Delta Faturamento OI: R$ 1.030.303,99 - R$ 1.010.869,29 = R$ 19.434,70
        ├── Soma Ajustes de Receita (+ Justificativas de Entradas)
        ├── Soma Despesas Extras (+ Justificativas de Saídas)
        └── Apura Diferença Final com precisão milimétrica
```

## Interfaces TypeScript

```typescript
// CashVaultEntry em Step3CashVaultDaniel.tsx
export interface CashVaultEntry {
  id: string;
  store_id: string;
  store_name: string;
  amount: number;
  entry_date: string;
  status: string;
}

// PendingUnmatchedTransaction em autoMatchingEngine.ts / CentralImportWizard.tsx
export interface PendingUnmatchedTransaction {
  id: string;
  source: 'rede' | 'ofx_pix';
  storeId: string;
  storeName: string;
  date: string;
  description: string;
  paymentMethod: string;
  amount: number;
  status: 'pendente' | 'vinculado';
  nsu?: string;
  authorizationCode?: string;
}
```

## Mutações em Arquivos Existentes `[MODIFY]`

### 1. `supabase/migrations/20260901000013_fix_canonical_odometro_and_step2_justifications.sql` `[NEW]`
- Atualizar a RPC `get_daily_reconciliation_summary` com extração do odômetro anterior de `metadata->>'odometro_hoje'`, cômputo do delta faturamento e soma das entradas e saídas justificadas.

### 2. `src/components/importacoes/wizard/Step3CashVaultDaniel.tsx` `[MODIFY]`
- Corrigir query de `store_cash_vault` para `.select('id, store_id, amount, entry_date, status, stores(name)')`.

### 3. `src/components/importacoes/wizard/Step2NonRevenueJustifications.tsx` `[MODIFY]`
- Corrigir queries de `ofx_transactions` (remover `title` e `match_status`).
- No `handleSaveInflow`, realizar upsert em `daily_revenue_adjustments` para entradas que somam ao faturamento.
- Expandir invalidação de queries para incluir `daily_reconciliation_summary` e `backend-conciliacao`.

### 4. `src/components/importacoes/CentralImportWizard.tsx` `[MODIFY]`
- Corrigir query de `fetchRealUnmatchedTransactions` para buscar colunas canônicas reais.
- Ajustar salvamento intermediário do snapshot para `is_closed: false`.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)

### Cenário 1: Encadeamento de Odômetro e Cálculo do Faturamento do Dia
- **Estado Inicial:** Dia 2026-08-31 possui Odômetro Acumulado R$ 1.010.869,29. Dia 2026-09-01 possui Odômetro Hoje R$ 1.030.303,99.
- **Ação:** Consultar o fechamento de 2026-09-01 via `get_daily_reconciliation_summary('2026-09-01')`.
- **Resultado Esperado:**
  - `faturamento_oi_base`: R$ 19.434,70 (1.030.303,99 - 1.010.869,29).
  - `faturamento_periodo`: R$ 19.434,70 + ajustes de justificativas.
  - `valor_disp_contas`: R$ 18.853,19 (19.434,70 - 581,51 de fluxo de caixa).
  - A Diferença Final **não é** R$ 987.879,83, mas sim um valor equilibrado com o subtotal de contas a pagar.

### Cenário 2: Justificativas de Entradas e Saídas Refletindo no Faturamento e no Contas
- **Estado Inicial:** Operador justifica 1 entrada (ex: Seguro Itaú R$ 11.208,87 com "Somar ao Faturamento") e 1 saída (ex: Despesa Extra R$ 1.500,00 com "Adicionar ao Contas a Pagar").
- **Ação:** Salvar ambas as justificativas no Step 2 do wizard.
- **Resultado Esperado:**
  - Faturamento do Dia aumenta em R$ 11.208,87.
  - Contas (Manual) / Subtotal de Contas a Cobrir aumenta em R$ 1.500,00.
  - Zero erros de console (nenhum erro 42703).

### Cenário 3: Carregamento do Cofre Daniel sem Erro SQL
- **Estado Inicial:** Acessar o Step 3 do wizard (`Step3CashVaultDaniel.tsx`).
- **Ação:** Carregar a lista de valores em trânsito.
- **Resultado Esperado:**
  - Requisição retorna HTTP 200 (sem erro `column store_cash_vault.store_name does not exist`).
  - Lojas e valores são renderizados corretamente na tabela.
