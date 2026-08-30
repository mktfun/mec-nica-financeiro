# Spec Plan: Padronização e Refatoração de UI/UX (305)

## Tasks
- [x] [FRONTEND] Criar src/components/layout/PageContainer.tsx com variantes finance (1600px/1800px), dense e contained
- [x] [FRONTEND] Atualizar src/components/layout/AppShell.tsx removendo trava max-w-[1200px]
- [x] [FRONTEND] Refatorar src/components/ui/Button.tsx (remover Framer Motion pesado; usar CSS puro)
- [x] [FRONTEND] Refatorar src/components/ui/Badge.tsx com semáforo semântico estrito
- [x] [FRONTEND] Criar primitivas de tabela em src/components/ui/table/ (TableContainer, TableHeader, TableRow, TableCell)
- [x] [FRONTEND] Criar src/components/finance/AmountCell.tsx e CurrencyDisplay.tsx com font-mono tabular-nums text-right
- [x] [FRONTEND] Criar src/components/finance/KpiCard.tsx com suporte compositivo e adapter de retrocompatibilidade
- [x] [FRONTEND] Configurar re-export proxy em src/components/dashboard/KpiCard.tsx
- [x] [FRONTEND] Atualizar BankReconciliationDashboard.tsx e StoreTableDashboard.tsx
- [x] [TEST] Executar verificação de build de produção (Vite + SSR)

