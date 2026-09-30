# Proposal: Remoção Completa do Cockpit (Spec 457)

Ref: GitHub Issue [#10: refactor/chore: remover Cockpit por completo](https://github.com/mktfun/mec-nica-financeiro/issues/10)

---

## 1. Problema

O módulo "Cockpit de Diagnóstico 360° Pós-Motor" (introduzido na Spec 384) foi concebido originalmente para exibir um painel detalhado de conferência de maquininhas Rede por bandeira e loja dentro do Step 8 do `CentralImportWizard.tsx`. 

Com a evolução e maturação do sistema financeiro:
1. O fluxo oficial de conferência, apuração dos 5 Pilares e batimento das maquininhas migrou de forma consolidada e canônica para o **Resumo do Dia** (`/conciliacao`, `ResumoDiaPanel.tsx`), o **Raio-X de Maquininhas** (`MaquininhasDetailModal.tsx`) e a visão por filial (`StoreCartaoMaquininhaView.tsx`).
2. A presença do Cockpit redundante no Step 8 da importação gera sobrecarga visual, lentidão de renderização e confusão no operador, além de manter código morto, tipos obsoletos e scripts legados que poluem o repositório.
3. É necessário expurgar todas as telas, componentes, tipos e scripts exclusivos do Cockpit, garantindo estritamente que funções, hooks e estruturas de banco de dados compartilhadas com o fluxo de conciliação ativo permaneçam 100% funcionais e íntegras.

---

## 2. Solução Proposta

Executar a limpeza cirúrgica de todas as dependências e artefatos exclusivos do Cockpit:

1. **Remoção de Componentes Exclusivos (`[DELETE]`):**
   - Deletar `src/components/importacoes/wizard/PostMotorDiagnosticCockpit.tsx`.
   - Deletar `src/components/importacoes/wizard/DiagnosticActionCards.tsx`.
   - Deletar `src/components/importacoes/wizard/StoreDiagnosticRow.tsx`.

2. **Remoção de Tipos e Contratos Exclusivos (`[DELETE]`):**
   - Deletar `src/types/cockpit360.ts` (`Cockpit360DiagnosticResponse`, `CockpitStoreDetail`, `CockpitBrandDetail`, `CockpitKpis`, `CockpitFlaggedTransaction`, `SettlementStatusType`, `CockpitFilterState`).

3. **Desacoplamento do Wizard de Importação (`[MODIFY]`):**
   - Em `src/components/importacoes/CentralImportWizard.tsx`:
     - Remover o import de `PostMotorDiagnosticCockpit` (linha 60).
     - Remover a renderização condicional `<PostMotorDiagnosticCockpit ... />` no Step 8 (linhas 4442–4450).
     - Preservar integralmente o resumo de conclusão, auditoria pericial, auto-healing e os botões de ação ("Revisar Pagamentos sem OS (Passo 4)", "Ir para a Conciliação do Dia", "Nova Importação").

4. **Remoção de Scripts e Evidências Legadas Exclusivas (`[DELETE]`):**
   - Deletar `scripts/test-spec-384-cockpit.cjs`.
   - Deletar `scripts/screenshot-cockpit-28.mjs`.
   - Deletar screenshots residuais `e2e-results/screenshots/cockpit_dia_28082026_oficial.png` e `e2e-results/screenshots/step_09_cockpit_resumo_dia_27082026.png`.

5. **Atualização de Documentação e Referências Ativas (`[MODIFY]`):**
   - Em `TEST_READY.md`: atualizar linha 147 eliminando a menção ao arquivo deletado.
   - Documentar que menções em `docs/` e `docs/GUIA_CONCILIACAO_SISTEMA.md` a "Cockpit do Resumo do Dia" ou "Cockpit das Filiais" são terminologias contextuais para `/conciliacao` e `/recebiveis` e não representam código ou rotas obsoletas.

6. **Preservação Canônica de Serviços e Banco Compartilhados:**
   - **Banco de Dados:** Nenhuma tabela, coluna (`pos_transactions.brand`, `expected_credit_date`, `nsu`, `authorization_code`) ou dado histórico será apagado. A RPC `get_store_pos_triple_reconciliation` é preservada.
   - **Hooks:** O hook `usePosTripleReconciliation` e a interface `PosTripleReconciliationResult` em `useBackendConciliacao.ts` permanecem intactos, pois são consumidos ativamente por `ResumoDiaPanel.tsx`, `StoreCartaoMaquininhaView.tsx` e `MaquininhasDetailModal.tsx`.

---

## 3. Skills Especializadas Aplicadas

- `frontend-design-pro`: Limpeza de dependências de interface e validação do fluxo do `CentralImportWizard.tsx`.
- `backend-patterns`: Mapeamento de blast radius no React Query e hooks de conciliação.
- `database`: Garantia de não-mutação e preservação de DDL e dados históricos em `pos_transactions`.
- `deploy-production`: Terminal Gate com compilação estrita em produção (`npm run build`).

---

## 4. Contratos de Dados & Grafo de Dependências

### Mapeamento Graphify (Blast Radius)
A análise topológica do nó `PostMotorDiagnosticCockpit.tsx` confirmou:
- **Consumidores Ativos:** Apenas 1 (`src/components/importacoes/CentralImportWizard.tsx:L60`).
- **Nenhum menu**, sidebar (`Sidebar.tsx`), bottom navigation (`BottomNav.tsx`) ou rota TanStack Router (`src/routes/*`) possui links ou rotas ativas apontando para o Cockpit.
- **Componentes Filhos:** `DiagnosticActionCards.tsx` e `StoreDiagnosticRow.tsx` possuem consumo exclusivo por `PostMotorDiagnosticCockpit.tsx`.

---

## 5. Lista de Arquivos Afetados

### [DELETE] Arquivos Exclusivos do Cockpit:
- `src/components/importacoes/wizard/PostMotorDiagnosticCockpit.tsx` (826 linhas)
- `src/components/importacoes/wizard/DiagnosticActionCards.tsx` (173 linhas)
- `src/components/importacoes/wizard/StoreDiagnosticRow.tsx` (248 linhas)
- `src/types/cockpit360.ts` (95 linhas)
- `scripts/test-spec-384-cockpit.cjs` (154 linhas)
- `scripts/screenshot-cockpit-28.mjs` (34 linhas)
- `e2e-results/screenshots/cockpit_dia_28082026_oficial.png`
- `e2e-results/screenshots/step_09_cockpit_resumo_dia_27082026.png`

### [MODIFY] Arquivos com Referências Desacopladas:
- `src/components/importacoes/CentralImportWizard.tsx` (remoção do import e do bloco de renderização)
- `TEST_READY.md` (remoção de referência ao componente apagado)

### [PRESERVED] Arquivos Compartilhados Intactos:
- `src/hooks/useBackendConciliacao.ts` (`usePosTripleReconciliation` e `PosTripleReconciliationResult` mantidos)
- `src/components/conciliacao/ResumoDiaPanel.tsx` (consumo ativo preservado)
- `src/components/conciliacao/StoreCartaoMaquininhaView.tsx` (consumo ativo preservado)
- `src/components/conciliacao/MaquininhasDetailModal.tsx` (consumo ativo preservado)
- `supabase/migrations/20260909000041_cockpit_pos_triple_reconciliation_brand.sql` (schema DDL preservado)

---

## 6. Evidência e Decisão

| Artefato | Ação | Justificativa | Verificação |
|---|---|---|---|
| `PostMotorDiagnosticCockpit.tsx` | Deletar | Componente exclusivo da Spec 384, tornado obsoleto pelo fluxo canônico de conciliação. | Zero imports remanescentes |
| `DiagnosticActionCards.tsx` | Deletar | Subcomponente com consumo 100% restrito a `PostMotorDiagnosticCockpit.tsx`. | Zero imports remanescentes |
| `StoreDiagnosticRow.tsx` | Deletar | Subcomponente com consumo 100% restrito a `PostMotorDiagnosticCockpit.tsx`. | Zero imports remanescentes |
| `src/types/cockpit360.ts` | Deletar | Tipos exclusivos consumidos apenas pelos 3 componentes acima. | Zero erros de tipo TS |
| `CentralImportWizard.tsx` | Editar | Remover import e invocação JSX do Cockpit no Step 8. | `npm run build` |
| `useBackendConciliacao.ts` | Preservar | Hook `usePosTripleReconciliation` é consumido por telas ativas do sistema financeiro. | Testes E2E de conciliação |
| `TEST_READY.md` | Editar | Documentação técnica interna limpando arquivo deletado. | Diff limpo |

---

## 7. Risco Principal e Mitigação

- **Risco Principal:** Quebra de tipagem ou referência esquecida gerando falha de compilação ou regressão na tela de importação.
- **Mitigação:** Validação através de busca exaustiva via ripgrep (`grep_search`), verificação do grafo com Graphify, execução da suíte de testes de importação/conciliação e Terminal Gate (`npm run build`).

---

## 8. Plano de Rollback

Caso a remoção cause efeito colateral imprevisto, o rollback será executado de forma determinística via Git:
1. Reverter os arquivos modificados: `git checkout src/components/importacoes/CentralImportWizard.tsx TEST_READY.md`.
2. Restaurar os arquivos deletados do commit base: `git checkout HEAD -- src/components/importacoes/wizard/PostMotorDiagnosticCockpit.tsx src/components/importacoes/wizard/DiagnosticActionCards.tsx src/components/importacoes/wizard/StoreDiagnosticRow.tsx src/types/cockpit360.ts scripts/test-spec-384-cockpit.cjs scripts/screenshot-cockpit-28.mjs`.
3. Executar `npm run build` para restabelecer a integridade anterior.
