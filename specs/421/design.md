# Spec 421 — Design: Sandbox de Importação e Conciliação 100% Local (Zero DB & Traqueamento Total)

## 1. Arquitetura de Fluxo

```
[Arquivos Reais (OFX, Rede, OS, Contas)] 
                 │
                 ▼
[parseCentralImports (Parsers em Memória)]
                 │
                 ▼
[autoMatchingEngine + ReconciliadorRedeOFX]
                 │
                 ▼
      Modo isSandbox === true?
     ┌───────────┴───────────┐
     │ SIM                   │ NÃO
     ▼                       ▼
[sandboxCalculator]    [Mutations Supabase]
     │                 [fechar_dia RPC]
     ▼                       │
[localStorage]               ▼
[Sandbox Session State] [Banco PostgreSQL]
     │
     ├──────────────────────┬──────────────────────┐
     ▼                      ▼                      ▼
[Aba 1: Wizard Dry-Run] [Aba 2: Conciliação]  [Aba 3: Telemetria & Rastreamento]
(Progresso & Estágios)  (ResumoDiaPanel +      (Auditoria de Matches, Órfãos,
                         ConciliacaoLojasView)  Cofre, Taxas e Export JSON)
```

### Isolamento Estrito:
1. **Source:** Arquivos soltos via Dropzone (`File[]`).
2. **Motor:** Parsers determinísticos puros (`ofxParser`, `redeParser`, `useOsImportProcessor`) executados no browser.
3. **Persistência Local:** O estado consolidado é serializado para a chave `sandbox_reconciliation_session` no `localStorage`.
4. **Visualização:** As telas de produção (`ResumoDiaPanel`, `ConciliacaoLojasView`) são instanciadas diretamente com o `DailyReconciliationSummary` simulado.

---

## 2. Design System & UI Standards
Seguindo o padrão do `DESIGN.md` e `skills/frontend-design-pro`:
- **Superfície Base:** `bg-background` (Zinc-950).
- **Cards e Painéis:** `bg-card border border-border/50` (Zinc-900).
- **Popovers/Modais:** `bg-popover border border-border`.
- **Tipografia e Cores Semânticas:**
  - Sucesso/Matches: `text-emerald-400 bg-emerald-500/10 border-emerald-500/30`.
  - Avisos/Órfãos: `text-amber-400 bg-amber-500/10 border-amber-500/30`.
  - Divergência/Erros: `text-rose-400 bg-rose-500/10 border-rose-500/30`.
  - Sandbox/Simulação: `text-cyan-400 bg-cyan-500/10 border-cyan-500/30`.
- **Zero Arbitrary Classes:** Escala utilitária Tailwind pura sem hexadecimais soltos.

---

## 3. Interfaces TypeScript Reais

```typescript
import { DailyReconciliationSummary } from '@/hooks/useBackendConciliacao';
import { CentralImportResults } from '@/lib/parsers/centralImportManager';
import { AutoMatchingResult } from '@/lib/matchers/autoMatchingEngine';
import { StoreRow } from '@/hooks/useStores';

export interface SandboxFileMetadata {
  fileName: string;
  fileType: 'ofx' | 'rede' | 'os' | 'bills';
  sizeBytes: number;
  recordsCount: number;
}

export interface SandboxTraceLog {
  timestamp: string;
  stage: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  details?: Record<string, unknown>;
}

export interface SandboxReconciliationSession {
  sessionId: string;
  targetDate: string;
  createdAt: string;
  filesProcessed: SandboxFileMetadata[];
  summary: DailyReconciliationSummary;
  matchingResult: AutoMatchingResult;
  cashVaultEntries: Array<{
    id: string;
    store_id: string;
    store_name: string;
    os_number_ref: string;
    amount: number;
    entry_date: string;
    status: 'em_transito' | 'depositado';
  }>;
  receivables: Array<{
    id: string;
    store_id: string;
    os_number: string;
    client_name: string;
    payment_method: string;
    amount: number;
    due_date: string;
    status: string;
  }>;
  traceLogs: SandboxTraceLog[];
}

export interface SandboxCalculatorInput {
  results: CentralImportResults;
  matchingResult: AutoMatchingResult;
  mapping: Record<string, string>;
  stores: StoreRow[];
  targetDate: string;
  previousSnapshot?: DailyReconciliationSummary | null;
}
```

