# Proposal: Paridade de Elegibilidade entre Matcher Automático e Manual e Desvinculação Consistente (Spec 466 — Revisão Final)

## 1. Problema Diagnosticado

Nas análises da conciliação do dia 28/09/2026 (e no caso comprovado da loja **Jabaquara, OS 443, venda de R$ 5.800,00**), o motor canônico de pré-matching Rede × OS (`match_stage2_rede_os`) descartou sistematicamente 32 de 48 vendas legítimas.

### 1.1 Causa-Raiz no Motor Canônico (`match_stage2_rede_os`)
- O motor de pré-matching Rede × OS reside na RPC `match_stage2_rede_os` (invocada por `auto_match_daily_transactions`).
- Na linha 450 de `match_stage2_rede_os`, no branch de consulta ao pátio legado (quando não há observações na data, como em 28/09):
  ```sql
  WHERE p.store_id = v_pos.store_id
    AND NOT (p.os_number = ANY(v_matched_os_numbers))
    AND COALESCE(p.match_status, '') <> 'MATCHED'
    AND (p.last_payment_date = p_target_date OR p.opened_at::date = p_target_date)
  ```
- O filtro cego `AND COALESCE(p.match_status, '') <> 'MATCHED'` elimina qualquer OS que possua a marca `'MATCHED'`, mesmo que a OS não possua nenhum vínculo com vendas da Rede nem em `conciliation_matches`.
- Além disso, `v_matched_os_numbers` na linha 352 agrega números de OS sem particionar por loja quando `p_store_id` é nulo (`SELECT ARRAY_AGG(pt.matched_os_number)`), gerando bloqueio indevido entre filiais distintas que compartilham o mesmo número sequencial de OS.

### 1.2 O Paradoxo com a Seleção Manual (`get_rede_os_eligible_candidates`)
- A RPC de seleção manual (`get_rede_os_eligible_candidates`) verifica vínculos reais em `pos_transactions` e NÃO filtra por `match_status`.
- Por isso, para a transação de R$ 5.800,00 de Jabaquara, a seleção manual classifica a OS 443 como **`eligible`**, enquanto `match_stage2_rede_os` a descarta na conciliação automática.

### 1.3 Contaminação e Erosão Indevida na Vinculação e Desvinculação
- Na RPC `link_manual_rede_to_os`:
  - Se a OS já era quitada (`paid_value >= total_value - 0.05`), o vínculo é meramente informativo (`vinculo_informativo_sem_baixa`), sem abater saldo.
  - Se a OS estava em aberto, aplica baixa (podendo ser baixa parcial: `v_actually_applied = LEAST(total_value - paid_before, link_amount)`).
  - Porém, não havia registro explícito estruturado do efeito financeiro nem do valor efetivamente alterado no pátio.
- Na RPC `unlink_manual_os_match`:
  - O código tentava deduzir cegamente o valor da transação da OS, corrompendo o pagamento do cliente em vínculos informativos.
  - Reatribuía `match_status = CASE WHEN v_new_paid <= 0 THEN 'UNMATCHED' ELSE 'MATCHED' END`, marcando a OS como `'MATCHED'` imediatamente após desvincular caso ela continuasse paga.

---

## 2. Escopo Delimitado da Entrega (Estritamente Rede × OS)

Esta entrega é restrita cirurgicamente ao fluxo **Rede × OS**:
- **Reutilização Estrita:** Não são criadas novas tabelas, colunas, tabelas paralelas ou RPCs duplicadas.
- **Armazenamento Compatível:** Reutilizam-se as colunas existentes `status` e `divergence_amount` da tabela `conciliation_matches` para registrar o efeito contábil (`'baixa_aplicada'` vs `'vinculo_informativo'`) e o valor efetivamente alterado (`v_actually_applied`).
- **FORA DO ESCOPO:** Zero alterações em PIX, OFX ou conciliação bancária. Zero scripts globais de saneamento de banco (`UPDATE patio_os SET ...`).
- **SEM PRODUÇÃO:** Implementação isolada e testes em banco de dados descartável. Sem aplicação em produção, sem commit e sem push nesta fase.

---

## 3. Pesquisa de Código e Decisão de Reutilização

