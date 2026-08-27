# POSIÇÃO ARQUITETURAL — ROUND 1 (ARCHITECT)
Confiança: 0.95
1. Rejeição da implementação literal do Doc 1: ignora o Dark Mode Zinc-950, classes bg-gray-50 genéricas e cria componentes anêmicos sem densidade financeira.
2. Adoção dos princípios de densidade e semântica do Doc 2.
3. Taxonomia de Design System desacoplada:
   - src/components/ui/: Primitivas agnósticas (Button, Badge, Input, Field, DataTable compositivo, AppDialog, AppDrawer, DropdownMenu, Tooltip).
   - src/components/layout/: Cascas estruturais (AppShell, PageContainer com variantes fluid | dense | contained, PageHeader, Toolbar).
   - src/components/finance/: Domínio contábil especializado (KpiCard com AnimatedNumber/breakdowns/tones, KpiGrid, DiscrepancyBadge, CurrencyDisplay tabular-nums).
4. Resolução do gargalo de AppShell: remover max-w-[1200px] fixo do main e usar PageContainer para controlar densidade por rota.
5. Strangler Pattern em 4 fases com retrocompatibilidade (normalização title/label no KpiCard).