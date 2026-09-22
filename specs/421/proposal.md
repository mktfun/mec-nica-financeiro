# Spec 421 — Proposta: Sandbox de Importação e Conciliação 100% Local (Zero DB & Traqueamento Total)

## 1. Problema Diagnosticado
A implementação anterior da rota `/teste/import` introduziu uma tela artificial com mocks estáticos fictícios (10 transações OFX falsas, 10 OSs falsas e seletores de tolerância) que não refletem a realidade operacional do sistema.
O operador necessita de um **Ambiente de Testes e Simulação Real (Dry-Run)** que:
1. **Não use mocks estáticos fictícios:** Permita carregar arquivos reais do dia a dia (extratos OFX, relatórios de vendas Rede, planilhas de OS e contas a pagar).
2. **Execute o fluxo idêntico de produção:** Utilize exatamente os mesmos parsers (`parseCentralImports`), o mesmo motor de conciliação (`autoMatchingEngine`), o mesmo cockpit de diagnóstico e a mesma visualização do painel de conciliação (`ResumoDiaPanel` e `ConciliacaoLojasView`).
3. **Garantia absoluta de zero mutações no banco:** Nenhuma chamada `insert`, `update`, `delete` ou RPCs de fechamento (`fechar_dia`) deve ser enviada ao Supabase.
4. **Persistência em Local Storage / In-Memory:** Toda a sessão, arquivos processados, estado de cofre e fechamento simulado devem ser salvos no `localStorage`.
5. **Traqueamento Total ("Poder traquear TUDO"):** Painel forense de telemetria exibindo o raio-X completo do motor: motivos de cada match, critérios de rejeição/órfãos, taxas descontadas, títulos de recebíveis gerados e lançamentos de cofre, com opção de exportar o dump JSON da simulação.

## 2. Solução Proposta
Transformar a rota `/teste/import` em um **Sandbox Hub Unificado de Importação e Conciliação**:
- **Aba 1: Importação & Motor (Modo Dry-Run Real):**
  Hospeda o `CentralImportWizard` com a flag `isSandbox={true}`. O operador faz drag-and-drop de arquivos reais. O motor roda o pipeline completo. Na etapa de finalização, em vez de persistir no Supabase, consolida os dados e salva na chave `localStorage['sandbox_reconciliation_session']`.
- **Aba 2: Painel de Conciliação Simulada (Visual Idêntico à Produção):**
  Renderiza o `ResumoDiaPanel` e a `ConciliacaoLojasView` consumindo um objeto `DailyReconciliationSummary` calculado deterministicamente em memória a partir dos arquivos processados, exibindo os mesmos 5 pilares, cards por filial e divergência calculada.
- **Aba 3: Traqueamento Total & Telemetria Forense:**
  Console detalhado com filtros para auditar:
  1. *Matches PIX/OS:* Valor, data, cliente e pontuação de desempate.
  2. *Órfãos do Extrato & Motivos de Recusa:* Análise de por que não deu match.
  3. *Cartões Rede:* Lotes agrupados por bandeira/data de crédito e deduções de taxas (MDR/antecipação).
  4. *Cofre / Daniel:* Lançamentos em dinheiro extraídos de OS e simulação de baixa reativa local.
  5. *Recebíveis:* Boletos e transferências identificados.
  6. *Ações Rápidas:* "Exportar JSON Completo", "Recarregar Sessão Salva" e "Limpar / Resetar Sandbox".

## 3. Skills Especializadas Aplicadas
- `skills/frontend-design-pro`: Design System Dark UI Zinc-950, tokens semânticos, ausência de classes arbitrárias, feedback tátil e micro-animações.
- `skills/backend-patterns`: Cálculos contábeis puros desacoplados de IO, imutabilidade de estruturas e tipagem estrita `ActionResult<T>`-like.
- `skills/database`: Blindagem estrita para zero persistência no PostgreSQL/Supabase em modo sandbox.
- `skills/security`: Isolamento de dados do sandbox em armazenamento local efêmero, sem vazamento para tabelas de produção.

## 4. Contratos de Dados

### Estrutura da Sessão em Local Storage (`sandbox_reconciliation_session`):
```typescript
export interface SandboxReconciliationSession {
  sessionId: string;
  targetDate: string;
  createdAt: string;
  filesProcessed: {
    fileName: string;
    fileType: 'ofx' | 'rede' | 'os' | 'bills';
    recordCount: number;
  }[];
  summary: DailyReconciliationSummary;
  matchingResult: {
    matchedCount: number;
    resolvedMatches: Array<{
      storeId: string;
      osNumber: string;
      sourceId: string;
      type: string;
      amount: number;
      paymentMethod: string;
      ofxId?: string;
      feeDeducted?: number;
      reason?: string;
    }>;
    unmatchedTransactions: Array<{
      id: string;
      source: string;
      storeId: string;
      storeName: string;
      date: string;
      description: string;
      paymentMethod: string;
      amount: number;
      status: string;
      rejectionReason?: string;
    }>;
    settledBatches?: any[];
  };
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
  traceLogs: Array<{
    timestamp: string;
    stage: string;
    level: 'info' | 'warn' | 'error' | 'success';
    message: string;
    details?: any;
  }>;
}
```

## 5. Arquivos Afetados

### [Arquivos Existentes Reutilizados/Modificados]
1. `src/routes/teste.import.tsx`:
   - Substituição completa da tela de mocks artificiais pelo Sandbox Hub Unificado (Tabs: Wizard Real em Dry-Run, Painel de Conciliação Idêntico, Telemetria Forense).
2. `src/components/importacoes/CentralImportWizard.tsx`:
   - Adicionar suporte à prop `isSandbox?: boolean` e callback `onSandboxComplete?: (session: SandboxReconciliationSession) => void`.
   - No método `handleConfirm`, quando `isSandbox === true`, desviar da persistência no Supabase para montar a sessão simulada e salvar em `localStorage`.
3. `src/components/conciliacao/ResumoDiaPanel.tsx` & `src/components/conciliacao/ConciliacaoLojasView.tsx`:
   - Reutilizados diretamente para renderizar a conciliação na aba simulada sem duplicar código de interface.

### [Arquivos Novos]
1. `src/lib/sandbox/sandboxStorage.ts`:
   - Gerenciador de leitura, escrita, exportação e reset de sessões locais no `localStorage`.
2. `src/lib/sandbox/sandboxCalculator.ts`:
   - Função pura para sintetizar o objeto `DailyReconciliationSummary` a partir dos resultados de `parseCentralImports` e `autoMatchingEngine`.
3. `src/components/sandbox/SandboxTraceabilityPanel.tsx`:
   - Painel forense de auditoria para traqueamento detalhado (matches, órfãos, cartões, cofre, recebíveis e logs do motor).

## 6. Plano de Rollback
Como todas as alterações em modo sandbox são estritamente contidas no frontend e o `CentralImportWizard` apenas recebe props opcionais (`isSandbox?: boolean` com default `false`), qualquer reversão pode ser realizada revertendo `src/routes/teste.import.tsx` e retirando o desvio condicional de salvamento em `CentralImportWizard.tsx`, sem nenhum impacto no banco de dados de produção.

## 7. Risco Principal e Mitigação
- **Risco:** Um clique acidental de "Salvar / Confirmar" em modo sandbox disparar chamadas para as tabelas reais do Supabase.
- **Mitigação:** Trava estrita de segurança no topo do handler `handleConfirm` com `if (isSandbox) { return handleSandboxDryRun(); }`, garantindo que nenhuma mutation Supabase seja instanciada ou disparada.
