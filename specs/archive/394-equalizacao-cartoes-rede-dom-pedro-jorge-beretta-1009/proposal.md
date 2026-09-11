# Proposal — Spec 394: Motor de Conciliação Determinístico de Cartões por Bandeiras (Sem IA) & Equalização Bancária (10/09/2026)

## 1. Problema e Diagnóstico Forense

No fechamento financeiro do dia 10/09/2026, a planilha oficial do cliente (`CONCILIAÇÃO 1009 Copia.xlsx`) consolida um **Saldo Total de Ativos de R$ 154.794,67** (Célula `G3` da aba `SALDO`).
No sistema, o fechamento apresentou anomalias graves no motor de conciliação de maquininhas:
1. **Falhas Críticas do Uso de IA (Gemini) no Motor de Matching**:
   - O sistema delegava a conciliação bancária de cartões para uma chamada externa de LLM (`reconcileRedeWithOfxViaGemini`).
   - Essa abordagem se mostrou frágil: falhas de timeout, omissão de IDs das vendas (`matchedPosIds` vazio), ausência de persistência das baixas no banco e oscilação de critérios contábeis.
   - O usuário determinou explicitamente: **eliminar a IA do motor de matching** e implementar um algoritmo 100% determinístico e matemático, com batimento multi-nível e por **bandeiras que caíram no banco**.
2. **Duplicação de Vendas e Inflação de Saldos no Sistema**:
   - **Jorge Beretta**: Exibia **R$ 2.105,16** a mais na coluna "A Compensar" no modal Raio-X.
   - **Dom Pedro**: Exibia **R$ 20.450,67** a mais na coluna "A Compensar" no modal Raio-X.
   - **Total Geral**: O sistema acumulou **R$ 42.362,89** em `cartoes_a_compensar` na RPC `get_daily_reconciliation_summary`, somando todas as vendas indiscriminadamente.
3. **Fato Pericial nos Extratos OFX e Planilha Oficial**:
   - **Dom Pedro (`dp.ofx`)**: No dia 10/09 caíram exatamente dois créditos da adquirente por bandeira:
     - `RECEBIMENTO REDE MAST`: **R$ 10.911,47** (Mastercard)
     - `RECEBIMENTO REDE VISA`: **R$ 9.539,20** (Visa)
     - Total = **R$ 20.450,67** (já compõe o saldo bancário de R$ 20.534,66).
   - **Jorge Beretta (`beretta.ofx`)**: No dia 10/09 caiu:
     - `RECEBIMENTO REDE MAST`: **R$ 2.105,16** (Mastercard)
     - Total = **R$ 2.105,16** (já compõe o saldo bancário de R$ 55.400,75).
   - **Piraporinha**: O relatório da Rede indicou **R$ 4.642,10** (Visa). No extrato bancário de Piraporinha, **não houve crédito** desse lote no dia 10/09. Por isso, na planilha oficial (Linha `D20`), está registrado: `Cartão Debito 4.642,10 | NÃO ENTROU`.
   - **Composição Exata do Saldo da Holding na Planilha Oficial**:
     - Saldos Bancários Positivos: R$ 149.272,57
     - Dinheiro em Trânsito (Cofre): R$ 880,00 (Mauá R$ 380 + Jabaquara R$ 500)
     - Cartões a Compensar (Não Entrou): R$ 4.642,10 (Piraporinha)
     - **TOTAL CONSOLIDADO = R$ 154.794,67** (100% exato ao centavo!).

---

## 2. Solução Proposta — Motor Determinístico de Conciliação Multi-Nível por Bandeiras (100% Sem IA)

Substituir completamente qualquer chamada de IA no fluxo de liquidação de maquininhas por um **Motor Matemático Determinístico em Cascata**, executado tanto no frontend (TypeScript) quanto no banco de dados (PostgreSQL RPC):

### Cascata de Batimento Determinístico (Todas as Possibilidades):
1. **Nível 1: Match Agrupado por Bandeira (Bandeira x Lote)**
   - Agrupa as vendas da adquirente por `store_id` + `bandeira` (Mastercard, Visa, Elo, Hipercard, Outras).
   - Agrupa os créditos OFX da adquirente da loja por bandeira (`REDE MAST` $\rightarrow$ Mastercard, `REDE VISA` $\rightarrow$ Visa, `REDE ELO` $\rightarrow$ Elo).
   - Se $|S_{vendas}(Bandeira) - S_{ofx}(Bandeira)| \le \text{R\$\ } 0,05$:
     - **Match 100% Perfeito!** Todas as vendas daquela bandeira recebem `settlement_status = 'entrou'` com o `matched_ofx_id` correspondente.
