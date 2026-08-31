# Design: Wizard Onboarding Pós-Matching — Revisão de Órfãos e Validação de Diferença Final (324)

## Arquitetura e Fluxo de Dados

```
[Ingestão e Processamento - Step 3]
  │ (Upload de Arquivos + Inputs Manuais de Odômetro e Cofre)
  ▼
[Pipeline Automático de Gravação + Auto-Match - Step 8 (Progresso)]
  ├── Inserção de OSs, Recebíveis, POS Rede, Extratos OFX e Contas a Pagar
  ├── RPC auto_match_transactions(p_date) (3 Camadas)
  ├── RPC auto_match_saidas(p_date) (5 Camadas)
  ├── RPC run_autonomous_reconciliation_loop(p_date) (Auto-Healing com IA)
  └── Conclusão da gravação (saveFinished = true)
  │
  ▼ (Avanço Automático sem clique extra - 1.2s delay)
[Etapa 1 de Revisão: PIX e Vendas Rede Órfãs - Step 4]
  │ Componente: Step1UnregisteredPayments + ManualMatchOsModal
  │ Consulta: Transações no banco sem matched_os_number
  │ Ação: Operador vincula em 1 clique às OSs da filial com score de proximidade
  │ Estado Vazio: Exibe "✅ 100% Conciliado pelo Motor" com botão "Avançar"
  ▼
[Etapa 2 de Revisão: Justificativas de Saídas e Entradas Órfãs - Step 5]
  │ Componente: Step2NonRevenueJustifications (Queries Reativas)
  │ Consulta: ofx_transactions WHERE matched_bill_id IS NULL (Saídas) / matched_os_number IS NULL (Entradas)
  │ Ação: Categorizar, vincular a conta aberta ou definir toggle "Adicionar ao Contas a Pagar"
  ▼
[Etapa 3 de Revisão: Conferência de Cofre do Daniel - Step 6]
  │ Componente: Step3CashVaultDaniel
  │ Ação: Homologar sangrias/depósitos de cofre físico
  ▼
[Etapa 4 de Validação: Preview Pré-Fechamento e Semáforo dos 5 Pilares - Step 7]
  │ Componente: Step4FinalAuditAndClose (Refatorado como Preview Pré-Seal)
  │ Consulta: Hook useDailyReconciliationSummary(targetDate) (RPC get_daily_reconciliation_summary)
  │ Exibição:
  │   - 5 Pilares: Caixa Atual, Fluxo de Caixa, Faturamento Apurado, Valor Disp. Contas, Subtotal Contas
  │   - Semáforo da Diferença Final:
  │       🟢 |Delta| <= R$ 50,00: Fechamento Perfeito / Conforme
  │       🟡 |Delta| <= R$ 200,00: Divergência Residual Aceitável
  │       🔴 |Delta| > R$ 200,00: Divergência Crítica (Alerta de Atenção)
  │   - Ações:
  │       ← "Voltar para Corrigir": Permite retornar aos steps 6, 5, 4 para ajustar vínculos/justificativas
  │       🔄 "Recalcular": Dispara refetch() da RPC para recalcular a diferença imediatamente
  │       ✅ "Conciliar e Selar o Dia": Executa close_daily_snapshot RPC e redireciona
  ▼
[Redirecionamento Definitivo]
  └── Rota: navigate({ to: '/conciliacao' }) com data selecionada
```

---

## Interfaces TypeScript

```typescript
// Interface de Props do Step 4 (Step1UnregisteredPayments)
export interface Step1UnregisteredPaymentsProps {
  unmatchedTransactions: PendingUnmatchedTransaction[];
  results: UnifiedImportResult;
  mapping: Record<string, string>;
  targetDate: string;
  stores: { id: string; name: string }[];
  resolvedMatches?: Array<{ osNumber: string; storeId: string; type: string; amount: number }>;
  onLinkToOs?: (transactionId: string, osNumber: string, amount: number, paymentMethod: string) => void;
  onNext: () => void;
  onBack: () => void;
}

// Interface de Props Refatorada do Step 7 (Step4FinalAuditAndClose)
export interface Step4FinalAuditAndCloseProps {
  targetDate: string;
  isSaving: boolean;
  onFinish: () => void; // Dispara handleFinalizeClosing
  onBack: () => void;   // Retorna para Step 6 (Cofre)
}

// Retorno da RPC get_daily_reconciliation_summary consumida no Step 7
export interface DailyReconciliationSummary {
  date: string;
  caixa_atual: number;
  caixa_anterior: number;
  fluxo_caixa: number;
  faturamento_periodo: number;
  valor_disp_contas: number;
  subtotal_contas: number;
  diferenca_final: number;
  is_conforme: boolean;
  status_geral: 'approved' | 'divergent';
  total_saldo_banco_positivo: number;
  saldo_negativo_itau: number;
  dinheiro_mp: number;
  a_receber: number;
  na_loja_os: number;
  contas_manual: number;
  juros_rede: number;
}
```

