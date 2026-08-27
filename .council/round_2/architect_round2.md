# POSIÇÃO ARQUITETURAL — ROUND 2 (ARCHITECT)
Confiança: 0.98 (Refinement & Harmonization)
1. Citação e alinhamento com Contrarian e Engineer: Acolhimento do veto ao DataTable monolítico. Adoção de Compound Primitives em src/components/ui/table/ (<TableContainer>, <TableHeader sticky>, <TableRow>, <TableCell tabularNums fontMono align>).
2. Eliminação de Framer Motion em botões e células atômicas: migração para transições CSS nativas do Tailwind v4 (hover/active/focus). Framer Motion restrito a cascas de alto nível (AppDialog, AppDrawer, Toasts).
3. Viewport delimitado: AppShell neutro delegando para PageContainer com variantes (dense: max-w-[1600px] 2xl:max-w-[1800px], contained: max-w-5xl, fluid: w-full px-6).
4. Tipografia tabular obrigatória: CurrencyDisplay / AmountCell com font-mono tabular-nums text-right e semáforo semântico estrito.
5. Taxonomia em 3 camadas: src/components/ui/ (agnóstico), src/components/layout/ (cascas), src/components/finance/ (domínio contábil).