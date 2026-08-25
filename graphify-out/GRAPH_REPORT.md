# Graph Report - .  (2026-08-25)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1305 nodes · 2875 edges · 130 communities (60 shown, 70 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 28 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4eec2b97`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Card.tsx
- WizardImportacao.tsx
- oficina.ts
- index.tsx
- useTransactions.ts
- cn
- recebiveis.tsx
- routeTree.gen.ts
- ias-hub.ts
- CentralImportWizard.tsx
- supabase.ts
- compilerOptions
- ResumoDiaPanel.tsx
- loja.$lojaId.tsx
- dependencies
- compilerOptions
- useBackendConciliacao.ts
- components.json
- devDependencies
- importacoes.tsx
- AppShell.tsx
- seed.ts
- dependencies
- ConfiguracoesPanel.tsx
- PromptBox.tsx
- ExtratosImportacaoModal.tsx
- BankReconciliationDashboard.tsx
- conciliacao-detalhes.tsx
- src/server.ts
- supabase/types.ts
- FileRoutesByPath
- BreakdownModal.tsx
- Button.tsx
- patio.tsx
- useDiagnosticEngine.ts
- devDependencies
- useStores
- bankingCalendar.ts
- database.types.ts
- bot/package.json
- MdrAuditView.tsx
- useStores.ts
- LogsMotorPanel.tsx
- StoreDonutCharts.tsx
- TaxasDashboardView.tsx
- package.json
- DailyAuditLogsView.tsx
- proposta.tsx
- scripts
- FaturamentoVsContasChart.tsx
- __root.tsx
- ai-chat/index.ts
- resilience.test.ts
- aiReconciliationService.ts
- custos.tsx
- useAutonomousReconciliation.ts
- ai-chat/deno.json
- CategorySelector.tsx
- importar-os.tsx
- imports
- mcp-proxy/index.ts
- imports
- vite.config.ts
- ai
- @ai-sdk/react
- @cloudflare/vite-plugin
- clsx
- cmdk
- date-fns
- embla-carousel-react
- eslint
- eslint-plugin-prettier
- eslint-plugin-react-hooks
- framer-motion
- globals
- input-otp
- lucide-react
- nitro
- pdfjs-dist
- pg
- @radix-ui/react-accordion
- @radix-ui/react-alert-dialog
- @radix-ui/react-avatar
- @radix-ui/react-checkbox
- @radix-ui/react-collapsible
- @radix-ui/react-context-menu
- @radix-ui/react-dialog
- @radix-ui/react-dropdown-menu
- @radix-ui/react-hover-card
- @radix-ui/react-label
- @radix-ui/react-menubar
- @radix-ui/react-navigation-menu
- @radix-ui/react-popover
- @radix-ui/react-progress
- @radix-ui/react-radio-group
- @radix-ui/react-scroll-area
- @radix-ui/react-separator
- @radix-ui/react-slot
- @radix-ui/react-switch
- @radix-ui/react-tabs
- @radix-ui/react-toggle
- @radix-ui/react-toggle-group
- @radix-ui/react-tooltip
- react
- react-dom
- react-hook-form
- react-markdown
- react-resizable-panels
- recharts
- remark-gfm
- sonner
- ssh2
- tailwindcss
- @tanstack/react-query
- @tanstack/react-router
- @tanstack/react-start
- @tanstack/router-plugin
- @tanstack/start-server-core
- tw-animate-css
- vaul
- vite-tsconfig-paths
- zod
- playwright
- prettier
- sync-oficina/index.ts

## God Nodes (most connected - your core abstractions)
1. `supabase` - 62 edges
2. `Button()` - 51 edges
3. `useStores()` - 51 edges
4. `Card()` - 50 edges
5. `Badge()` - 39 edges
6. `LoadingSpinner()` - 38 edges
7. `formatCurrency()` - 31 edges
8. `Modal()` - 26 edges
9. `AnimatedNumber()` - 24 edges
10. `extractNumber()` - 23 edges

## Surprising Connections (you probably didn't know these)
- `ManualOsFallbackForm()` --calls--> `useStores()`  [EXTRACTED]
  src/components/importacoes/ManualOsFallbackForm.tsx → src/hooks/useStores.ts
- `ConfiguracoesPanel()` --calls--> `useBotLogs()`  [EXTRACTED]
  src/components/agente/ConfiguracoesPanel.tsx → src/hooks/useBotLogs.ts
- `ConfiguracoesPanel()` --calls--> `useDeleteStore()`  [EXTRACTED]
  src/components/agente/ConfiguracoesPanel.tsx → src/hooks/useStores.ts
