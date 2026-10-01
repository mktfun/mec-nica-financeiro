# Design: Corrigir a Seleção de Saldo OFX e Impedir Sucesso Falso (Spec 462)

## 1. Arquitetura de Fluxo Ponta a Ponta

```mermaid
sequenceDiagram
    autonumber
    actor User as Operador Financeiro
    participant Wizard as CentralImportWizard (UI)
    participant Hook as useOfxBalanceMappings
    participant RPC as apply_ofx_balance_selection (PostgreSQL)
    participant Reconciliations as public.reconciliations
    participant Snapshots as public.daily_snapshots
    participant Rules as public.ofx_balance_rules

    User->>Wizard: Confirma importação (Step 3/7) com saldo OFX selecionado
    Wizard->>Hook: applyMutation.mutateAsync({ selections, targetDate })
    Hook->>RPC: supabase.rpc('apply_ofx_balance_selection', { p_selections, p_target_date })
    
    alt Erro SQL (ex: 42703 column updated_at)
        RPC-->>Hook: Erro Postgres 42703
        Hook-->>Wizard: Lança exceção com code e message
        Wizard->>Wizard: updateStage(2, 'error'), bloqueia 'TODAS AS ETAPAS COM SUCESSO'
        Wizard->>Wizard: Registra erro em auditData.ofxBalanceSelectionError
        Wizard->>User: Exibe Step 8 com Banner de Atenção e botão 'Repetir Saldo OFX'
    else Sucesso SQL Corrigido
        RPC->>Rules: Se remember_rule = true: verifica se regra idêntica ativa já existe
        Note over RPC,Rules: Se existir idêntica, preserva versão; senão, cria v+1
        RPC->>Reconciliations: INSERT / UPDATE (store_id, date, bank_total) sem updated_at
        RPC->>Snapshots: Atualiza saldo_bancario, metadata e updated_at
        RPC-->>Hook: { success: true, target_date, affected_stores }
        Hook-->>Wizard: Sucesso confirmado
        Wizard->>Wizard: updateStage(2, 'success'), addLog('Saldo OFX aplicado')
        Wizard->>User: Exibe Hero Banner de Sucesso Total e métricas consolidadas
    end

    opt Retry Manual (Botão 'Repetir Saldo OFX' no Step 8)
        User->>Wizard: Clica em 'Repetir Aplicação de Saldo OFX'
        Wizard->>Hook: Executa exclusivamente applyMutation.mutateAsync(...)
        Hook->>RPC: Chamada idempotente
        RPC-->>Wizard: Sucesso
        Wizard->>Wizard: Limpa erro, marca stage como 'success', invalida queries
        Wizard->>User: Notifica via toast e atualiza painel para Sucesso Total
    end
```

---

## 2. Design System & UI Standards (Zinc-950)

Este projeto segue rigorosamente o padrão de Design System do `DESIGN.md` (Shadcn/ui + Tailwind com tokens semânticos):
1. **Superfícies e Elevação:**
   - Canvas: `bg-background` (Zinc-950)
   - Cards e Painéis: `bg-card` (Zinc-900/60) com borda `border-border/60` (Zinc-800)
   - Banner de Alerta de Saldo Pendente: `bg-amber-500/10 border border-amber-500/30 text-amber-300`
   - Banner de Erro Crítico: `bg-rose-500/10 border border-rose-500/30 text-rose-300`
2. **Tipografia e Tokens de Texto:**
   - Títulos: `text-foreground` font-bold tracking-tight
   - Descrições: `text-muted-foreground` text-xs
   - Valores Monetários: font-mono tabular-nums text-foreground
3. **Botão de Ação Primária no Erro (Retry):**
   - Estilo: `bg-amber-600 hover:bg-amber-500 text-black font-semibold text-xs py-2 px-4 rounded-xl shadow-md shadow-amber-950/40`
   - Ícone: `<RefreshCw size={13} className="mr-1.5 animate-spin-once" />`

---

## 3. Interfaces TypeScript Reais

```typescript
export interface OfxBalanceSelectionErrorState {
  code?: string;
  message: string;
  targetDate: string;
  affectedAccounts: string[];
  details?: any;
  failedAt: string;
}

export interface BalanceSelectionPayload {
  account_key: string;
  store_id?: string;
  candidate_id?: string;
  candidate_data?: {
    source_kind?: string;
    balance_role?: string;
    memo_raw?: string;
    memo_normalized?: string;
    posted_date?: string;
    amount?: number;
    amount_cents?: number;
  };
  source_kind: string;
  balance_role: string;
  memo_raw?: string;
  memo_normalized?: string;
  posted_date: string;
  amount: number;
  remember_rule: boolean;
  selection_mode: 'manual' | 'rule';
}

export interface ApplyOfxBalanceSelectionResult {
  success: boolean;
  target_date: string;
  affected_stores: string[];
  was_closed: boolean;
}
```

