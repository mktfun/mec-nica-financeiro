# Proposal: Copiloto IA Forense & Motor de Auditoria Autônoma (Spec 257)

---

## 📌 Problema
Atualmente, quando ocorre qualquer divergência contábil no fechamento do dia (ex: `+R$ 1.899,78`, `-R$ 3.342,46`, ou `-R$ 4.427,84`), o usuário é confrontado com uma mensagem genérica de "Fora da tolerância" sem entender a **causa raiz matemática** que originou o centavo da diferença.

O usuário precisa recorrer a uma investigação manual complexa para identificar:
1. **Decomposição do Delta:** Descobrir se a diferença é a soma exata de um lançamento específico (ex: `1.899,78 + 0,22 = 1.900,00` ➔ Cofre de Rudge Ramos).
2. **Efeito Cascata Temporal:** Identificar se o `Caixa Anterior` foi alterado por modificações retroativas no snapshot de datas passadas.
3. **Aportes e Transferências Intercompany:** Mapear entradas bancárias de PIX de sócios/filiais não compensadas com despesas de retirada no ERP.
4. **Assimetria de Horários:** Identificar que arquivos matutinos não possuíam créditos da Rede enquanto os vespertinos já os continham.

---

## 🎯 Solução Proposta
Implementar um **Copiloto IA Forense & Motor de Auditoria Autônoma** integrado nativamente à tela de Conciliação Diária, capaz de replicar as heurísticas de investigação pericial:

1. **Decompositor Matemático de Deltas (Deterministic Pattern Matcher):**
   * Roda instantaneamente ao carregar o fechamento.
   * Cruza a diferença final com assinaturas numéricas exatas do banco (`store_cash_vault`, `ofx_transactions`, `daily_manual_bills`, `pos_transactions`, `daily_revenue_adjustments`).
2. **Laudo Pericial Autônomo com Diagnóstico Estruturado:**
   * Substitui o alerta genérico por uma caixa de diagnóstico analítico contendo:
     * *Causa Raiz Identificada* (com valores e lojas envolvidas).
     * *Efeito Cascata Explicado* (se o Caixa Anterior foi afetado).
     * *Ação Corretiva Sugerida*.
3. **Botão de Auto-Cura (1-Click Remediation):**
   * Executa a regularização de forma segura (ex: reancorar cofre, conciliar aporte no faturamento, auto-lançar despesa delta).
4. **Chat Pericial Integrado ("Pergunte ao Auditor IA"):**
   * Gaveta retrátil lateral alimentada pelo modelo LLM configurado em `useAiSettings` (Gemini 2.5 Flash / Flash Lite) com *Tool Calling* seguro sobre o banco de dados.

---

## 🗄️ Contratos de Dados

### Tabelas Envolvidas:
* **`daily_snapshots`**: Leitura de histórico e recalibração de caixas anteriores.
* **`store_cash_vault`**: Verificação de depósitos em trânsito e data de ancoragem (`entry_date`).
* **`ofx_transactions`**: Varredura de créditos/débitos avulsos e transferências de sócios.
* **`pos_transactions`**: Conferência de lotes Rede e taxas de MDR.
* **`daily_manual_bills`**: Verificação de despesas lançadas no dia.
* **`daily_revenue_adjustments`**: Verificação de aportes e estornos de cartão.
* **`reconciliation_audit_logs` (NOVA TABELA)**: Histórico de diagnósticos gerados e ações de auto-cura executadas.

```sql
CREATE TABLE IF NOT EXISTS public.reconciliation_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_date DATE NOT NULL,
    divergence_amount NUMERIC(15, 2) NOT NULL,
    root_cause_type TEXT NOT NULL, -- 'vault_date_mismatch', 'intercompany_delta', 'snapshot_cascade', 'unrecorded_expense', 'card_timing'
    diagnosis_summary TEXT NOT NULL,
    remediation_payload JSONB DEFAULT '{}'::jsonb,
    is_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 🔌 API / Interface (RPCs e Hooks)

### 1. RPC `audit_daily_reconciliation_delta(p_date text)`:
Executa a varredura pericial direta no Postgres em <50ms e retorna:
```json
{
  "has_divergence": true,
  "delta_final": 1899.78,
  "patterns_found": [
    {
      "type": "vault_anchor_mismatch",
      "store_id": "st-07",
      "store_name": "Rudge Ramos - CAP",
      "amount": 1900.00,
      "description": "OS #8736 - Rudge Ramos",
      "impact": "Caixa anterior inflado em R$ 1.900,00",
      "remediation_action": "reanchor_vault_entry",
      "remediation_id": "11d0e257-4418-49f7-91a8-4de0cb16bdc0"
    }
  ],
  "human_explanation": "Diferença de R$ 1.899,78 causada pela ancoragem indevida do dinheiro em trânsito de R$ 1.900,00 no dia anterior."
}
```

### 2. Hook `useForensicAudit(targetDate, summary)`:
Hook React que gerencia a execução do diagnóstico e fornece as ações de remediação ao frontend.

---

## 🛡️ Features Existentes Impactadas
* `src/components/conciliacao/ResumoDiaPanel.tsx`: O card lateral de Diferença Final e a barra de auditoria recebem o diagnóstico forense dinâmico.
* `src/components/conciliacao/AuditTrailBar.tsx`: Integrado com os diagnósticos gerados pela RPC pericial.

---

## ⚠️ Risco Principal
* **Execução indevida de remediação:** O usuário clicar em auto-correção sem entender a mudança contábil.
  * **Mitigação:** Toda remediação de auto-cura exige diálogo de confirmação com preview explícito do *"Antes vs Depois"* dos saldos afetados.
