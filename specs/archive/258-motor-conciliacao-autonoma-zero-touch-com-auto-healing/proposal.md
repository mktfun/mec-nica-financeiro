# Proposal: Motor de Conciliação Autônoma Zero-Touch com Auto-Healing Pericial na Esteira de Importação (Spec 258)

---

## 📌 Problema
Atualmente, o usuário importa os arquivos (OFX, Rede, Relatórios de OS e Contas), o sistema processa os dados e, se houver uma divergência contábil no final (ex: diferença de R$ 1.899,78 ou de R$ 6.000,00), o sistema simplesmente exibe "Fora da tolerância". 
O usuário precisa sair da tela de importação, ir para o dashboard, abrir modais manuais, calcular deltas na mão e tentar descobrir a causa raiz.

O usuário deseja: **ZERO INTERVENÇÃO MANUAL**. Ao iniciar a importação de todos os arquivos:
1. O sistema deve processar tudo de ponta a ponta.
2. Se a conciliação bater dentro da tolerância ($\le \text{R\$\ } 50$), finaliza com sucesso.
3. Se houver divergência, **a IA deve assumir o controle automaticamente dentro da própria esteira de importação**, investigando todos os arquivos, extratos, contas, cofres e aportes com **regras periciais estritas (zero alucinação / sem inventar dados)** até regularizar as contrapartidas e zerar a diferença.

---

## 🎯 Solução Proposta
Implementar o **Motor de Conciliação Autônoma Zero-Touch com Auto-Healing**:

1. **Novo Estágio na Esteira de Importação (`AgentStage: auto_healing`):**
   * Estágio nativo no `CentralImportWizard.tsx` intitulado: **"Auditoria Pericial & Auto-Cura da Conciliação"**.
2. **Loop de Investigação Pericial Autônoma (Regras Estritas / Anti-Alucinação):**
   * **Regra 1 (Decomposição Numérica & Cofre):** Verifica se o delta bate exatamente com itens em `store_cash_vault` com divergência de `entry_date` em relação ao `target_date`.
   * **Regra 2 (Aportes Intercompany & Sócios):** Varre os extratos OFX identificando créditos de PIX/TED de sócios/filiais. Cruza com retiradas no Contas a Pagar. Se houver aporte no banco sem registro de receita operacional, lança o Aporte no Faturamento e registra o delta nas contas para equilibrar a contrapartida.
   * **Regra 3 (Assimetria de Lotes & Maquininhas):** Verifica se o OFX da tarde já compensou os cartões ou se houve estorno/MDR divergente.
   * **Regra 4 (Integridade Temporal de Caixa Anterior):** Confere se o `Caixa Anterior` puxado pelo snapshot é idêntico ao fechamento histórico consolidado do dia útil anterior.
3. **Execução Segura & Re-Apuração em Loop:**
   * A IA aplica os ajustes contábeis determinísticos no banco.
   * Reexecuta `get_daily_reconciliation_summary(p_date)` em loop (máximo de 3 iterações).
   * Assim que $|\Delta| \le \text{R\$\ } 50$, conclui com sucesso, grava o `reconciliation_audit_logs` e avisa o usuário.

---

## 🗄️ Contratos de Dados

### Tabelas Envolvidas:
* `daily_snapshots`: Gravação do fechamento diário e conferência de integridade de datas passadas.
* `store_cash_vault`: Conferência e reancoragem de dinheiro em cofre/trânsito.
* `ofx_transactions`: Varredura de PIX/TED intercompany e débitos.
* `daily_manual_bills`: Registro automático de despesas residuais identificadas em aportes.
* `daily_revenue_adjustments`: Registro automático de aportes de sócios identificados no extrato.
* `reconciliation_audit_logs`: Tabela para log pericial completo do que a IA auditou e ajustou.

---

## 🔌 API / Interface (RPCs e Hooks)

### 1. RPC `public.run_autonomous_reconciliation_loop(p_date text)`:
Orquestra o ciclo completo de auditoria e auto-cura no Postgres em <200ms:
```sql
RETURNS jsonb -- Retorna status 'conforme', delta_final, lista de investigações realizadas e ajustes aplicados
```

### 2. Atualização em `CentralImportWizard.tsx`:
Adiciona o estágio de auto-healing pericial no fluxo visual de importação.

---

## ⚠️ Risco Principal & Mitigação
* **Risco:** A IA criar lançamentos fictícios para forçar a diferença a zerar.
* **Mitigação Absoluta (Constitution Guardrail):** A IA está **proibida** de inventar números aleatórios. Toda e qualquer ação de auto-cura DEVE ter como prova primária um registro existente no banco de dados (uma linha de OFX real, um registro de cofre real ou um item do relatório de contas).