2. **Nível 2: Match Exato 1:1 (Transação Individual x Depósito Único)**
   - Para vendas individuais não resolvidas no Nível 1, verifica se o `net_amount` bate exatamente com um depósito OFX ($|net - amount| \le 0.02$).
   - Vincula e liquida a transação diretamente.
3. **Nível 3: Match Consolidado da Loja com Algoritmo Guloso (Knapsack/Greedy)**
   - Se os créditos OFX da Rede vierem consolidados (ou com pequenas divergências entre bandeiras):
     - Se $\sum Créditos_{OFX} \ge \sum Vendas_{Rede} - 0.05$: todas as vendas da loja recebem `entrou`.
     - Se $\sum Créditos_{OFX} < \sum Vendas_{Rede}$: liquida as vendas ordenadas até o esgotamento do crédito OFX. As vendas não cobertas permanecem como `nao_entrou` (A Compensar).
4. **Nível 4: Identificação e Baixa de Aluguel de Maquininha**
   - Retenções automáticas da adquirente (ex: R$ 119,00 ou R$ 238,00) são sinalizadas para baixa com 1 clique no Cockpit Pós-Motor (`PostMotorDiagnosticCockpit.tsx`).
5. **Nível 5: Equalização no Banco de Dados (PostgreSQL)**
   - Criar a RPC `reconcile_rede_with_ofx(p_date date)`: executa essa exata lógica determinística via SQL no banco de dados.
   - Atualizar a RPC `get_daily_reconciliation_summary`: filtra estritamente `settlement_status IN ('nao_entrou', 'a_compensar')` e apura `nao_entrou_valor` por loja via $\max(0, \text{rede\_liquido} - \text{ofx\_maquininhas})$.
   - Equalizar `reconciliations`, `pos_transactions` e `daily_snapshots` para 10/09/2026, travando o saldo consolidado em **R$ 154.794,67**.

---

## 3. Contratos de Dados & SQL

### Tabelas Envolvidas:
- `pos_transactions`:
  - `settlement_status`: `'entrou' | 'nao_entrou' | 'a_compensar'`
  - `settled_date`: `date`
  - `matched_ofx_id`: `uuid`
- `reconciliations`:
  - `bank_total`: `numeric(12,2)`
- `daily_snapshots`:
  - `saldo_bancario`: `149272.57`
  - `dinheiro_lojas`: `880.00`
  - `cartoes_a_compensar`: `4642.10`

### Novas RPCs e Funções SQL:
- `public.reconcile_rede_with_ofx(p_date date) RETURNS jsonb`:
  - Executa o matching determinístico por bandeiras e lotes no PostgreSQL.
- `public.get_daily_reconciliation_summary(p_date text, p_force_dynamic boolean)`:
  - Filtro estrito de `cartoes_a_compensar` apenas para transações pendentes (`nao_entrou`, `a_compensar`).

---

## 4. Arquivos Afetados

### Arquivos Novos:
- `supabase/migrations/20260910000047_deterministic_card_matching_by_brand_and_1009_balance.sql` [NEW]

### Arquivos Modificados:
- `src/lib/llm-matcher.ts` [MODIFY]: Substituição do Gemini por `reconcileRedeWithOfxDeterministic` (100% determinístico por bandeiras).
- `src/components/importacoes/CentralImportWizard.tsx` [MODIFY]: Mapeamento correto de `id: item.id`, bandeira (`brand`), e chamada do motor determinístico.
- `src/components/importacoes/wizard/Step4FinalAuditAndClose.tsx` [MODIFY]: Persistência de `settlement_status = 'entrou'` em `pos_transactions` sem IA.
- `src/hooks/useBackendConciliacao.ts` [MODIFY]: Blindagem matemática anti-duplicação.
- `src/components/conciliacao/SaldoBancosDetailModal.tsx` [MODIFY]: Apresentação de "A Compensar = R$ 0,00" para lojas liquidadas.

---

## 5. Plano de Rollback
- Reversão segura via migration SQL caso haja qualquer inconsistência.
- O motor determinístico opera como função pura com testes unitários, não gerando efeitos colaterais fora de `pos_transactions`.

---

## 6. Risco Principal e Mitigação
- **Risco**: Uma adquirente agrupar bandeiras distintas em um único depósito sem discriminação textual.
- **Mitigação**: O algoritmo possui a cascata: Nível 1 (Bandeira) $\rightarrow$ Nível 2 (1:1 individual) $\rightarrow$ Nível 3 (Lote da Loja). Se o texto do OFX não indicar a bandeira, o Nível 3 entra automaticamente e liquida o lote com base no total creditado.
