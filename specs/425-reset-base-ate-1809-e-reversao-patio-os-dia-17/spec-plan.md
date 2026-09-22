# Spec 425 — Spec Plan: Reset da Base Contábil a partir de 18/09 e Reversão Estrita de patio_os para o Estado de 17/09

## Tasks

### [DB / BACKUP]
- [x] Completed: Backup preventivo completo de patio_os (265 registros) e de todas as tabelas financeiras com movimentações >= '2026-09-18' em `.tmp/backup_pre_spec425.json`. | Ref: `skills/database` | Verificação: Script confirmando existência de `.tmp/backup_pre_spec425.json` íntegro com contagem e somas validadas.

### [DB / PATIO_OS]
- [x] Completed: Expurgo permanente das 35 OSs inseridas em `patio_os` com `opened_at >= '2026-09-18'`. | Ref: `skills/database` | Verificação: Script confirmando `SELECT count(*) FROM patio_os WHERE opened_at >= '2026-09-18'` igual a 0.

### [DB / PATIO_OS]
- [x] Completed: Replay inverso das mutações de 18 a 21/09 via `history_log.from` para as 34 OSs alteradas, restaurando `status`, `raw_status`, `paid_value`, demais campos e setando `matched_ofx_id = null`. | Ref: `skills/database` | Verificação: Consulta confirmando 230 OSs restantes e somatório de pátio em aberto igual a R$ 72.405,57.

### [DB / PURGE]
- [x] Completed: Expurgo em cascata de todas as transações, contas, extratos, cartões, lotes, matches e snapshots com `date` ou `target_date >= '2026-09-18'`. | Ref: `skills/database` | Verificação: Consulta SQL confirmando 0 registros em todas as 7 tabelas para datas >= 18/09/2026.

### [DB / BASELINE]
- [x] Completed: Validação estrita do snapshot de 17/09 como marco zero ativo mais recente (`caixa_atual: R$ 260.114,65`, `total_patio: R$ 72.405,57`, `is_closed: true`). | Ref: `skills/backend-patterns` | Verificação: Script Node confirmando consistência de 17/09 e ausência de fechamentos posteriores.

### [TERMINAL GATE]
- [x] Completed: Execução de `npm run build` assegurando integridade total do frontend, tipos e compilação limpa. | Ref: `skills/sdd-apply` | Verificação: `npm run build` com exit code 0.