---

## 4. Cenários Obrigatórios

### 4.1 Happy Path: Seleção de Saldo com Duas Contas na Mesma Filial
- **Cenário:**
  - Filial Santo André possui 2 contas correntes importadas via OFX no dia 30/09/2026.
  - Conta A: Saldo escolhido R$ 1.500,00 (`remember_rule = true`).
  - Conta B: Saldo negativo escolhido R$ -300,00 (`remember_rule = false`).
  - Filial Mauá possui 1 conta: Saldo escolhido R$ 5.000,00 (`remember_rule = true`).
- **Comportamento Esperado:**
  - `apply_ofx_balance_selection` executa sem erro 42703.
  - Em `reconciliations` para Santo André: `bank_total = 1200.00` (soma correta: 1500 + (-300)).
  - Em `reconciliations` para Mauá: `bank_total = 5000.00`.
  - Em `daily_snapshots`: `saldo_bancario = 6200.00`.
  - Apenas as regras da Conta A e de Mauá são salvas em `ofx_balance_rules`. Conta B não cria regra.
  - O Wizard exibe: `✅ Extratos OFX e saldos consolidados com sucesso!`.

### 4.2 Edge Case 1: Falha na RPC e Bloqueio de Falso Sucesso
- **Cenário:**
  - A conexão de rede falha ou a chamada à RPC retorna código de erro PostgreSQL.
- **Comportamento Esperado:**
  - O Wizard captura a exceção e **NÃO** exibe "TODAS AS ETAPAS FORAM CONCLUÍDAS COM SUCESSO!".
  - O log do terminal de importação exibe: `❌ Falha ao persistir saldos OFX: [mensagem do erro]`.
  - O agente de OFX (`importStages[2]`) recebe status `'error'`.
  - O JSON de auditoria gerado contém o objeto `ofxBalanceSelectionError` com código, mensagem, data e contas.
  - No Step 8, o painel exibe um card de alerta indicando que as OSs e transações foram salvas, mas os saldos oficiais de extrato estão pendentes, fornecendo o botão "Repetir Aplicação de Saldo OFX".

### 4.3 Edge Case 2: Repetição Idempotente (Retry Isolado)
- **Cenário:**
  - Após a correção ou reconexão, o operador clica em "Repetir Aplicação de Saldo OFX".
- **Comportamento Esperado:**
  - O retry chama apenas `applyOfxBalanceSelection` com o mesmo payload.
  - Não faz reimportação de OSs nem reprocessa o extrato bancário.
  - Se a regra já houver sido criada, ela não gera uma versão subsequente duplicada (preserva a versão atual).
  - Não gera eventos redundantes em `ofx_balance_selection_events`.
  - Ao concluir com sucesso: o alerta de erro desaparece, o estágio do OFX passa para `'success'`, as queries de saldo são invalidadas e os valores no banco coincidem exatamente com o exibido.

### 4.4 Edge Case 3: Fechamento Contábil Selado (`is_closed = true`)
- **Cenário:**
  - A data de destino já possui `is_closed = true` em `daily_snapshots`.
- **Comportamento Esperado:**
  - O sistema respeita as regras de autorização/permissão de perfil (`admin`, `gerente`, `financeiro`).
  - O retorno da RPC indica `was_closed: true`, mantendo a auditoria do fechamento íntegra.

---

## 5. Critérios de Aceitação Verificáveis

1. **Eliminação do Erro 42703:**
   - A chamada à RPC `apply_ofx_balance_selection` com payload válido de seleção nunca lança erro 42703.
2. **Soma Contábil Fiel por Filial:**
   - Para múltiplas contas vinculadas à mesma filial, `reconciliations.bank_total` é exatamente o somatório algébrico dos saldos escolhidos (considerando positivos, negativos e zero).
3. **Idempotência de Regras:**
   - Executar duas vezes consecutivas a RPC com a mesma seleção e `remember_rule = true` não cria versão duplicada em `ofx_balance_rules`.
4. **Sem Falso Sucesso:**
   - Caso a RPC lance exceção forçada em teste, o Wizard não anuncia conclusão total e marca o estágio do OFX como erro.
5. **Retry Funcional:**
   - O botão "Repetir Aplicação de Saldo OFX" executa com sucesso sem exigir reupload de arquivos.
6. **Build Limpo:**
   - `npm run build` passa sem erros de tipagem TypeScript.