| O que procuramos | O que encontramos | Por que uma edição cirúrgica resolve (sem criação paralela) |
|---|---|---|
| Motor de auto-match Rede | `public.match_stage2_rede_os` (em `20261001000002`) | O motor já possui todo o pipeline de unicidade 1:1, cálculo de taxas e métricas. Bastam edições pontuais no filtro de pátio (linhas 448-456) e no escopo de `v_matched_os_numbers` (linha 352). |
| Consulta manual de elegíveis | `public.get_rede_os_eligible_candidates` (em `20261001000002`) | Já é invocada pelo hook `useManualMatch`. Bastam ajustes no branch legado para alinhar com a mesma cláusula de `match_stage2_rede_os`. |
| Vinculação manual de Rede | `public.link_manual_rede_to_os` (em `20261001000002`) | Já calcula `v_accounting_effect`. Basta gravar em `conciliation_matches` o `status` (`'baixa_aplicada'` ou `'vinculo_informativo'`) e `divergence_amount` (`v_actually_applied`). |
| Desvinculação manual | `public.unlink_manual_os_match` (em `20261001000002`) | Já manipula locks e `pos_transactions`. Basta consultar `conciliation_matches` antes da remoção: se não houver evidência de `'baixa_aplicada'`, não deduzir nada do pátio; liberar apenas consumo da modalidade correta; atualizar `match_status = 'pending'`. |
| Estrutura de conciliação | Tabela `public.conciliation_matches` | Já possui `status TEXT` e `divergence_amount NUMERIC`. Zero DDL de tabela necessário. |

---

## 4. Solução Proposta Detalhada

### 4.1 Vínculo Ativo Fidedigno e Anti-Bloqueio Cruzado
- Uma OS `p.os_number` é considerada vinculada se e somente se:
  1. Existe transação POS **na mesma loja e data** com `pt.matched_os_number = p.os_number` e `pt.id <> v_pos.id`.
  2. Existe registro em `conciliation_matches` **na mesma loja e data**, e **apenas se a transação referenciada (`rede_transaction_id`) existir em `pos_transactions` e corresponder à mesma loja e OS**. Registros em `conciliation_matches` com referências órfãs são desconsiderados e não bloqueiam a OS.
  3. A amarração é sempre indexada por `(store_id, os_number)`. A OS `443` da loja A jamais bloqueia a OS `443` da loja B.

### 4.2 Evidência Persistida em `link_manual_rede_to_os`
- Ao vincular:
  - `v_actually_applied := v_paid_after - v_paid_before;`
  - Se `v_accounting_effect = 'baixa_aplicada'`:
    `INSERT/UPDATE conciliation_matches ... status = 'baixa_aplicada', divergence_amount = v_actually_applied;`
  - Se `v_accounting_effect = 'vinculo_informativo_sem_baixa'`:
    `INSERT/UPDATE conciliation_matches ... status = 'vinculo_informativo', divergence_amount = 0;`

### 4.3 Desvinculação Segura e Idempotente (`unlink_manual_os_match`)
1. **Evidência Obrigatória:** Lê `conciliation_matches` da transação. Se `status <> 'baixa_aplicada'` (ou registro ausente), `v_amount_to_revert := 0`. **Zero dedução do pátio na ausência de prova de baixa aplicada**.
2. **Reversão Exata em Baixa Parcial:** Se `status = 'baixa_aplicada'`, reverte estritamente `v_amount_to_revert := COALESCE(cm.divergence_amount, 0)`.
3. **Liberação Estrita por Modalidade:** Se a venda for Crédito, subtrai apenas `consumed_credit`; se Débito, subtrai apenas `consumed_debit` em `os_import_observations`.
4. **Idempotência Total:** Chamadas repetidas encontram a transação já desvinculada e operam como no-op seguro.
5. **Transição de Status da OS:** Se não restarem outros vínculos ativos da OS com outras maquininhas da loja, define `patio_os.match_status = 'pending'`.

---

## 5. Dependência e Rollback Exato

### 5.1 Dependência da Spec 465
- A Spec 466 depende de `supabase/migrations/20261001000004_fix_os_import_reset_consistency.sql`.
- As funções alteradas em 466 (`match_stage2_rede_os`, `get_rede_os_eligible_candidates`, `link_manual_rede_to_os`, `unlink_manual_os_match`) **não foram modificadas pela migration 465**; sua última versão canônica reside em `20261001000002_unify_rede_os_matcher_and_diagnostics.sql`.

### 5.2 Rollback Exato
- Criado o arquivo [`specs/466-paridade-elegibilidade-rede-os-e-desvinculo/rollback_20261001000005.sql`](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/specs/466-paridade-elegibilidade-rede-os-e-desvinculo/rollback_20261001000005.sql), contendo o código SQL exato dessas 4 funções extraído de `20261001000002`.
- A reversão reaplica `rollback_20261001000005.sql`, restaurando o estado anterior sem afetar em nada as entregas da Spec 465 (`record_os_import_batch` e `purge_daily_financial_data`).

---

## 6. Riscos e Mitigações

| Risco | Severidade | Mitigação |
|---|---|---|
| Falso-positivo no matcher entre lojas | Crítica | Indexação e checagem estrita por tupla `(store_id, os_number)`. |
| Corrupção de saldo pago de cliente na desvinculação | Crítica | Regra de guarda: sem evidência de `baixa_aplicada`, `v_amount_to_revert = 0`. |
| Registros órfãos em `conciliation_matches` travando OS | Alta | `conciliation_matches` só é ativo se a transação POS referenciada existir e for da mesma loja e OS. |
| Quebra de regressão da Spec 465 | Crítica | Execução do ciclo completo da Spec 465 nos testes de integração. |