- `ConfiguracoesPanel()` --calls--> `useStores()`  [EXTRACTED]
  src/components/agente/ConfiguracoesPanel.tsx → src/hooks/useStores.ts
- `ModelIcon()` --calls--> `cn()`  [EXTRACTED]
  src/components/chat/PromptInput.tsx → src/lib/utils.ts

## Import Cycles
- None detected.

## Communities (130 total, 70 thin omitted)

### Community 0 - "Card.tsx"
Cohesion: 0.05
Nodes (68): CacheAgentePanel(), LogsAgentePanel(), FaturamentoDetalhesModal(), FaturamentoDetalhesModalProps, LinkOfxToOsModal(), LinkOfxToOsModalProps, ManualMatchOsModal(), ManualMatchOsModalProps (+60 more)

### Community 1 - "WizardImportacao.tsx"
Cohesion: 0.05
Nodes (66): CentralImportWizard(), MarcoZeroWizard(), useStoreMapping(), WizardImportacao(), WizardImportacaoProps, MaquininhaItem, UnifiedImportResult, useCentralImport() (+58 more)

### Community 2 - "oficina.ts"
Cohesion: 0.06
Nodes (56): EmpresaConfig, EmpresaMap, listEmpresas(), loadEmpresaMap(), resolveEmpresa(), run(), getTargetDate(), runSync() (+48 more)

### Community 3 - "index.tsx"
Cohesion: 0.08
Nodes (27): EvolucaoMacroChart(), EvolucaoMacroChartProps, formatCompactCurrency(), formatCurrency(), formatDate(), COLOR_MAP, KpiCard(), KpiCardProps (+19 more)

### Community 4 - "useTransactions.ts"
Cohesion: 0.09
Nodes (21): AlertResolveDialog(), AlertResolveDialogProps, CashFlowChart(), HeroBalance(), MotorStatus(), useAlerts(), useResolveAlert(), useBulkInsertConciliationMatches() (+13 more)

### Community 5 - "cn"
Cohesion: 0.08
Nodes (21): aggregateAssistantTurns(), AggregatedTurn, extractSteps(), getMessageContent(), getToolLabel(), Message, MessageList(), sanitizeErrorText() (+13 more)

### Community 6 - "recebiveis.tsx"
Cohesion: 0.12
Nodes (25): ImportRecebiveisModal(), ImportRecebiveisModalProps, ReceivableFormModal(), ReceivableFormModalProps, StoreReceivablesCard(), StoreReceivablesCardProps, deriveTemporalStatus(), ReceivableItem (+17 more)

### Community 7 - "routeTree.gen.ts"
Cohesion: 0.07
Nodes (31): getRouter(), AlertasRoute, BootstrapRoute, ConciliacaoDetalhesRoute, ConciliacaoIndexRoute, ConciliacaoLojaIdRoute, ConfiguracoesRoute, CustosRoute (+23 more)

### Community 8 - "ias-hub.ts"
Cohesion: 0.09
Nodes (13): AgentReflection, ClaritasConnector, ClaritasPolicy, ClaritasPrompt, createClaritasConnector(), createGraphifyConnector(), GraphData, GraphEdge (+5 more)

### Community 9 - "CentralImportWizard.tsx"
Cohesion: 0.09
Nodes (24): AgentRunnerModal(), AgentRunnerModalProps, INITIAL_STAGES, AgentStage, AgentStageItem(), AgentStageItemProps, STAGE_META, SubStep (+16 more)

### Community 10 - "supabase.ts"
Cohesion: 0.11
Nodes (15): CreateUserModal(), CreateUserModalProps, UserManagementPanel(), UserManagementPanelProps, listeners, useSession(), GoalRow, ImportLog (+7 more)

### Community 11 - "compilerOptions"
Cohesion: 0.07
Nodes (26): DOM, DOM.Iterable, ES2022, eslint.config.js, src/**/*.ts, src/**/*.tsx, vite/client, vite.config.ts (+18 more)

### Community 12 - "ResumoDiaPanel.tsx"
Cohesion: 0.16
Nodes (21): FaturamentoAtualBreakdownModal(), FaturamentoAtualBreakdownModalProps, ResumoDiaPanel(), AnimatedNumber(), AnimatedNumberProps, useDailyReconciliationSummary(), usePosTripleReconciliation(), DailySnapshotRow (+13 more)

