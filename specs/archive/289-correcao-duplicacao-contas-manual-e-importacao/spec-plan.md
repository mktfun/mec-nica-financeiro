# Spec Plan: Correção de Duplicação de Contas (Manual / Importação) e Blindagem de Edição (289)

## Tasks

### Fase 1 — Migration PostgreSQL (RPC Canônica)
- [x] [BACKEND] Criar migration `supabase/migrations/20260826000001_fix_contas_manual_deduplication.sql`
- [x] [BACKEND] Atualizar a RPC `get_daily_reconciliation_summary` para separar `v_contas_imported_bills` (`external_code IS NOT NULL`) de `v_contas_extras` (`external_code IS NULL`)
- [x] [BACKEND] Aplicar migration no Supabase via script Node.js / RPC runner

### Fase 2 — Verificação do Dia 26/08/2026
- [x] [BACKEND] Ajustar snapshot do dia 26/08 (`contas_a_pagar = 16974.94`) para restabelecer a base exata da planilha
- [x] [TEST] Executar RPC para 26/08 e validar: `contas_manual = 16974.94`, `subtotal_contas = 18839.83`

### Fase 3 — Verificação e Blindagem Frontend
- [x] [FRONTEND] Validar `ResumoDiaPanel.tsx` para garantir que os campos `contasInput` e `saveSnapshot` operam com a base e extras isolados
- [x] [FRONTEND] Validar `ContasManualModal.tsx` para garantir que exclusões e inclusões invalidam as queries corretas
- [x] [FRONTEND] Validar `CentralImportWizard.tsx` para garantir que importações futuras continuam gravando `external_code`

### Fase 4 — Validação de Regressão e Build
- [x] [TEST] Testar cenário de adição de despesa avulsa (+ Extras)
- [x] [TEST] Testar cenário de edição manual da base ("Editar Fechamento")
- [x] [TEST] Testar imutabilidade de dias fechados (17, 18, 19, 21, 24/08)
- [x] [TEST] Executar `npm run build` para garantir ausência de erros TypeScript
