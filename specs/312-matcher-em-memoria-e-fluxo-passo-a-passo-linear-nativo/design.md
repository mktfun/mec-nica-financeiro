# Design: Motor de Auto-Match em Memória & Fluxo de 8 Passos Lineares Nativos (312)

## Arquitetura Técnica

`
CentralImportWizard.tsx (Máquina de Estados: step 1 a 8)
  │
  ├─ step === 1 ──> Ingestão / Dropzone de Arquivos
  ├─ step === 2 ──> Mapeamento de Filiais (Alias -> Store)
  ├─ step === 3 ──> Preview Geral (MissingPatioOsEditor + Inputs Manuais + DiagnosticPanel)
  │                   │
  │                   ▼ [Avançar para Conciliação →]
  │                 executeAutoMatchingEngine()  [Cruza Rede/OFX com results.osFiles]
  │                   │
  ├─ step === 4 ──> Step 4 / Tela A: Vínculo de Pagamentos sem OS (Sobras Reais + Modal Dual Source)
  ├─ step === 5 ──> Step 5 / Tela B: Justificativas por Loja (Transferências, Aportes, Tarifas)
  ├─ step === 6 ──> Step 6 / Tela C: Conferência de Cofre do Daniel (SIM/NÃO)
  ├─ step === 7 ──> Step 7 / Tela D: Auditoria Final dos 5 Pilares & Gemini 3.5 Flash Lite
  │                   │
  │                   ▼ [Confirmar e Gravar Importação]
  │                 handleConfirm()  [Persistência no Supabase + Snapshot]
  │                   │
  └─ step === 8 ──> Step 8: Resumo Executivo & Conclusão
`

---

## Interfaces TypeScript

`	ypescript
// 1. Tipo do estado unificado de Steps do Wizard
export type CentralImportStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

// 2. Interface de Transação Pendente Real (Sobras pós-matcher)
export interface PendingUnmatchedTransaction {
  id: string;
  source: 'rede' | 'ofx_pix' | 'ofx_other';
  storeId: string;
  storeName: string;
  date: string;
  description: string;
  paymentMethod: string;
  amount: number;
  status: 'pendente' | 'vinculada';
  matchedOsNumber?: string;
}

// 3. Interface de Candidato de OS para o Modal (Dual Source)
export interface StoreOsCandidate {
  id: string;
  os_number: string;
  client_name: string;
  plate: string;
  model?: string;
  total_value: number;
  paid_value: number;
  open_balance: number;
  payment_method: string;
  source: 'memoria_lote' | 'banco_patio';
}

// 4. Payload de Vínculo de 1 Clique
export interface LinkTransactionToOsPayload {
  transactionId: string;
  osId: string;
  osNumber: string;
  storeId: string;
  amount: number;
  paymentMethod: string; // Herança automática da transação
}
`

---

## Motor de Auto-Match em Memória (src/lib/matchers/autoMatchingEngine.ts)

`	ypescript
export function executeAutoMatchingEngine(
  results: UnifiedImportResult,
  mapping: Record<string, string>,
  stores: Store[],
  dbActiveOsList: any[] = []
): {
  matchedCount: number;
  unmatchedTransactions: PendingUnmatchedTransaction[];
  resolvedMatches: Array<{ storeId: string; osNumber: string; sourceId: string; type: string }>;
}
`

### Regras do Motor:
1. Agrupa OSs por loja a partir de esults.osFiles (lote em memória).
2. Itera sobre esults.redeResults: busca OS da mesma loja com valor de cartão compatível ($\pm\text{R\$}~0,10$). Se encontrar, casa e consome. Se não, gera sobra para o Step 4.
3. Itera sobre esults.ofxResults (créditos PIX): busca OS da mesma loja com valor de PIX compatível. Se encontrar, casa e consome. Se não, gera sobra para o Step 4.

---

## Fluxo Visual por Step

* **Indicador de Etapas no Topo (Header Badge):**
  `	sx
  <Badge variant="outline" className="text-[11px] font-semibold text-[var(--color-primary)] border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 px-3 py-1">
    {step === 1 ? '1. Upload de Arquivos' :
     step === 2 ? '2. Mapeamento de Filiais' :
     step === 3 ? '3. Conferência e Preview' :
     step === 4 ? '4. Vínculo de Pagamentos na OS (Tela A)' :
     step === 5 ? '5. Justificativas por Loja (Tela B)' :
     step === 6 ? '6. Cofre e Recolhimento (Tela C)' :
     step === 7 ? '7. Auditoria dos 5 Pilares (Tela D)' :
     '8. Importação Concluída'}
  </Badge>
  `
* **Step 4 (Tela A):**
  - Tabela com filtros por filial no mesmo padrão das telas do sistema.
  - Modal de busca que agrega esults.osFiles + patio_os.
  - Botão "Vincular (1 Clique)" que aplica herança de valor e método sem dropdowns.
* **Step 5 (Tela B):**
  - Tabela de justificativas para movimentações de não-faturamento com edição e cancelamento.
* **Step 6 (Tela C):**
  - Radio SIM/NÃO estilizado e tabela de cofres em trânsito.
* **Step 7 (Tela D):**
  - Cards dos 5 pilares com borda lateral (order-l-4), semáforo de tolerância ($\pm\text{R\$}~50$), botão Gemini 3.5 Flash Lite e botão final "Confirmar e Gravar".
* **Step 8:**
  - Resumo executivo com 4 cards de KPIs e navegação para a conciliação.

---

## Cenários de Verificação (SCAN ➔ INFER ➔ VERIFY ➔ FIX)

### Cenário 1: Precisão do Matcher em Memória
- **SCAN:** Lote com 10 OSs (5 cartão, 3 PIX) e arquivos correspondentes na Rede e OFX.
- **INFER:** O motor deve casar automaticamente 8 transações e encaminhar apenas a sobra real para o Step 4.
- **VERIFY:** Step 4 exibe exatamente a sobra pendente; nenhuma venda casada aparece como órfã.
- **FIX:** Reforçar agrupamento estrito por mapping[storeAlias].

### Cenário 2: Modal Dual Source (Lote + Banco)
- **SCAN:** Operador abre modal para vincular transação na loja CAP onde a tabela patio_os no banco está com 0 registros.
- **INFER:** O modal deve buscar as OSs ativas de esults.osFiles da loja CAP.
- **VERIFY:** O modal lista as OSs da loja com número, cliente, placa e saldo em aberto.
- **FIX:** Garantir união de esults.osFiles com patio_os no seletor de candidatos.
