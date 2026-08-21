# Design: Motor de Conciliação Autônoma Zero-Touch com Auto-Healing Pericial (Spec 258)

---

## 🏛️ Arquitetura Técnica do Pipeline Zero-Touch

```mermaid
flowchart TD
    A[Upload dos Arquivos na Central de Importação] --> B[Estágio 1: Parse de OSs, OFX, Rede, Contas]
    B --> C[Estágio 2: Salvamento das Transações & Matches no Banco]
    C --> D[Estágio 3: Primeira Apuração de Resumo get_daily_reconciliation_summary]
    
    D --> E{Diferença Final <= R$ 50?}
    E -->|SIM| F[✅ Concluir com Status Conforme]
    
    E -->|NÃO| G[🤖 Estágio 4: Auto-Healing Pericial da IA]
    G --> H[Varredura de Assinaturas de Cofre / Transito]
    G --> I[Varredura de Aportes & PIX Intercompany nos OFX]
    G --> J[Cruzamento com Retiradas do Contas a Pagar]
    G --> K[Verificação de Integridade do Caixa Anterior Histórico]
    
    H & I & J & K --> L[Aplicação dos Ajustes Contábeis Rastreáveis no Banco]
    L --> M[Segunda Apuração de Resumo]
    M --> N{Diferença Final <= R$ 50?}
    N -->|SIM| O[🎉 Salvar Log Pericial e Finalizar Wizard com Sucesso]
    N -->|NÃO (após 3 ciclos)| P[⚠️ Finalizar com Relatório Detalhado das Divergências Irredutíveis]
```

---

## 🛡️ Constitution: Regras Estritas de Investigação Pericial (Zero Alucinação)

1. **PROIBIDO INVENTAR VALORES:** Nenhuma transação pode ser criada se não existir um `fitid` de OFX, um ID de `store_cash_vault` ou um registro em `daily_manual_bills` que a fundamente.
2. **REGRA DA CONTRAPARTIDA DUPLA (Partidas Dobradas):**
   * Se um crédito bancário de PIX for identificado como Aporte de Sócio:
     - Deve ser adicionado ao Faturamento (`daily_revenue_adjustments`).
     - Se não houver despesa de retirada correspondente no contas a pagar, o delta deve ser lançado em `daily_manual_bills` com justificativa clara (ex: `Aporte Sócio não lançado no ERP`).
3. **REGRA DA DATA ANTERIOR HISTÓRICA:**
   * O `Caixa Anterior` de uma data $T$ deve ser ESTRITAMENTE o `Caixa Atual` consolidado da data $T-1$. Se houver divergência, o sistema puxa o fechamento aprovado de $T-1$.

---

## 📝 Interfaces TypeScript

```typescript
// src/types/autoHealing.ts

export interface AutoHealingStep {
  id: string;
  stepName: string;
  status: 'running' | 'resolved' | 'skipped' | 'failed';
  details: string;
  adjustedAmount?: number;
}

export interface AutonomousReconciliationResult {
  initialDelta: number;
  finalDelta: number;
  isConforme: boolean;
  iterationsCount: number;
  stepsExecuted: AutoHealingStep[];
  auditLogId?: string;
  summary: Record<string, any>;
}
```

---

## 🧪 Cenários de Verificação (SCAN ➔ INFER ➔ VERIFY ➔ FIX)

### Cenário 1: Fechamento Perfeito sem Divergência
* **SCAN:** Arquivos importados batem com tolerância $\le \text{R\$\ } 50$ de primeira.
* **INFER:** Nenhuma ação de auto-healing necessária.
* **VERIFY:** Estágio de auto-healing passa direto como "Fechamento Conforme Apurado".

### Cenário 2: Divergência por Ancoragem de Dinheiro no Cofre + Aporte Intercompany (Caso Real 21/08)
* **SCAN:** Delta inicial de `+R$ 1.899,78`.
* **INFER:**
  1. Detecta `R$ 1.900,00` em cofre ancorado no dia 19/08 ao invés de 21/08.
  2. Detecta que recalibrar a ancoragem reduz a diferença para `-R$ 0,22`.
* **VERIFY:** Executa a recalibração, recalcula e obtém `-R$ 0,22` ($\le \text{R\$\ } 50$).
* **FIX:** Salva snapshot aprovado com log pericial.