---

## Mutações em Arquivos Existentes [MODIFY]

### 1. `src/components/importacoes/CentralImportWizard.tsx`
- **Auto-Avanço Pós-Motor:** Adicionar `useEffect` ouvindo `saveFinished` e a flag `advanceToWizardRef`. Quando o processamento no Step 8 finaliza com sucesso:
  1. Invalida os caches do TanStack Query (`pending-ofx-outflows`, `pending-ofx-inflows`, `open-bills-for-step2`, `daily-reconciliation-summary`).
  2. Executa `fetchRealUnmatchedTransactions(targetDate)`.
  3. Atualiza `setUnmatchedTransactions(realUnmatched)`.
  4. Executa compulsoriamente `setStep(4)` (garantindo que o onboarding de revisão seja sempre acessado).
- **Consistência de Navegação:** Ajustar os callbacks `onBack` e `onNext` de todos os steps (4 -> 5 -> 6 -> 7) para permitir livre trânsito e correções retroativas sem corromper o banco.
- **Transição de Fechamento:** Ao concluir o Step 7 via `handleFinalizeClosing`, executar a RPC `close_daily_snapshot` e redirecionar imediatamente para `navigate({ to: '/conciliacao' })`.

### 2. `src/components/importacoes/wizard/Step1UnregisteredPayments.tsx`
- **Suporte a Estado Vazio Gracioso:** Quando `unmatchedTransactions.length === 0`:
  - Renderizar card comemorativo Dark UI com ícone `CheckCircle2` esmeralda: *"🎉 100% das Vendas e PIX foram conciliados automaticamente pelo motor!"*
  - Manter o botão *"Avançar para Justificativas (Passo 5) →"* ativo e destacado.

### 3. `src/components/importacoes/wizard/Step4FinalAuditAndClose.tsx`
- **Transformação em Painel de Validação e Pré-Fechamento:**
  - Simplificar props para consumir a RPC viva `useDailyReconciliationSummary(targetDate)`.
  - Inserir botão *"🔄 Recalcular Diferença"* chamando `refetch()`.
  - Exibir bloco central de conferência com a fórmula expandida:
    $$\text{Diferença Final} = \text{Valor Disp. Contas (R\$ X)} - \text{Subtotal Contas (R\$ Y)} = \text{R\$ Z}$$
  - Semáforo visual com badge de status e feedback textual claro.
  - Botão principal: *"✅ Conciliar e Selar o Dia"* disparando `onFinish()`.

---

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)

### Cenário 1: Fluxo Completo de Onboarding com Transações Órfãs
- **SCAN:** Usuário faz upload de arquivos para `2026-08-28` e clica *"Processar e Conciliar com IA"*.
- **INFER:** O Step 8 executa a esteira automática e, ao atingir `saveFinished = true`, avança automaticamente para o Step 4.
- **VERIFY:** 
  1. O Step 4 exibe a lista de PIX/Rede órfãos; usuário vincula uma transação à OS da filial.
  2. O Step 5 exibe as saídas órfãs reais do banco; usuário classifica uma despesa extra.
  3. O Step 6 valida o cofre do Daniel.
  4. O Step 7 carrega a RPC viva, exibe a Diferença Final calculada e o semáforo.
  5. Usuário clica em *"Conciliar e Selar o Dia"* e é redirecionado para `/conciliacao`.
- **FIX:** Sem bloqueios ou pulos indevidos de tela.

### Cenário 2: Validação de Diferença, Retorno para Ajuste e Recálculo
- **SCAN:** No Step 7, a Diferença Final indica divergência de `R$ 1.200,00` (semáforo vermelho).
- **INFER:** O usuário clica em *"← Voltar"* até o Step 5 e marca um débito de R$ 1.200,00 com toggle *"Adicionar ao Contas a Pagar"*.
- **VERIFY:**
  1. Ao retornar para o Step 7 e clicar em *"Recalcular"*, a RPC refaz o sumário dinâmico.
  2. A Diferença Final atualiza para `R$ 0,00` e o semáforo fica verde (conforme).
  3. O usuário clica em *"Conciliar e Selar"* com segurança matemática total.
- **FIX:** A reatividade do DRE garante que nenhuma divergência passe despercebida.