---

## 4. Cenários Obrigatórios

### Happy Path
1. O usuário acessa `http://localhost:8080/teste/import`.
2. A tela exibe o header com a badge **"Ambiente Sandbox 100% Local (Zero DB • Local Storage)"**.
3. Na **Aba 1 (Importação)**, o operador solta arquivos reais de OFX, Rede e OS do dia.
4. O `CentralImportWizard` executa a leitura, exibe o diagnóstico e calcula o auto-match.
5. Ao avançar e clicar em "Salvar / Confirmar Fechamento", o sistema:
   - Bloqueia chamadas ao Supabase.
   - Computa o `DailyReconciliationSummary` simulado.
   - Grava a sessão completa no `localStorage`.
   - Emite notificação de sucesso e alterna automaticamente para a **Aba 2 (Conciliação)**.
6. A **Aba 2** exibe os cards idênticos aos de produção (Apurado Sistema, Entradas OFX, Saldo Bancos + Dinheiro, Recebíveis, Pátio, Divergência e detalhe por filial).
7. O usuário clica na **Aba 3 (Traqueamento Total)** e visualiza:
   - Cada match com sua justificativa (valor, tolerância, data).
   - A lista de órfãos e motivos de recusa.
   - O extrato de cofre/dinheiro e a lista de boletos/transferências gerados.
   - Botão "Exportar Relatório JSON".

### Edge Case
1. **Nenhum arquivo enviado ou sessão vazia:**
   - A Aba 2 e a Aba 3 exibem Empty States elegantes instruindo o operador a processar arquivos na Aba 1 antes de auditar o fechamento.
2. **Persistência de Sessão e Reset Seguro:**
   - Ao recarregar a página (`F5`), a sessão anterior gravada no `localStorage` é recarregada instantaneamente.
   - Um botão visível **"Resetar / Limpar Simulação"** limpa a sessão local e permite novo teste do zero com segurança total.
3. **Bloqueio Inviolável contra Mutações no Banco:**
   - Mesmo que o operador tente clicar em ações internas (como confirmação de baixa de Daniel no cofre), em modo sandbox o status é alterado apenas no array local do `localStorage`, sem disparar `supabase.from('store_cash_vault').update(...)`.

---

## 5. Critérios de Aceitação Verificáveis
1. **Zero Mutações no Banco de Dados:** Durante a execução completa da importação, conferência e fechamento simulado na rota `/teste/import`, nenhuma requisição HTTP `POST/PATCH/DELETE` é disparada para o endpoint do Supabase (`/rest/v1/*` ou `/rpc/*`).
2. **Paridade Funcional Total:**
   - A Aba 1 aceita os mesmos arquivos `.ofx`, `.xlsx` e `.xls` que a produção.
   - A Aba 2 renderiza `ResumoDiaPanel` e `ConciliacaoLojasView` com todos os 5 pilares preenchidos.
3. **Traqueamento Completo:**
   - A Aba 3 lista a contagem exata de matches, órfãos e detalhes das taxas de cartão.
   - O botão "Exportar JSON" gera um arquivo baixável com todos os logs e dados estruturados da sessão.
4. **Terminal Gate:** `npm run build` deve compilar sem nenhum erro de tipo TypeScript (exit code 0).

---

## 6. Cenários de Teste [SCAN -> INFER -> VERIFY -> FIX]
- **Teste 1: Dry-Run Save & Local Storage:**
  - Subir arquivos no wizard -> Finalizar -> Verificar que a chave `sandbox_reconciliation_session` existe no `localStorage` com `summary.total_entradas_ofx` e `matchingResult`.
- **Teste 2: Renderização dos Cards de Conciliação:**
  - Acessar a Aba 2 -> Verificar que os valores calculados de Saldo Bancos, Cofre e Divergência batem exatamente com as somas das transações em memória.
