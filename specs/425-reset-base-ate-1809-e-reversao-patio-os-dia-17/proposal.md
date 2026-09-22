# Proposal — Spec 425: Reset da Base Contábil a partir de 18/09 e Reversão Estrita de patio_os para o Estado de 17/09

## Problema
1. **Divergências Acumuladas nas Tentativas de Fechamento de 18/09 e 21/09:**
   Ao tentar conciliar os dias 18/09 e 21/09, o recálculo e pareamentos automáticos acumularam divergências contábeis (ex: diferença de R$ 18.069,08 decorrente do descompasso de fluxo e despesas entre competências).
2. **Mutação Espúria na Tabela `patio_os`:**
   Durante as importações e testes de matching dos dias 18/09 e 21/09:
   - Foram inseridas **35 novas OSs** com `opened_at >= '2026-09-18'`.
   - Foram alteradas **34 OSs existentes**, que tiveram seu `status` forçado para `finalizado` e `paid_value` modificado indevidamente, reduzindo o saldo real do pátio para R$ 56.603,96.
3. **Necessidade do Usuário de Reiniciar do Marco Estável de 17/09:**
   O usuário solicitou explicitamente:
   - Zerar / expurgar completamente a conciliação a partir do dia 18/09 (deixar 18/09, 19/09, 20/09 e 21/09 sem dados/zerados).
   - Reverter a tabela `patio_os` para ficar **exatamente como estava no fechamento consolidado de 17/09**.

---

## Solução Proposta

### 1. Reversão Forense Cirúrgica de `patio_os` para 17/09
- **Expurgo de OSs Novas:** Excluir as 35 ordens de serviço inseridas com data de abertura em ou após 18/09 (`opened_at >= '2026-09-18'`).
- **Rollback das Mutações via `history_log`:** Para as 34 ordens de serviço modificadas a partir de 18/09, aplicar a reversão em ordem cronológica inversa utilizando os campos `from` registrados no `history_log` do próprio Supabase (revertendo `status`, `raw_status`, `paid_value`, `total_value`, `credit_value`, `debit_value`, `pix_transfer_value`, etc.).
- **Desvinculação de Matches:** Limpar qualquer `matched_ofx_id` residual nas OSs remanescentes.

### 2. Expurgo Completo das Movimentações de 18/09 em Diante (18 a 21/09)
Deletar todos os registros de conciliação das datas 18/09, 19/09, 20/09 e 21/09:
- `daily_snapshots`: deletar registros com `date >= '2026-09-18'`.
- `reconciliations`: deletar registros com `date >= '2026-09-18'`.
- `ofx_transactions`: deletar registros com `target_date >= '2026-09-18'`.
- `pos_transactions`: deletar registros com `target_date >= '2026-09-18'`.
- `daily_manual_bills`: deletar registros com `date >= '2026-09-18'` ou `target_date >= '2026-09-18'`.
- `daily_reconciliation_matches` e `conciliation_matches`: deletar registros com `target_date >= '2026-09-18'`.
- `import_batches`: deletar lotes com `target_date >= '2026-09-18'`.

### 3. Consolidação do Marco Zero em 17/09
O dia **17/09/2026** permanece como o último fechamento fechado e íntegro do sistema:
- `caixa_atual`: R$ 260.114,65
- `total_patio`: R$ 72.405,57 (reconciliações: R$ 75.404,57)
- `odometro_hoje`: 543.627,55
- `is_closed`: true
- `status_geral`: approved (diferença final: -R$ 12,42)
Ao importar o dia 18/09 (ou 21/09), o assistente puxará deterministicamente este fechamento como baseline confiável.

---

## Skills Especializadas Aplicadas
- `database`: Reversão de estado via replay inverso de audit log (`history_log`), deletes em cascata e consistência referencial.
- `backend-patterns`: Saneamento de baseline e idempotência de transações.
- `obsidian`: Preservação dos princípios de integridade histórica e conciliação atômica.

---

## Contratos de Dados Afetados
- `public.patio_os`: Exclusão de 35 OSs pós-17/09; reversão dos campos de status e valores em 34 OSs pré-existentes.
- `public.daily_snapshots`, `public.reconciliations`, `public.ofx_transactions`, `public.pos_transactions`, `public.daily_manual_bills`: Expurgo de registros com data contábil `>= '2026-09-18'`.

---

## Arquivos Afetados
### Scripts Transitórios de Reparo (.tmp/ e scratch/)
- `scratch/revert_patio_os_to_1709_and_purge_18_to_21.cjs`: Script autônomo e atômico com backup prévio que executa o rollback de `patio_os` e o expurgo das tabelas de conciliação.

---

## Plano de Rollback
- Backup prévio completo da tabela `patio_os` e das tabelas de conciliação gravado em `.tmp/backup_pre_spec425_patio_and_recons.json` antes de qualquer mutação.
- Em caso de falha, o script restaura o JSON diretamente.

---

## Risco Principal e Mitigação
- **Risco:** Reversão indevida de OSs abertas antes de 17/09 que legitimamente pertenciam a 17/09.
- **Mitigação:** O replay inverso de `history_log` analisa estritamente os eventos cujo timestamp `date >= '2026-09-18T00:00:00'`, desfazendo unicamente as alterações provocadas pelas importações e matches dos dias 18 e 21.