### Community 13 - "loja.$lojaId.tsx"
Cohesion: 0.15
Nodes (20): DailyEvolutionPoint, LojaEvolutionChart(), LojaEvolutionChartProps, LojaPieCharts(), LojaPieChartsProps, useCashRegisters(), useCloseCashRegister(), StoreAnalyticBreakdown (+12 more)

### Community 14 - "dependencies"
Cohesion: 0.09
Nodes (23): class-variance-authority, @hookform/resolvers, dependencies, class-variance-authority, @hookform/resolvers, @radix-ui/react-aspect-ratio, @radix-ui/react-select, @radix-ui/react-slider (+15 more)

### Community 15 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowSyntheticDefaultImports, declaration, esModuleInterop, module, moduleResolution, outDir, resolveJsonModule (+11 more)

### Community 16 - "useBackendConciliacao.ts"
Cohesion: 0.13
Nodes (14): AuditTrailBar(), AuditTrailBarProps, ResumoDiaPanelProps, WhisperDot(), WhisperDotProps, ConciliationDailyLog, DailyReconciliationSummary, StorePosDetail (+6 more)

### Community 17 - "components.json"
Cohesion: 0.11
Nodes (18): aliases, components, hooks, lib, ui, utils, iconLibrary, registries (+10 more)

### Community 18 - "devDependencies"
Cohesion: 0.11
Nodes (19): eslint-config-prettier, @eslint/js, eslint-plugin-react-refresh, @lovable.dev/vite-tanstack-config, devDependencies, eslint-config-prettier, @eslint/js, eslint-plugin-react-refresh (+11 more)

### Community 19 - "importacoes.tsx"
Cohesion: 0.18
Nodes (15): PurgeDailyModal(), PurgeDailyModalProps, useSaveImportedReport(), GroupedImportLog, ParsedOS, ParsedReceivable, savePatioOsAndReceivables(), useClearAllData() (+7 more)

### Community 20 - "AppShell.tsx"
Cohesion: 0.14
Nodes (8): AppShell(), TopBar(), ThemeToggle(), Route, Route, Route, Route, TaxasSearchParams

### Community 21 - "seed.ts"
Cohesion: 0.24
Nodes (15): useAlerts(), useCashInputs(), useStores(), ALERTS, buildHistory(), ensureSeed(), KEYS, STORES (+7 more)

### Community 22 - "dependencies"
Cohesion: 0.12
Nodes (17): dependencies, cors, dotenv, express, @playwright/test, @supabase/supabase-js, @types/cors, xlsx (+9 more)

### Community 23 - "ConfiguracoesPanel.tsx"
Cohesion: 0.21
Nodes (12): AgenteIAConfigPanel(), MODEL_OPTIONS, PROVIDER_LABELS, AiSettingsForm(), ConfiguracoesPanel(), AiSettings, useAiSettings(), useSaveAiSettings() (+4 more)

### Community 24 - "PromptBox.tsx"
Cohesion: 0.12
Nodes (8): ClassValue, DialogContent, DialogOverlay, PopoverContent, PromptBox, PromptBoxProps, toolsList, TooltipContent

### Community 25 - "ExtratosImportacaoModal.tsx"
Cohesion: 0.19
Nodes (12): ExtratosImportacaoModal(), ExtratosImportacaoModalProps, formatCurrency(), formatDateTime(), Tab, RawOfxResponse, RawOfxTransaction, RawOsRecord (+4 more)

### Community 26 - "BankReconciliationDashboard.tsx"
Cohesion: 0.23
Nodes (13): BankReconciliationDashboard(), ClassifiedFile, classifyFile(), FileTypeCategory, UniversalDropzone(), UniversalDropzoneProps, useSaveBankReconciliation(), useSaveMachineTotal() (+5 more)

### Community 27 - "conciliacao-detalhes.tsx"
Cohesion: 0.18
Nodes (10): StoreRankingChart(), useConciliacaoDetalhes(), useConciliacaoResumo(), useDeleteStore(), useAllStoresBalances(), ReconciliationRow, ConciliacaoDetalhesPage(), StatusTab (+2 more)

### Community 28 - "src/server.ts"
Cohesion: 0.22
Nodes (10): attachSupabaseAuth, consumeLastCapturedError(), renderErrorPage(), brandedErrorResponse(), fetch(), getServerEntry(), isCatastrophicSsrErrorBody(), normalizeCatastrophicSsrResponse() (+2 more)

### Community 29 - "supabase/types.ts"
Cohesion: 0.14
Nodes (12): requireSupabaseAuth, supabaseAdmin, CompositeTypes, Constants, Database, DatabaseWithoutInternals, DefaultSchema, Enums (+4 more)

