# 📋 Spec 436 — Motor de Matching Estrito & Eliminação de Falsos Positivos

## 1. Problema Diagnosticado (Análise Forense)

A auditoria forense realizada diretamente no banco de dados (`ofx_transactions`, `patio_os`, `transactions` e `daily_revenue_adjustments`) e nos arquivos de match (`CentralImportWizard.tsx`, `autoMatchingEngine.ts` e na RPC `run_autonomous_reconciliation_loop`) confirmou **três falhas críticas de integridade**:

1. **Match Cego de PIX com OS no Wizard de Importação (`CentralImportWizard.tsx` L1539-L1569):**
   - O wizard continha um loop `for (const [s_id, osList] of Object.entries(autoMatchMap))` que casava qualquer entrada no extrato bancário com a primeira OS encontrada cujo `paid_value` ou `delta_paid` batesse em até R$ 0,10, **mesmo sem bater nome, sem a OS ter forma de pagamento PIX e, de forma ainda mais grave, cruzando com OSs de filiais diferentes**.
   - **Evidência no Banco:** 
     - Três transações PIX de pessoas diferentes (R$ 2.000 de Flavio, R$ 1.800 de Marli, R$ 980 de Evandro) foram todas casadas com a mesma OS #609 de Edmilson José Ribeiro, cujo pagamento original era **Cartão de Crédito (R$ 1.013,70)**.
     - Um rendimento bancário automático de **R$ 0,01** (`REND PAGO APLIC AUT APR`) da conta do Itaú foi vinculado como recebimento da OS #411 de Abraao Shebabo (R$ 6.019,50).
     - Um PIX de R$ 80,00 de Roberto Carlos Perez foi casado com a OS #18472 de Roberto Araujo Figueiredo (R$ 403,60 em Crédito).

2. **Heurísticas Permissivas de Fallback no `autoMatchingEngine.ts` (Tiers 1.5, 3 e 4):**
   - O Tier 4 casava OFX com OS apenas por valor se houvesse apenas uma candidata na loja, sem validar se o nome do cliente ou documento tinham qualquer relação.
   - O Tier 3 casava por valor sem validar o nome do cliente.
   - O Tier 1.5 aceitava matches de pagamentos parciais com sobreposições genéricas de nomes.

3. **Injeção Automática de Faturamento no Banco de Dados (`run_autonomous_reconciliation_loop`):**
   - A RPC autônoma varria extratos bancários em busca de termos como `DANIEL`, `ROGERIO`, `RAPHAEL`, `APORTE`, `TRANSFERENCIA` e, se houvesse delta de conciliação, inseria **automaticamente** registros em `daily_revenue_adjustments` como tipo `aporte`, inflacionando o faturamento do dia sem qualquer aprovação ou justificativa humana.

---

## 2. Solução Proposta

Implementar uma blindagem estrita e determinística que restrinja os cruzamentos de dados **exclusivamente aos 4 tipos autorizados**:

1. **Rede x OS:**
   - Venda de cartão na Rede casando com a parcela de Cartão da OS.
   - Exigência estrita: Mesma filial (`store_id`), forma de pagamento Cartão na OS (`parsed_credit` / `parsed_debit` > 0 ou tag de cartão), tolerância máxima de R$ 0,05 entre o valor líquido/bruto e a parcela da OS.
2. **PIX x OS:**
   - Entrada PIX do OFX casando com a parcela PIX da OS.
   - Exigência estrita: 
     - **Mesma Filial Obrigatória** (`ofx.store_id === os.store_id`).
     - **Forma de Pagamento PIX na OS Obrigatória** (`pix_transfer_value > 0` ou forma contendo PIX/Transf). OSs pagas exclusivamente em Cartão ou Dinheiro NUNCA recebem match de PIX.
     - **Duplo Fator de Validação (Valor + Identidade):** Valor exato (tolerância R$ 0,05) **E** correspondência inequívoca de tokens de nome do cliente (`matchClientTokens`) ou CPF/CNPJ.
     - **Bloqueio Total:** Rendimentos (`AUT APR`), adquirentes (`REDE`, `CIELO`), transferências e aportes são sumariamente descartados de qualquer vínculo com OS.
     - **Zero Match Cego:** Sem confirmação de identidade e forma de pagamento, a transação PERMANECE ÓRFÃ no balde de pendências para decisão manual do operador.
