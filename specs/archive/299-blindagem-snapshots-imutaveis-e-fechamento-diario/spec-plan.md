# Spec Plan: Blindagem Definitiva de Snapshots Imutáveis e Consolidação Canônica de 26/08 (299)

## Tasks

### Fase 1 — Consolidação Canônica e Blindagem do Dia 26/08 no Banco de Dados
- [x] [BACKEND] Executar migration consolidando e travando o snapshot de 26/08 com `is_closed = true`, Caixa Atual R$ 151.642,60, Caixa Anterior R$ 141.440,93 e metadados completos.
- [x] [BACKEND] Garantir que a RPC `get_daily_reconciliation_summary` retorne os dados congelados com prioridade absoluta quando `is_closed = true` (usando `IF FOUND`).

### Fase 2 — Frontend: Atualização de useDailySnapshot e ResumoDiaPanel
- [x] [FRONTEND] Atualizar interface `DailySnapshotRow` em `src/hooks/useDailySnapshot.ts` para incluir `is_closed` e `closed_at`.
- [x] [FRONTEND] Atualizar `handleSave` em `src/components/conciliacao/ResumoDiaPanel.tsx` para sempre persistir `is_closed: true` e o dicionário completo de metadados ao salvar o fechamento, com botões claros de Salvar e Editar.

### Fase 3 — Validação e Quality Gate
- [x] [TEST] Executar teste automatizado verificando o snapshot de 26/08 (`is_closed = true`, Caixa Atual R$ 151.642,60, Fluxo R$ 10.201,67) e a ancoragem correta de 27/08 (`caixa_anterior = R$ 151.642,60`) — 11/11 testes aprovados.
- [x] [TEST] Executar `npm run build` (Build 100% verde).
