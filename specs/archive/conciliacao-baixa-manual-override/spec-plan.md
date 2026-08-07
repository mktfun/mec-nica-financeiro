# Spec Plan: Baixa Manual Universal & Forçar Status 'ENTROU' para OSs e Pendências (conciliacao-baixa-manual-override)

## Tasks

- [x] [FRONTEND] Criar hook de mutation `useUpdateOsStatus` e `useResolveUnmatchedAlert` em `src/hooks/useConciliacao.ts`:
  - [x] Permite alterar o status da OS para `'ENTROU'` ou reverter para `'finalizado'`.
  - [x] Registra/remove o vínculo em `conciliation_matches` (`match_type = 'MANUAL_OVERRIDE'`).
  - [x] Revalida os caches de `reconciliation_views`, `modulo1_stores_data` e `conciliacao_resumo`.
- [x] [FRONTEND] Atualizar `src/components/conciliacao/OsDetailModal.tsx`:
  - [x] Adicionar botão principal **"Marcar como ENTROU (Baixa Manual)"** com estado de loading.
  - [x] Adicionar opção de **"Reverter para Pendente"** quando a OS já estiver com status `'ENTROU'`.
- [x] [FRONTEND] Atualizar `src/components/conciliacao/OsVsRedeTable.tsx`:
  - [x] Adicionar atalho visual / botão por linha ("Baixar OS") para dar baixa manual rápida na OS sem precisar abrir o modal.
- [x] [FRONTEND] Atualizar `src/components/conciliacao/ConciliacaoAlertsSection.tsx`:
  - [x] Adicionar opção de **"Resolver Pendência"** para dar baixa manual rápida diretamente nos cards dos alertas de exceção.
- [x] [TEST] Verificar compilação limpa com `npm run build` — ✅ 0 erros (25.82s Client + 5.36s SSR).
