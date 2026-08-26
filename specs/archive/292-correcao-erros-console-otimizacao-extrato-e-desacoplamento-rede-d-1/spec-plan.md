# Spec Plan: Desacoplamento Temporal da Rede, Correção de Erros de Console e Motor de Conciliação (292)

## Tasks

### Fase 1 — Eliminação de Erros 400 & Otimização de Performance
- [x] [FRONTEND] Blindar `useAiSettings.ts` contra buscas não-UUID (`user_id = 'GLOBAL'`)
- [x] [FRONTEND] Corrigir query PostgREST em `useHistoricalReconciledTransactions` (`useTransactions.ts`) com cache de 5min e zero retries espúrios
- [x] [BACKEND] Criar migration SQL para atualizar `get_daily_reconciliation_summary` garantindo assinatura única `p_date text` e expurgando hardcodes `s.id NOT IN ('st-01', 'st-05')`

### Fase 2 — Refatoração do Motor de Conciliação e UI do Extrato
- [x] [BACKEND] Atualizar cálculo de `cartoes_a_compensar` para usar integralmente as vendas do dia (`rede_liquido`), sem subtração errônea de depósitos de D-1
- [x] [FRONTEND] Atualizar `StoreExtratoBancarioView.tsx`:
  - Remover botão "Justificar" de todas as saídas (`type === 'out'`)
  - Exibir badge compacto `🔵 Lote Rede (Ref: D-1)` para créditos de adquirente, bloqueando vínculo a OSs individuais e permitindo justificativas apenas para ajustes de tarifas/aluguel
  - Compactar badges para `h-5 px-2 text-[10px]`

### Fase 3 — Validação e Quality Gate
- [x] [TEST] Executar test suite automatizado com os dados reais de Dom Pedro e Jabaquara do dia 26/08 (9/9 testes aprovados)
- [x] [TEST] Verificar console sem erros 400 e carregamento instantâneo
- [x] [TEST] Executar `npm run build` para confirmar 0 erros TypeScript (Build 100% verde)
