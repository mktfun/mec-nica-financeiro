# Design: Padronização e Refatoração de UI/UX (305)

## Arquitetura
- src/components/ui/: Primitivas agnósticas (Button, Badge, Input, Field, TableContainer, TableHeader, TableRow, TableCell, AppDialog, AppDrawer)
- src/components/layout/: Cascas de layout (AppShell, PageContainer, PageHeader, Toolbar)
- src/components/finance/: Domínio contábil (CurrencyDisplay, AmountCell, DiscrepancyBadge, KpiCard, KpiGrid)