3. **Contas x Faturamento / Saídas OFX:**
   - Match de contas a pagar (`daily_manual_bills`) com saídas bancárias (`type = 'out'`) via `expenseMatcher.ts`.
   - Remoção de qualquer injeção arbitrária no faturamento sem ação explícita do operador.
4. **Entre Lojas (Intercompany):**
   - Preservar integralmente o pareamento intercompany existente, que já opera de forma correta.
5. **Saneamento do Banco de Dados:**
   - Executar DML seguro para limpar os vínculos espúrios de `matched_os_number` e falsos `PIX / Recebimento OS` gerados pelas importações anteriores no dia 22/09.

---

## 3. Skills Especializadas Aplicadas

- `backend-patterns`: Validação estrita de contratos de dados, tipagem forte e desacoplamento de heurísticas perigosas.
- `database`: Saneamento de dados inconsistentes no Supabase via SQL idempotente e refatoração da RPC `run_autonomous_reconciliation_loop`.
- `security`: Aplicação de princípios de mínima permissividade e prevenção de corrupção contábil/patrimonial.

---

## 4. Contratos de Dados & Regras de Negócio

### A. Regra Inviolável de Elegibilidade PIX x OS:
$$\text{Elegível} \iff (\text{store\_id}_{\text{ofx}} = \text{store\_id}_{\text{os}}) \land (\text{FormaPagamento}_{\text{os}} \ni \text{'PIX'}) \land (|\text{Valor}_{\text{ofx}} - \text{Valor}_{\text{os}}| \le 0.05) \land \text{TokenMatch}(\text{Nome}_{\text{cliente}}, \text{Contraparte})$$

### B. Bloqueio Negativo Absoluto:
- $\text{Se } \text{counterpart\_name} \lor \text{bank\_name} \text{ contém } [\text{'REND'}, \text{'APLIC'}, \text{'REDE'}, \text{'CIELO'}, \text{'STONE'}, \text{'INTERCOMPANY'}] \implies \mathbf{MATCH\_OS = NULL}$.

---

## 5. Arquivos Afetados

### Arquivos Existentes Modificados:
1. `src/lib/matchers/autoMatchingEngine.ts`:
   - Eliminação de Tiers 1.5, 3 e 4 permissivos.
   - Aplicação da regra estrita de duplo fator (Valor + Nome + Forma PIX).
2. `src/components/importacoes/CentralImportWizard.tsx`:
   - Remoção completa do bloco de auto-match permissivo (linhas 1539-1569).
   - Integração com o motor estrito de matching.
3. Supabase RPC `run_autonomous_reconciliation_loop`:
   - Remoção da criação automática de registros em `daily_revenue_adjustments`.
4. Banco de Dados Supabase (DML):
   - Remoção dos matches inválidos gerados no dia 22/09 em `ofx_transactions`.

### Arquivos Novos:
- Nenhum arquivo novo necessário (reutilização cirúrgica da infraestrutura existente).

---

## 6. Plano de Rollback

Caso a spec necessite ser revertida:
1. Rollback do código via Git checkout dos arquivos modificados.
2. Restauração do snapshot e histórico pré-spec mantido em log forense.
3. Zero perda de dados operacionais reais (OSs e extratos bancários permanecem intactos).

---

## 7. Risco Principal e Mitigação

- **Risco:** Transações que antes casavam automaticamente de forma frouxa agora ficarem como "órfãs / pendentes" no wizard.
- **Mitigação:** Isso é exatamente o comportamento desejado. O sistema não deve assumir vínculos contábeis incorretos; o operador deve ter visibilidade cristalina das transações que exigem classificação manual.
