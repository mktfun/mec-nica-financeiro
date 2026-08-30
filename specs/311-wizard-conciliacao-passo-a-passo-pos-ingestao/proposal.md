# Proposal: Wizard de Conciliação Passo a Passo Pós-Ingestão (311)

## Problema

Na Spec 310 implementamos os componentes certos (Step1, Step2, Step3, Step4) mas no lugar errado.

**O que estava correto e foi quebrado:**
O `CentralImportWizard.tsx` original funcionava bem nas primeiras 3 etapas:
- **Step 1:** Upload de arquivos (dropzone com OFX, OS, Rede, Contas a Pagar)
- **Step 2:** Mapeamento de filiais (alias → store_id)
- **Step 3 (Preview):** `MissingPatioOsEditor` (OSs ausentes do relatório), `DiagnosticPanel`, inputs manuais globais (Odômetro, Dinheiro MP, A Receber, Contas a Pagar) e botão **"Confirmar e Gravar Importação"**

**O que foi destruído na Spec 310:**
O `UnifiedReconciliationWizard` substituiu completamente o `CentralImportWizard` na rota `/importacoes`, jogando fora as 3 etapas originais de upload+mapeamento+preview que funcionavam.

**O que o usuário pediu:**
O Wizard Passo a Passo de Conciliação deve entrar **ENTRE** o Step 3 (Preview) e a gravação final. O fluxo correto é:

`
[Step 1: Upload] → [Step 2: Mapeamento] → [Step 3: Preview/Conferência/Inputs]
→ [Botão: "Avançar para Conciliação"]
→ [Tela A: Pagamentos sem Lançamento na OS]
→ [Tela B: Justificativas Contábeis por Loja]
→ [Tela C: Cofre / Daniel]
→ [Tela D: Auditoria Final + IA Gemini]
→ [Gravação Final no banco]
`

## Solução Proposta

### 1. Restaurar o CentralImportWizard na aba diario

Reverter `importacoes.tsx` para usar `CentralImportWizard` (desfazendo a troca da Spec 310).

### 2. Adicionar estado do Wizard Pós-Ingestão ao CentralImportWizard

Novo estado `reconciliationStep: 'A' | 'B' | 'C' | 'D' | null`.

- `null` = fluxo original (Steps 1, 2, 3 funcionam igual)
- Ao clicar em "Avançar para Conciliação" no Step 3: `setReconciliationStep('A')`
- Cada tela A/B/C/D renderiza o componente correspondente em tela cheia
- Tela D executa o `handleConfirm` original ao encerrar

### 3. Adaptar os componentes da pasta /wizard/ para receber props externas

Os Steps criados na Spec 310 (Step1UnregisteredPayments, Step2NonRevenueJustifications, Step3CashVaultDaniel, Step4FinalAuditAndClose) serão refatorados para receber:
- `results: CentralImportResults`
- `mapping: Record<string, string>`
- `targetDate: string`
- `manualInputs: ManualInputs`
- `onNext: () => void`
- `onBack: () => void`
- `onFinish: () => void` (Tela D dispara o handleConfirm)

### 4. Excluir componentes indevidos da Spec 310

- `UnifiedReconciliationWizard.tsx` — substituto indevido, deletar
- `Stage0UnifiedIngestion.tsx` — substituto indevido de upload/inputs, deletar

## Contratos de Dados

### Tabelas tocadas no Wizard Pós-Ingestão

| Tabela | Operação | Tela |
|--------|----------|------|
| `patio_os` | UPDATE paid_value, payment_method, status | A |
| `conciliation_matches` | INSERT match_type = 'MANUAL_1CLICK' | A |
| `ofx_transactions` | UPDATE matched_os_number | A |
| `daily_manual_bills` | INSERT justificativas | B |
| `store_cash_vault` | UPDATE status = 'depositado' | C |

### Tela A — Pagamentos sem lançamento na OS

Identifica transações Rede + OFX que não têm `matched_os_number` e cruza com `patio_os` da mesma loja em aberto.

Ação 1 clique (valor e forma de pagamento já vêm da transação de origem):
- `patio_os.paid_value += tx.amount`
- `patio_os.payment_method = tx.payment_type`
- `patio_os.status = paid >= total ? 'finalizada' : 'pago_parcial'`
- INSERT em `conciliation_matches` (match_type = 'MANUAL_1CLICK')

### Tela B — Justificativas de Não-Faturamento

Entradas OFX sem caminho no faturamento → classificar como APORTE, TRANSFERENCIA_ENTRE_LOJAS, ESTORNO, TARIFA_BANCARIA, OUTROS.
Persiste em `daily_manual_bills` (external_code = NULL).

### Tela C — Cofre Daniel

Query: `store_cash_vault WHERE status = 'em_transito' AND entry_date <= targetDate`
Ação SIM: UPDATE status = 'depositado'

### Tela D — Auditoria Final

RPC: `get_daily_reconciliation_summary(p_target_date)`
Semáforo: |delta| <= 50 → VERDE. |delta| > 50 → VERMELHO (bloqueia).
Fechamento: chama handleConfirm original do CentralImportWizard.

## Features Existentes Impactadas

| Componente | Impacto |
|------------|---------|
| `CentralImportWizard.tsx` | MODIFICADO: novo estado reconciliationStep + botão Step 3 muda |
| `importacoes.tsx` | MODIFICADO: restaurar CentralImportWizard, remover UnifiedReconciliationWizard |
| `wizard/Step1UnregisteredPayments.tsx` | REFATORADO: recebe props externas |
| `wizard/Step2NonRevenueJustifications.tsx` | REFATORADO: recebe props externas |
| `wizard/Step3CashVaultDaniel.tsx` | REFATORADO: recebe props externas |
| `wizard/Step4FinalAuditAndClose.tsx` | REFATORADO: recebe props externas + dispara handleConfirm |
| `wizard/UnifiedReconciliationWizard.tsx` | DELETADO |
| `wizard/Stage0UnifiedIngestion.tsx` | DELETADO |
| `useReconciliationWizardState.ts` | DELETADO (não mais necessário) |

## Risco Principal e Mitigação

**Risco:** Estado `reconciliationStep` conflitar com o step numérico original (1/2/3/4).

**Mitigação:** São estados completamente independentes. `step` controla o fluxo de ingestão (1→2→3). `reconciliationStep` controla o wizard pós-preview (A→B→C→D). Quando `reconciliationStep !== null`, a renderização do step numérico é suprimida e o wizard toma a tela.
