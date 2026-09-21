# Spec Plan — Spec 424: Restauração Forense de 18/09, Expurgo de 19 a 21 e Filtro de Datas Efetivas

## [DB / SANEAMENTO FORENSE]
- [x] Task 1: Criar script de backup transitório `.tmp/backup_pre_spec424.json` capturando o estado remanescente de 18 a 21/09 antes de qualquer mutação.
  - *Skill:* `database`
  - *Verificação:* Arquivo de backup criado e validado com JSON válido.

- [x] Task 2: Executar script de restauração forense do snapshot e pátio por loja de `2026-09-18` aos valores autênticos comprovados de 2 dias atrás (`total_patio = 64.685,02`, `caixa_atual = 201.948,92`, `faturamento = 31.200,97`, `is_closed = true`).
  - *Skill:* `database`
  - *Verificação:* Query no Supabase confirma `daily_snapshots` e `reconciliations` de 18/09 com os valores exatos.

- [x] Task 3: Executar expurgo completo de todos os dados residuais nas competências `2026-09-19`, `2026-09-20` e `2026-09-21` (`daily_snapshots`, `reconciliations`, `ofx_transactions`, `pos_transactions`, `daily_manual_bills`, `import_batches`, `conciliation_matches`, `daily_reconciliation_matches`).
  - *Skill:* `database`
  - *Verificação:* Queries confirmam contagem 0 para todas as tabelas no intervalo 19 a 21/09, mantendo os 77/78 OFX de 18/09 intactos.

---

## [BACKEND / ENGINE]
- [x] Task 4: Atualizar `useAvailableConciliacaoDates` em `src/hooks/useDailySnapshot.ts` expurgando `patio_os.opened_at` e filtrando estritamente datas onde houve conciliação efetiva (`daily_snapshots.is_closed = true`, `import_batches`, `reconciliations`).
  - *Skill:* `backend-patterns`
  - *Verificação:* Apenas datas com fechamento real constam na lista (19 e 20 de setembro não aparecem).

- [x] Task 5: Atualizar `usePreviousDaySnapshot` em `src/hooks/useDailySnapshot.ts` e a query de `prevSnap` em `src/components/importacoes/CentralImportWizard.tsx` adicionando `.eq('is_closed', true)`.
  - *Skill:* `backend-patterns`
  - *Verificação:* Ao buscar o snapshot anterior de 21/09, o retorno é garantidamente o snapshot de 18/09 com caixa de R$ 201.948,92.

---

## [QUALITY GATE / TESTES]
- [x] Task 6: Executar o Terminal Gate completo (`cmd.exe /c "npm run build"`).
  - *Skill:* `deploy-production`
  - *Verificação:* Exit code 0 (TypeScript limpo e bundling Nitro concluído).

- [x] Task 7: Executar script de verificação pós-saneamento validando a restauração de 18/09, a limpeza absoluta de 19 a 21/09 e a consulta de datas efetivas.
  - *Skill:* `database`
  - *Verificação:* Script reporta 100% de sucesso em todos os critérios de aceitação.
