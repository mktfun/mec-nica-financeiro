# Design: Correção de Erros de Console, Ícone Car e Desambiguação de RPCs (369)

## Arquitetura e Fluxo de Dados

```
[Arquivos OFX / OS / Rede / Contas]
         │
         ▼ (Ingestão)
[CentralImportWizard.tsx] 
         │
         ├──────► 1. auto_match_daily_transactions(p_date)
         │           ├── [CORREÇÃO] SELECT * INTO v_os_record (patio_os%ROWTYPE)
         │           └── Elimina erro 22P02 ao mapear colunas por nome/posição 1:1
         │
         ├──────► 2. run_autonomous_reconciliation_loop(p_date)
         │           ├── [CORREÇÃO] Invoca get_daily_reconciliation_summary(p_date, false)
         │           └── Elimina colisão 42725 e HTTP 400
         │
         ▼ (Step 7 - Revisão Pré-Fechamento)
[Step4FinalAuditAndClose.tsx]
         │
         ├── [CORREÇÃO] import { Car } from 'lucide-react' (elimina ReferenceError)
         │
         ├── [CORREÇÃO] useDailyReconciliationSummary(targetDate, true)
         │           └── Envia { p_date, p_force_dynamic: true } para recálculo dinâmico
         │
         └──────► Exibição dos 5 Pilares, Canal 1 (Tesouraria), Canal 2 (WIP) e Fast-Path
```

---

## Interfaces TypeScript

```typescript
// src/hooks/useBackendConciliacao.ts
export interface DailyReconciliationSummary {
  date: string;
  is_closed: boolean;
  saldo_bancos_ofx: number;
  saldo_bancos_positivo: number;
  saldo_negativo_itau: number;
  dinheiro_lojas: number;
  cartoes_a_compensar: number;
  devolucoes_rede: number;
  total_saldo_banco_positivo: number;
  total_saldo_banco: number;
  dinheiro_mp: number;
  a_receber: number;
  a_receber_manual: number;
  na_loja_os: number;
  total_patio: number;
  caixa_atual: number;
  caixa_anterior: number;
  fluxo_caixa: number;
  odometro_hoje: number;
  faturamento_oi_base: number;
  faturamento_anterior: number;
  faturamento_ajustes: number;
  faturamento_periodo: number;
  faturamento: number;
  valor_disp_contas: number;
  contas_base: number;
  contas_extras: number;
  contas_manual: number;
  contas_a_pagar: number;
  juros_rede: number;
  subtotal_contas: number;
  v_subtotal_contas: number;
  diferenca_final: number;
  status_geral: 'approved' | 'divergent';
  faturamento_itens: Array<{
    id: string;
    title: string;
    description: string;
    amount: number;
    store_id: string | null;
  }>;
  contas_itens: Array<{
    id: string;
    title: string;
    description: string;
    amount: number;
    store_id: string | null;
    category: string;
    is_paid: boolean;
    external_code: string | null;
    contabilizar_no_subtotal: boolean;
  }>;
  stores_detail: Array<any>;
  stores: Array<any>;
  // Propriedades Bicanais (Spec 359)
  caixa_tesouraria?: number;
  status_tesouraria?: 'equilibrado' | 'descoberto';
  patio_wip?: number;
  variacao_patio_delta_p4?: number;
  fast_path_eligible?: boolean;
}
```

---

## Mutações em Arquivos Existentes [MODIFY]

### 1. `src/components/importacoes/wizard/Step4FinalAuditAndClose.tsx`
- **Imports:** Adicionar `Car` na lista de imports de `lucide-react`.
- **Hook invocation:** Alterar chamada para `useDailyReconciliationSummary(targetDate, true)`.
- **Limpeza de casts:** Remover `(summary as any)` em favor dos campos tipados nativamente.

### 2. `src/hooks/useBackendConciliacao.ts`
- Assinatura: `export function useDailyReconciliationSummary(date: string, forceDynamic: boolean = false)`.
- RPC Payload: `{ p_date: date, p_force_dynamic: forceDynamic }`.
- Cache key: `['daily-reconciliation-summary', date, forceDynamic]`.

### 3. `supabase/migrations/20260904000032_unify_reconciliation_summary_and_fix_auto_match.sql` [NEW]
- Expurgo com `DROP FUNCTION IF EXISTS` das versões conflitantes de `get_daily_reconciliation_summary`.
- Definição canônica única de `get_daily_reconciliation_summary(p_date text, p_force_dynamic boolean DEFAULT false)`.
- Atualização de `run_autonomous_reconciliation_loop(p_date text)`.
- Correção de `auto_match_daily_transactions(p_date text)` com `SELECT * INTO v_os_record`.

---

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)

### Cenário 1: Resolução de Ambiguidade e Auto-Healing Sem Erro
- **Estado Inicial:** Transações do dia 2026-09-03 presentes no banco.
- **Ação:** Executar no PostgreSQL `SELECT public.get_daily_reconciliation_summary('2026-09-03');` e chamar `public.run_autonomous_reconciliation_loop('2026-09-03')`.
- **Resultado Esperado:** Ambos retornam código 0 (sucesso) em JSONB, com `final_delta` numérico e sem erro 42725 ou HTTP 400.

### Cenário 2: Auto-Match com OS de Nome de Cliente Não-Numérico
- **Estado Inicial:** Transação de entrada OFX de PIX e OS com `client_name = 'LUIS FELIPE DA CASA'` na mesma filial.
- **Ação:** Invocar `SELECT public.auto_match_daily_transactions('2026-09-03');`.
- **Resultado Esperado:** A RPC executa sem disparar a exceção 22P02, vincula o pagamento à OS e reporta o número de matches.

### Cenário 3: Renderização Fluida do Step 4 sem ReferenceError
- **Estado Inicial:** Operador avança até o Step 4 (Auditoria Final) no Wizard.
- **Ação:** Navegar para o Step 4.
- **Resultado Esperado:** O componente renderiza os 5 cards de pilares, o Canal 1 e o Canal 2 com o ícone `<Car />` visível e sem lançar `ReferenceError: Car is not defined` no console.
