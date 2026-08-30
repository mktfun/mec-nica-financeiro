# Design: Wizard de Conciliação Passo a Passo Pós-Ingestão (311)

## Arquitetura Técnica

`
importacoes.tsx
  └─ CentralImportWizard (aba 'diario')
       ├─ state: step = 1 | 2 | 3 | 4  (fluxo original de ingestão)
       ├─ state: reconciliationStep = null | 'A' | 'B' | 'C' | 'D'  (wizard pós-ingestão)
       │
       ├─ step === 1 → Upload de Arquivos (INALTERADO)
       ├─ step === 2 → Mapeamento de Filiais (INALTERADO)
       ├─ step === 3 → Preview + MissingPatioOsEditor + DiagnosticPanel + Inputs Manuais
       │                 └─ botão "Avançar para Conciliação" → setReconciliationStep('A')
       │
       ├─ reconciliationStep === 'A' → WizardStep_A_UnregisteredPayments
       │     Props: results, mapping, targetDate → onNext → setReconciliationStep('B')
       │                                         → onBack → setReconciliationStep(null)
       │
       ├─ reconciliationStep === 'B' → WizardStep_B_NonRevenueJustifications
       │     Props: results, mapping, targetDate → onNext → setReconciliationStep('C')
       │                                         → onBack → setReconciliationStep('A')
       │
       ├─ reconciliationStep === 'C' → WizardStep_C_CashVault
       │     Props: targetDate              → onNext → setReconciliationStep('D')
       │                                   → onBack → setReconciliationStep('B')
       │
       └─ reconciliationStep === 'D' → WizardStep_D_FinalAudit
             Props: results, mapping, targetDate, manualInputs
             → onFinish → handleConfirm() (gravação original)
             → onBack  → setReconciliationStep('C')
`

## Interfaces TypeScript

`	ypescript
// Props compartilhadas entre as telas do Wizard pós-ingestão
interface WizardStepProps {
  results: CentralImportResults;
  mapping: Record<string, string>;     // alias → store_id
  targetDate: string;                  // 'YYYY-MM-DD'
  stores: Store[];
  onNext: () => void;
  onBack: () => void;
}

interface WizardFinishStepProps extends WizardStepProps {
  manualInputs: {
    odometroHoje: number;
    manualDinheiroMp: number;
    manualAReceber: number;
    contasManual: number;
  };
  missingOsList: MissingPatioOsEdit[];
  onFinish: () => void;   // dispara handleConfirm do CentralImportWizard
  isSaving: boolean;
}

// Estado dentro do CentralImportWizard
type ReconciliationWizardStep = null | 'A' | 'B' | 'C' | 'D';
`

## Componentes / Hooks / Funções

### DELETAR
- `src/components/importacoes/wizard/UnifiedReconciliationWizard.tsx`
- `src/components/importacoes/wizard/Stage0UnifiedIngestion.tsx`
- `src/hooks/useReconciliationWizardState.ts`

### MODIFICAR
- `src/routes/importacoes.tsx` → remover import/uso de UnifiedReconciliationWizard, restaurar CentralImportWizard
- `src/components/importacoes/CentralImportWizard.tsx`:
  - Adicionar estado: `const [reconciliationStep, setReconciliationStep] = useState<ReconciliationWizardStep>(null)`
  - No Step 3: substituir botão "Confirmar e Gravar" por "Avançar para Conciliação →"
  - Adicionar renderização condicional para cada tela do wizard
  - Stepper visual mostrando A → B → C → D quando reconciliationStep !== null

### REFATORAR (receber props externas, sem estado interno isolado)
- `src/components/importacoes/wizard/Step1UnregisteredPayments.tsx`
  → renomear logicamente para Tela A (manter nome de arquivo)
  → aceitar `results, mapping, targetDate, stores, onNext, onBack`
  → buscar OSs em aberto via supabase direto, cruzar com transações Rede/OFX sem match
  → ação 1 clique: UPDATE patio_os + INSERT conciliation_matches

- `src/components/importacoes/wizard/Step2NonRevenueJustifications.tsx`
  → renomear logicamente para Tela B
  → aceitar `results, mapping, targetDate, stores, onNext, onBack`
  → filtrar entradas OFX sem caminho faturamento
  → editar categoria, salvar em daily_manual_bills

- `src/components/importacoes/wizard/Step3CashVaultDaniel.tsx`
  → renomear logicamente para Tela C
  → aceitar `targetDate, onNext, onBack`
  → query store_cash_vault status=em_transito, UPDATE para depositado se SIM

- `src/components/importacoes/wizard/Step4FinalAuditAndClose.tsx`
  → renomear logicamente para Tela D
  → aceitar props WizardFinishStepProps (inclui onFinish)
  → chamar RPC get_daily_reconciliation_summary
  → semáforo ±R
  → botão "Confirmar e Gravar" chama onFinish → handleConfirm do CentralImportWizard

## Fluxo de UI

### Stepper Visual (quando reconciliationStep !== null)

`
[Step 3 ✓] → [A: Pagamentos OS] → [B: Justificativas] → [C: Cofre] → [D: Auditoria]
`

Fundo Zinc-950. Tela ativa: `border-b-2 border-emerald-500 text-emerald-400`.
Telas concluídas: `text-zinc-400 with checkmark icon`.

### Tela A — Pagamentos sem Lançamento na OS

- Header: "Pagamentos sem Lançamento na OS" + contador de pendências por loja
- Lista agrupada por loja de transações Rede/OFX sem match
- Para cada transação: valor, tipo (PIX / Crédito / Débito), loja
- Coluna "Vincular à OS": input de busca instantânea de OSs abertas da mesma loja
- Ao selecionar OS: UPDATE automático, linha some da lista com animação fade-out
- Badge de progresso "N de M resolvidos"
- Permite avançar com pendências (para cobrar gerente depois)

### Tela B — Justificativas de Não-Faturamento

- Lista de transações OFX sem caminho faturamento, agrupadas por loja/filial
- Cada item: select de categoria + textarea de observação (editável, cancelável)
- Botão "Salvar" por item ou "Salvar Todos"

### Tela C — Cofre Daniel

- Pergunta central: "O Daniel recolheu o dinheiro das lojas hoje?"
- Radio [SIM] / [NÃO] estilizado
- Se SIM: tabela das entradas em_transito com checkbox para selecionar quais foram recolhidas
- Botão "Confirmar Recolhimento" → UPDATE em lote

### Tela D — Auditoria Final

- Cards dos 5 pilares (dados via RPC get_daily_reconciliation_summary)
- Semáforo: VERDE |delta| ≤ 50, VERMELHO |delta| > 50
- Botão "Analisar com IA" → gemini-3.5-flash-lite
- Botão "Confirmar e Gravar Importação" (habilitado sempre, override manual se vermelho)

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)

### Cenário 1: Fluxo completo pós-ingestão
- **Estado inicial:** Step 3 do CentralImportWizard renderizado com dados carregados (OSs, Rede, OFX)
- **Ação:** Clicar em "Avançar para Conciliação"
- **Resultado esperado:** reconciliationStep='A', stepper aparece com Tela A ativa, lista de transações sem match carregada

### Cenário 2: Botão Voltar na Tela A
- **Estado inicial:** reconciliationStep='A'
- **Ação:** Clicar em "← Voltar"
- **Resultado esperado:** reconciliationStep=null, Step 3 original exibido com todos os dados intactos (MissingPatioOsEditor, inputs manuais)
