# Spec 425 — Design: Reset da Base Contábil a partir de 18/09 e Reversão Estrita de patio_os para o Estado de 17/09

## 1. Arquitetura do Fluxo de Reversão e Saneamento

```
[Estado Atual Corrompido]
• 265 OSs em patio_os (35 novas de 18-21/09 + 34 finalizadas indevidamente)
• Movimentações, OFX, POS, Contas e Snapshots espúrios de 18/09 a 21/09
                              │
                              ▼
           [Passo 1: Backup de Contingência Pré-Reset]
           • Dump completo de patio_os e tabelas financeiras em .tmp/
                              │
                              ▼
           [Passo 2: Reversão Atômica de patio_os para 17/09]
           • DELETE: 35 OSs com opened_at >= '2026-09-18'
           • REPLAY INVERSO: 34 OSs mutadas pós-17 revertidas via history_log.from
           • DESVINCULAÇÃO: matched_ofx_id = null
           • Saldo do pátio restaurado para R$ 72.405,57 (230 OSs)
                              │
                              ▼
           [Passo 3: Expurgo em Cascata de 18/09 a 21/09]
           • DELETE matches: daily_reconciliation_matches & conciliation_matches (>= 18/09)
           • DELETE contas: daily_manual_bills (date >= 18/09)
           • DELETE cartões: pos_transactions (target_date >= 18/09)
           • DELETE extrato: ofx_transactions (target_date >= 18/09)
           • DELETE lotes: import_batches (target_date >= 18/09)
           • DELETE reconciliações: reconciliations (date >= 18/09)
           • DELETE snapshots: daily_snapshots (date >= 18/09)
                              │
                              ▼
           [Passo 4: Verificação do Marco Zero Concluído]
           • Último snapshot ativo: 17/09/2026 (R$ 260.114,65 | is_closed: true)
           • Pátio OS consolidado: R$ 72.405,57 (230 OSs)
           • Datas 18/09, 19/09, 20/09 e 21/09: 100% limpas/vazias
```

---

## 2. Estrutura de Dados e Contratos do Supabase

### Contratos de Audit Log (`patio_os.history_log`)
O rollback baseia-se na estrutura do log de auditoria JSONB do Supabase:

```typescript
export interface HistoryLogFieldChange {
  field: string;
  from: any;
  to: any;
}

export interface HistoryLogEntry {
  date: string; // ISO 8601 (ex: '2026-09-21T09:43:00.000Z')
  user?: string;
  source?: string;
  changes: HistoryLogFieldChange[];
}

export interface PatioOSReversionTarget {
  id: string;
  os_number: string;
  opened_at: string;
  status: string;
  raw_status: string;
  paid_value: number;
  total_value: number;
  credit_value: number;
  debit_value: number;
  pix_transfer_value: number;
  money_value: number;
  history_log: HistoryLogEntry[];
}
```

### Algoritmo Determinístico de Replay Inverso
Para cada registro de `patio_os` afetado:
1. Filtrar eventos em `history_log` onde `entry.date >= '2026-09-18T00:00:00.000Z'`.
2. Ordenar eventos decrescentemente por data (`b.date - a.date`).
3. Percorrer as mudanças de trás para frente, atribuindo ao registro o valor original `change.from`.
4. Atualizar os campos `status`, `raw_status`, `paid_value`, `total_value`, `credit_value`, `debit_value`, `pix_transfer_value`, `money_value` e setar `matched_ofx_id = null`.
5. Atualizar o Supabase via RPC ou Client com chave de serviço.

---

## 3. Cenários Obrigatórios