### Community 30 - "FileRoutesByPath"
Cohesion: 0.14
Nodes (14): useLogin(), Route, Route, Route, Route, Route, Route, Route (+6 more)

### Community 31 - "BreakdownModal.tsx"
Cohesion: 0.19
Nodes (11): BreakdownModal(), BreakdownModalProps, formatCurrency(), formatDateTime(), Tab, TAB_DEFS, ConciliationBreakdown, OfxTransactionDetail (+3 more)

### Community 32 - "Button.tsx"
Cohesion: 0.18
Nodes (9): LegacyOs, LegacyOsTable(), container, item, ManualOsEntry, ManualOsFallbackForm(), ManualOsFallbackFormProps, Button() (+1 more)

### Community 33 - "patio.tsx"
Cohesion: 0.21
Nodes (10): RecentActivity(), usePatioOS(), usePatioSummary(), PatioOSRow, FilterTab, getOsEffectiveValues(), HistoryChange, HistoryLog (+2 more)

### Community 34 - "useDiagnosticEngine.ts"
Cohesion: 0.25
Nodes (11): DiagnosticPanel(), DiagnosticPanelProps, formatCurrency(), formatPercent(), classifyDeviation(), SnapshotRow, useDiagnosticEngine(), DiagnosticEngineInput (+3 more)

### Community 35 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, ts-node, @types/express, @types/node, typescript, @types/node, typescript, @types/node (+3 more)

### Community 36 - "useStores"
Cohesion: 0.31
Nodes (8): ContasManualModal(), ContasManualModalProps, IntercompanyEntitiesModal(), IntercompanyEntitiesModalProps, useIntercompanyEntities(), useStores(), CATEGORY_LABELS, BootstrapPage()

### Community 37 - "bankingCalendar.ts"
Cohesion: 0.51
Nodes (10): addBusinessDays(), calculateDueDate(), formatDateToYYYYMMDD(), getEasterDate(), getNationalHolidays(), getNextBusinessDay(), isBusinessDay(), isNationalHoliday() (+2 more)

### Community 38 - "database.types.ts"
Cohesion: 0.18
Nodes (10): CompositeTypes, Constants, Database, DatabaseWithoutInternals, DefaultSchema, Enums, Json, Tables (+2 more)

### Community 39 - "bot/package.json"
Cohesion: 0.20
Nodes (9): description, name, scripts, bot, bot:install-browsers, bot:oi, bot:rede, bot:server (+1 more)

### Community 40 - "MdrAuditView.tsx"
Cohesion: 0.27
Nodes (6): NewTransactionDialogProps, TODO: Implement transaction creation, MdrAuditView(), Input, InputProps, useMdrAudit()

### Community 41 - "useStores.ts"
Cohesion: 0.33
Nodes (6): StoreFormDialog(), StoreFormDialogProps, sanitizeStore(), useCreateStore(), useUpdateStore(), StoreRow

### Community 42 - "LogsMotorPanel.tsx"
Cohesion: 0.31
Nodes (4): LogsMotorPanel(), BotAuditLog, useBotLogs(), Route

### Community 43 - "StoreDonutCharts.tsx"
Cohesion: 0.31
Nodes (8): cleanStoreLabel(), CONTAS_COLORS, CustomDonutTooltip(), FATURAMENTO_COLORS, formatCompact(), formatCurrency(), StoreDonutCharts(), StoreDonutChartsProps

### Community 44 - "TaxasDashboardView.tsx"
Cohesion: 0.33
Nodes (6): ContractFeeEditorModal(), ContractFeeEditorModalProps, TaxasDashboardView(), TaxasDashboardViewProps, PosFeeContract, useFeeContracts()

### Community 45 - "package.json"
Cohesion: 0.25
Nodes (7): name, overrides, react, react-dom, private, sideEffects, type

### Community 46 - "DailyAuditLogsView.tsx"
Cohesion: 0.39
Nodes (5): DailyAuditLogsView(), DailyAuditLogsViewProps, AuditLogEntry, useAuditLogs(), useSystemUsers()

### Community 47 - "proposta.tsx"
Cohesion: 0.25
Nodes (3): CostConfig, defaultConfig, Route

### Community 48 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, build:dev, dev, format, lint, preview

### Community 49 - "FaturamentoVsContasChart.tsx"
Cohesion: 0.38
Nodes (5): cleanStoreLabel(), CustomTooltip(), FaturamentoVsContasChart(), FaturamentoVsContasChartProps, formatCurrency()

