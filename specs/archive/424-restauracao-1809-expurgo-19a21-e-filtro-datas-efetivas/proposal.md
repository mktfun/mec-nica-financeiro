# Proposal — Spec 424: Restauração Forense de 18/09, Expurgo Limpo de 19 a 21 e Blindagem de Datas Efetivas

## Problema
1. **Distorção do Snapshot de 18/09:**
   Durante ações de limpeza e manipulação manual no banco, o snapshot consolidado de `2026-09-18` foi sobrescrito, corrompendo o valor de veículos em pátio (`total_patio`) e o caixa atual (`caixa_atual`), que originalmente eram de **R$ 64.685,02** e **R$ 201.948,92**.
2. **Poluição do Calendário por Datas Sem Conciliação (19/09 e 20/09):**
   O hook `useAvailableConciliacaoDates` consultava `patio_os.opened_at`. Qualquer ordem de serviço criada em oficina no fim de semana incluía automaticamente 19/09 (sábado) e 20/09 (domingo) na listagem de conciliações, apesar do usuário nunca ter efetuado conciliações nessas datas.
3. **Contaminação do Caixa Anterior (`usePreviousDaySnapshot` e Wizard):**
   A query de snapshot anterior não exigia `is_closed = true`. Existindo qualquer registro transitório ou em aberto nos dias 19 ou 20, o fechamento de 21/09 assumia esses dados inválidos como baseline em vez de puxar o último fechamento fechado legítimo de 18/09.
4. **Necessidade de Ambiente Limpo para 21/09:**
   O usuário necessita que o intervalo de 19/09 a 21/09 fique completamente vazio no banco para realizar a importação centralizada de 21/09 do zero, com o caixa anterior correto de 18/09.

---

## Solução Proposta

### 1. Restauração Forense do Fechamento de 18/09
Restaurar os valores exatos comprovados do fechamento de 18/09 em `daily_snapshots`:
- `caixa_atual`: `201948.92` (R$ 201.948,92)
- `total_patio`: `64685.02` (R$ 64.685,02)
- `faturamento`: `31200.97` (R$ 31.200,97)
- `dinheiro_mp`: `28316.00`
- `a_receber_manual`: `8529.67`
- `total_recebiveis`: `36845.67`
- `saldo_bancario`: `100418.23`
- `saldo_negativo_itau`: `27048.57`
- `saldo_bancos_positivo`: `127466.80`
- `contas_a_pagar`: `54945.40`
- `is_closed`: `true`
- Lojas em `reconciliations` de 18/09 com os 10 valores de `na_loja_os` restaurados (total R$ 64.685,02) e status validado.

### 2. Expurgo Limpo do Intervalo 19/09 a 21/09
Remover integralmente todo e qualquer registro residual ou corrompido para que o usuário refaça 21/09 do zero:
- `daily_snapshots`: deletar registros onde `date >= '2026-09-19' AND date <= '2026-09-21'`.
- `reconciliations`: deletar registros onde `date >= '2026-09-19' AND date <= '2026-09-21'`.
- `ofx_transactions`: deletar registros com `target_date >= '2026-09-19' AND target_date <= '2026-09-21'`. Os 77/78 OFX legítimos de 18/09 permanecem intactos.
- `pos_transactions`, `daily_manual_bills`, `conciliation_matches`, `daily_reconciliation_matches`: expurgo restrito às datas `2026-09-19`, `2026-09-20` e `2026-09-21`.
- `import_batches`: deletar batches com `target_date >= '2026-09-19'`.

### 3. Blindagem de Código: Regra de Datas Efetivas e Caixa Anterior
- **`src/hooks/useDailySnapshot.ts` (`useAvailableConciliacaoDates`):**
  - Remover a query em `patio_os.opened_at`.
  - Consultar exclusivamente `daily_snapshots` onde `is_closed = true` (ou `caixa_atual > 0`), `import_batches` com `target_date`, e `reconciliations` com movimento real.
  - Elimina o aparecimento de dias não trabalhados (19/09 e 20/09) na interface.
- **`src/hooks/useDailySnapshot.ts` (`usePreviousDaySnapshot`):**
  - Adicionar `.eq('is_closed', true)` na busca do snapshot imediatamente anterior.
- **`src/components/importacoes/CentralImportWizard.tsx` (linhas 2067-2073):**
  - Garantir que a busca de `prevSnap` filtre `.eq('is_closed', true)`, assegurando que ao importar 21/09, o caixa anterior puxado seja sempre o de 18/09 (`R$ 201.948,92`).

---

## Skills Especializadas Aplicadas
- `database`: Saneamento de integridade relacional, backups transitórios e atomismo de dados.
- `backend-patterns`: Restrição estrita de baseline contábil D-1 e desacoplamento de eventos operacionais de pátio da conciliação financeira.
- `obsidian`: Manutenção dos contratos canônicos de snapshots e conciliação (`ofx.md` e `domain.md`).

---

## Contratos de Dados Afetados
- `public.daily_snapshots`: Restauração da linha de 18/09; exclusão de registros entre 19/09 e 21/09.
- `public.reconciliations`: Restauração dos estoques de pátio por filial em 18/09; exclusão de 19/09 a 21/09.
- `public.ofx_transactions`: Preservação dos 77/78 de 18/09; exclusão dos registros de 19 a 21/09.

---

## Arquivos Afetados
### Arquivos Existentes Modificados
- `src/hooks/useDailySnapshot.ts`: Ajuste em `useAvailableConciliacaoDates` e `usePreviousDaySnapshot`.
- `src/components/importacoes/CentralImportWizard.tsx`: Ajuste na query de `prevSnap` para exigir `is_closed = true`.

### Scripts Transitórios de Reparo (.tmp/ e scratch/)
- `scratch/restore_1809_and_purge_19_to_21.cjs`: Script determinístico de restauração de 18/09 e expurgo seguro de 19 a 21.

---

## Plano de Rollback
- Backup prévio de todas as linhas afetadas antes da execução gravado em `.tmp/backup_pre_spec424.json`.
- Em caso de anomalia, o backup pode ser re-injetado atomicamente via script.

---

## Risco Principal e Mitigação
- **Risco:** O expurgo afetar transações ou snapshots anteriores a 19/09.
- **Mitigação:** Todas as instruções SQL/Supabase possuem predicado estrito de limite inferior (`date >= '2026-09-19'`), garantindo imunidade absoluta aos dados de 18/09 e dias anteriores.