### Happy Path
1. O script de execução é disparado.
2. É gerado um arquivo de backup em `.tmp/backup_pre_spec425_patio_and_recons.json` com os 265 registros de `patio_os` e todos os dados das tabelas de 18 a 21/09.
3. As 35 OSs abertas em ou após 18/09 são excluídas permanentemente.
4. As 34 OSs modificadas após 17/09 são restauradas com seus valores de `from` (status volta de `finalizado` para seu status anterior em 17/09, ex: `em_andamento`; `paid_value` volta ao valor original).
5. O somatório de OSs abertas em pátio volta a R$ 72.405,57 com exatamente 230 ordens de serviço.
6. Todos os registros das 7 tabelas com data contábil de 18/09 a 21/09 são expurgados com zero orfãos.
7. O dia 17/09 permanece inalterado com caixa de R$ 260.114,65 e status fechado.
8. Ao abrir a interface de Conciliação Diária, o sistema aponta 17/09 como a última data consolidada e as datas posteriores como prontas para importação limpa.

### Edge Case
1. **OS mutada com múltiplos eventos pós-17/09:**
   - O algoritmo aplica as alterações em ordem reversa (LIFO). Se o campo `status` mudou de `em_andamento` para `aguardando_peca` e depois para `finalizado`, o replay reverte primeiro de `finalizado` para `aguardando_peca`, e em seguida para `em_andamento`, garantindo o estado exato de 17/09.
2. **OS aberta antes de 18/09 sem histórico em `history_log`:**
   - Não sofre mutação desnecessária; seus valores permanecem intactos.
3. **Falha de rede ou timeout durante o processo:**
   - O script registra cada ID processado e valida ao final se a contagem e os totais batem rigorosamente com os alvos pré-calculados.

---

## 4. Critérios de Aceitação Verificáveis
1. **Contagem de Pátio:** Exatamente 230 registros na tabela `patio_os` (265 - 35 = 230).
2. **Zero OSs Novas:** Consulta `SELECT count(*) FROM patio_os WHERE opened_at >= '2026-09-18'` retorna `0`.
3. **Reversão de Status:** As 34 OSs que haviam sido finalizadas indevidamente têm seu status restaurado para o valor pré-18/09.
4. **Equalização do Pátio de 17/09:** O somatório de saldo em pátio (`total_value - paid_value`) para OSs abertas até 17/09 totaliza exatamente **R$ 72.405,57**.
5. **Zero Registros de 18 a 21/09 nas Tabelas Financeiras:**
   - `SELECT count(*) FROM daily_snapshots WHERE date >= '2026-09-18'` = 0
   - `SELECT count(*) FROM reconciliations WHERE date >= '2026-09-18'` = 0
   - `SELECT count(*) FROM ofx_transactions WHERE target_date >= '2026-09-18'` = 0
   - `SELECT count(*) FROM pos_transactions WHERE target_date >= '2026-09-18'` = 0
   - `SELECT count(*) FROM daily_manual_bills WHERE date >= '2026-09-18' OR target_date >= '2026-09-18'` = 0
   - `SELECT count(*) FROM daily_reconciliation_matches WHERE target_date >= '2026-09-18'` = 0
   - `SELECT count(*) FROM conciliation_matches WHERE target_date >= '2026-09-18'` = 0
   - `SELECT count(*) FROM import_batches WHERE target_date >= '2026-09-18'` = 0
6. **Integridade de 17/09:** O snapshot de 17/09 possui `caixa_atual = 260114.65`, `odometro_hoje = 543627.55`, `is_closed = true`.
7. **Terminal Gate:** `npm run build` compila com exit code 0.

---

## 5. Cenários de Teste [SCAN -> INFER -> VERIFY -> FIX]
- **Teste 1: Validação de patio_os pós-reversão:**
  - SCAN: Consultar todas as OSs em `patio_os`.
  - INFER: Devem existir 230 linhas; soma de saldo restante de OSs não-finalizadas = R$ 72.405,57.
  - VERIFY: Script de verificação automatizada confere contagem e soma ponderada.
  - FIX: Se divergir, recalcular o delta por OS inspecionando o backup de contingência.
- **Teste 2: Validação de ausência de resíduos contábeis 18-21/09:**
  - SCAN: Consultar contagem das 7 tabelas para datas `>= '2026-09-18'`.
  - INFER: Todas as contagens devem ser estritamente zero.
  - VERIFY: Script confirma retorno zero para cada tabela.
  - FIX: Expurgo complementar de eventuais tabelas de log auxiliares.
