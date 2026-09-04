# 📋 Spec Plan: Spec 361 — Correção Canônica da Conciliação Diária

Status: Applied - Pending User Local Testing
Spec ID: 361-correcao-conciliacao-faturamento-datas-contas

---

### [ROTEAMENTO]
- [x] Completed: Unificar o controle de data em `src/routes/conciliacao.index.tsx` tornando o Search Param `?date=` a fonte única da verdade (SSOT), atualizando a rota via `navigate({ search: { date: newDate }, replace: true })` em `handleDayChange` e `onDateSelect`, eliminando o `useEffect` que revertia para o dia 4.

### [BACKEND / RPC]
- [x] Completed: Criar migration SQL `20260904000033_reactive_reconciliation_summary.sql` atualizando `public.get_daily_reconciliation_summary` para calcular `contas_manual` a partir da soma real de `daily_manual_bills` (onde `contabilizar_no_subtotal = true`) sem ser bloqueada pelo snapshot anterior, e priorizar `metadata->>'faturamento_oi_base'` para evitar subtrações anômalas no faturamento.
- [x] Completed: Aplicar a migration no banco Supabase via migration runner headless.

### [FRONTEND / FATURAMENTO]
- [x] Completed: Implementar a calculadora bidirecional de faturamento em `src/components/conciliacao/ResumoDiaPanel.tsx` (Odômetro Hoje, Odômetro Anterior e Faturamento Líquido do Dia), sincronizando a edição em tempo real e gravando `faturamento_oi_base` e `odometro_hoje` no metadata do snapshot.
- [x] Completed: Ajustar `src/components/conciliacao/FaturamentoDetalhesModal.tsx` para permitir visualização e edição transparente do faturamento base OI e recálculo reativo dos ajustes DRE.

### [FRONTEND / CONTAS & A RECEBER & PÁTIO]
- [x] Completed: Atualizar `src/components/conciliacao/ContasManualModal.tsx` para sincronizar o snapshot diário após inclusão, edição ou exclusão de contas em `daily_manual_bills`.
- [x] Completed: Adicionar fallback canônico para `a_receber_manual` herdando de `previousSnapshot.a_receber_manual` tanto em `ResumoDiaPanel.tsx` quanto em `src/components/importacoes/CentralImportWizard.tsx`.
- [x] Completed: Ajustar a auditoria e conciliação do Pátio (OSs em aberto) em `ResumoDiaPanel.tsx` e `PatioOsDetailModal.tsx` para destacar a variação temporal de OSs baixadas e ativas.

### [EQUALIZAÇÃO & TESTES]
- [x] Completed: Sincronizar e equalizar o fechamento de 04/09/2026 com o faturamento e contas reais, verificando se a diferença final fica dentro da tolerância de auditoria (< R$ 50,00).
- [x] Completed: Validar build completo do projeto (`npm run build`) sem erros de tipagem TypeScript.