### Community 51 - "ai-chat/index.ts"
Cohesion: 0.43
Nodes (4): corsHeaders, toolsLocal(), logMcpExecution(), toolsOficina()

### Community 52 - "resilience.test.ts"
Cohesion: 0.47
Nodes (5): BankTransaction, BankTransactionSchema, fetchWithBackoff(), mockSupabase, syncTransactions()

### Community 53 - "aiReconciliationService.ts"
Cohesion: 0.40
Nodes (5): auditCashInOsList(), callGoogleGeminiApi(), CashAuditResult, DiscrepancyDiagnosis, FuzzyMatchResult

### Community 56 - "ai-chat/deno.json"
Cohesion: 0.40
Nodes (4): imports, @supabase/functions-js/, tasks, start

### Community 59 - "imports"
Cohesion: 0.50
Nodes (3): imports, @supabase/functions-js, @supabase/server

## Knowledge Gaps
- **418 isolated node(s):** `name`, `version`, `description`, `bot`, `bot:server` (+413 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **70 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `supabase` connect `supabase.ts` to `Card.tsx`, `WizardImportacao.tsx`, `index.tsx`, `useTransactions.ts`, `recebiveis.tsx`, `CentralImportWizard.tsx`, `ResumoDiaPanel.tsx`, `loja.$lojaId.tsx`, `useBackendConciliacao.ts`, `importacoes.tsx`, `ConfiguracoesPanel.tsx`, `ExtratosImportacaoModal.tsx`, `src/server.ts`, `BreakdownModal.tsx`, `Button.tsx`, `patio.tsx`, `useDiagnosticEngine.ts`, `useStores`, `useStores.ts`, `LogsMotorPanel.tsx`, `TaxasDashboardView.tsx`, `DailyAuditLogsView.tsx`, `custos.tsx`, `useAutonomousReconciliation.ts`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Why does `Card()` connect `Card.tsx` to `WizardImportacao.tsx`, `index.tsx`, `useTransactions.ts`, `cn`, `recebiveis.tsx`, `CentralImportWizard.tsx`, `supabase.ts`, `ResumoDiaPanel.tsx`, `loja.$lojaId.tsx`, `importacoes.tsx`, `ConfiguracoesPanel.tsx`, `BankReconciliationDashboard.tsx`, `conciliacao-detalhes.tsx`, `patio.tsx`, `useStores`, `MdrAuditView.tsx`, `LogsMotorPanel.tsx`, `StoreDonutCharts.tsx`, `TaxasDashboardView.tsx`, `DailyAuditLogsView.tsx`, `proposta.tsx`, `FaturamentoVsContasChart.tsx`, `custos.tsx`, `importar-os.tsx`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `dependencies`, `package.json`, `ai`, `@ai-sdk/react`, `@cloudflare/vite-plugin`, `clsx`, `cmdk`, `date-fns`, `embla-carousel-react`, `framer-motion`, `input-otp`, `lucide-react`, `nitro`, `pdfjs-dist`, `pg`, `@radix-ui/react-accordion`, `@radix-ui/react-alert-dialog`, `@radix-ui/react-avatar`, `@radix-ui/react-checkbox`, `@radix-ui/react-collapsible`, `@radix-ui/react-context-menu`, `@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-hover-card`, `@radix-ui/react-label`, `@radix-ui/react-menubar`, `@radix-ui/react-navigation-menu`, `@radix-ui/react-popover`, `@radix-ui/react-progress`, `@radix-ui/react-radio-group`, `@radix-ui/react-scroll-area`, `@radix-ui/react-separator`, `@radix-ui/react-slot`, `@radix-ui/react-switch`, `@radix-ui/react-tabs`, `@radix-ui/react-toggle`, `@radix-ui/react-toggle-group`, `@radix-ui/react-tooltip`, `react`, `react-dom`, `react-hook-form`, `react-markdown`, `react-resizable-panels`, `recharts`, `remark-gfm`, `sonner`, `ssh2`, `tailwindcss`, `@tanstack/react-query`, `@tanstack/react-router`, `@tanstack/react-start`, `@tanstack/router-plugin`, `@tanstack/start-server-core`, `tw-animate-css`, `vaul`, `vite-tsconfig-paths`, `zod`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _418 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Card.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05137614678899083 - nodes in this community are weakly interconnected._
- **Should `WizardImportacao.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05231724796942188 - nodes in this community are weakly interconnected._
- **Should `oficina.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06151062867480778 - nodes in this community are weakly interconnected._