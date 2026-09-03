### Feature 367: Restauração do CentralImportWizard no Modo Manual (Importação em Massa)
- **Status:** COMPLETED & ARCHIVED
- **Data:** 2026-09-03
- **Arquivos Criados/Modificados:**
  - `src/routes/importacoes.tsx` (Renderização de `CentralImportWizard` com barra contextual ao selecionar modo manual)
  - `src/components/importacoes/bifurcacao/FechamentoModeSelector.tsx` (Card 1 atualizado para "Modo Manual (Importação em Massa)" com dropzone universal para todos os arquivos juntos)
- **Descrição:** Restauração do fluxo clássico de fechamento manual em lote para as 10 filiais através do `CentralImportWizard`, permitindo soltar todos os arquivos de uma vez só com esteira assistida de resolução.

### Feature 366: Correção de `v_chosen_os RECORD` (Erro 55000) na RPC `match_stage2_rede_os`
- **Status:** COMPLETED & ARCHIVED
- **Data:** 2026-09-03
- **Arquivos Criados/Modificados:**
  - `supabase/migrations/20260903000030_fix_match_stage2_rede_os_v_chosen_os_record.sql` (Substituição de `v_chosen_os RECORD;` por escalares tipados `v_chosen_os_id`, `v_chosen_os_number`, `v_chosen_os_total_value`, `v_chosen_os_paid_value`, `v_chosen_os_status` com reset atômico por loop)
- **Descrição:** Resolução do erro PostgreSQL SQLSTATE `55000` (`record "v_chosen_os" is not assigned yet` / `The tuple structure of a not-yet-assigned record is indeterminate.`) ao processar vendas da Rede na Fase 2.

### Feature 365: Fluxo Visual Limpo por Etapas (2 Modos) e Recalibração do Motor de Matching Rede x OS
- **Status:** COMPLETED & ARCHIVED
- **Data:** 2026-09-03
- **Arquivos Criados/Modificados:**
  - `supabase/migrations/20260903000029_recalibrate_match_stage2_rede_os.sql` (RPC `match_stage2_rede_os` com isolamento temporal na data alvo, exclusão em memória de OSs pareadas `v_matched_os_ids`, cascata de 3 Tiers e desempate determinístico)
  - `src/components/importacoes/manual/Fase1PatioOsReview.tsx` (Padrão 2 modos: Dropzone limpo focado vs Review com grade sanfona em tela cheia e botão `[Reimportar Planilhas]`)
  - `src/components/importacoes/manual/Fase2RedeVsOsReview.tsx` (Padrão 2 modos: Dropzone limpo vs Review com conferência de Vendas Casadas/Sobras e botão `[Reimportar Arquivo Rede]`)
  - `src/components/importacoes/manual/Fase3OfxReconciliation.tsx` (Padrão 2 modos: Dropzone limpo para 10 OFX vs Review com apuração de liquidação Rede e PIX e botão `[Reimportar Extratos OFX]`)
  - `src/components/importacoes/manual/Fase4ContasVsSaidasReview.tsx` (Padrão 2 modos: Dropzone limpo vs Review com Live Delta Tracker, DRE e botão `[Reimportar Contas]`)
- **Descrição:** Eliminação da poluição visual e ruído de dropzones permanentemente fixos nas 4 fases da esteira manual através do padrão `Clean Drop State` vs `Review State`. Recalibração completa da RPC `match_stage2_rede_os`, eliminando falsas colisões provocadas por busca irrestrita em OSs antigas da oficina e restaurando o auto-match real entre vendas capturadas nas maquininhas e ordens de serviço de balcão.

### Feature 364: Correção de `updated_at` em `pos_transactions` e RPC `match_stage2_rede_os`
- **Status:** COMPLETED & ARCHIVED
- **Data:** 2026-09-03
- **Arquivos Criados/Modificados:**
  - `supabase/migrations/20260903000028_add_updated_at_to_pos_transactions.sql` (Adiciona `updated_at TIMESTAMPTZ`, trigger e recompilação idempotente da RPC)
  - `src/integrations/supabase/types.ts` (Atualização das definições TypeScript de Row, Insert e Update)
- **Descrição:** Resolução do erro PostgreSQL `42703` (`column "updated_at" of relation "pos_transactions" does not exist`) ao disparar a conciliação automática da Fase 2.

### Feature 363: Correção de `occurred_at` em `pos_transactions` e Blindagem de Contratos na Esteira Manual
- **Status:** COMPLETED & ARCHIVED
- **Data:** 2026-09-03
- **Arquivos Criados/Modificados:**
  - `src/components/importacoes/manual/Fase2RedeVsOsReview.tsx` (Composição de `occurred_at`, `fee_amount` via `interest`, `transaction_type`, `dedup_hash`, fallback `null` para `store_id`, e upsert idempotente)
  - `src/components/importacoes/manual/Fase3OfxReconciliation.tsx` (Adição mandatória de `bank_name`, `occurred_at`, `counterpart_name`, `fitid`, sanitização de `store_id` e upsert idempotente)
  - `src/components/importacoes/manual/Fase4ContasVsSaidasReview.tsx` (Mapeamento de `title` NOT NULL, remoção de `status: 'pendente'`, leitura de `counterpart_name` e correção da RPC `auto_match_saidas(p_date)`)
- **Descrição:** Resolução do erro PostgreSQL `23502` (`null value in column "occurred_at" of relation "pos_transactions" violates not-null constraint`) ao importar vendas da Rede na Fase 2, e saneamento preventivo das constraints NOT NULL e assinaturas de RPC nas Fases 3 (`ofx_transactions`) e 4 (`daily_manual_bills`).

### Feature 362: Correção de OSs Rejeitadas (Planalto/Brasicar e Rei do Módulo) e Modo Fora do Relatório no Pátio
- **Status:** COMPLETED & ARCHIVED
- **Data:** 2026-09-03
- **Arquivos Criados/Modificados:**
  - `src/hooks/useOsImportProcessor.ts` (Varredura estendida até 60 linhas, regex tolerante para cabeçalhos e captura de `storeAlias` com hífens)
  - `src/hooks/useStoreFileMappings.ts` e `src/lib/parsers/storeMapping.ts` (Mapeamento explícito de `BRASICAR`, `Planalto (BRASICAR)`, `Rei do Módulo`, `Rei do Modulo`)
  - `src/lib/parsers/centralImportManager.ts` (Preservação de detalhes do erro de OS em `results.errors`)
  - `src/components/importacoes/manual/Fase1PatioOsReview.tsx` (Rastreamento de `importedOsKeys`, carga de passivo em aberto e marcação `isMissingFromReport`)
  - `src/components/importacoes/patio/PatioExcelStoreAccordion.tsx` (Modo "Apenas Fora do Relatório" com Segmented Control, badges de ausentes, empty state contextual e botão de 1-clique "Baixar")
- **Descrição:** Eliminação da rejeição de planilhas de OS com metadados/cabeçalhos deslocados e resolução de lojas zeradas (`Planalto - BRASICAR` e `Rei do Módulo - MP`). Adição de modo focado na tela de conferência de OSs para que o operador filtre e baixe exclusivamente os veículos remanescentes no pátio que não constavam no relatório da data, mantendo intactos os totalizadores e faturamento contábil das filiais.

### Feature 361: Correção de Ingestão de Planilhas de OS e Motor Central de Imports
- **Status:** COMPLETED & ARCHIVED
- **Data:** 2026-09-03
- **Arquivos Criados/Modificados:**
  - `src/lib/parsers/centralImportManager.ts` (Implementação canônica pura de `parseCentralImports` e interface `CentralImportResults`)
  - `src/hooks/useCentralImport.ts` (Desacoplamento e delegação para `centralImportManager.ts`)
  - `src/components/importacoes/manual/Fase1PatioOsReview.tsx` (Blindagem defensiva e correção de leitura de meios de pagamento para `batch_upsert_patio_os`)
  - `src/components/importacoes/manual/Fase2RedeVsOsReview.tsx` (Guarda defensiva `redeResults || []`)
  - `src/components/importacoes/manual/Fase3OfxReconciliation.tsx` (Guarda defensiva `ofxResults || []` e normalização de `success: true`)
  - `src/components/importacoes/manual/Fase4ContasVsSaidasReview.tsx` (Guarda defensiva de contas e normalização de `storeName`/`dueDate`)
  - `src/components/importacoes/wizard/Step4FinalAuditAndClose.tsx` (Compatibilização com `CentralImportResults`)
- **Descrição:** Substituição do stub incompleto de `centralImportManager.ts` por motor puro de roteamento multi-formato (`.ofx`, `.ret`, `.pdf`, `.xlsx`, `.xls`, `.csv`), garantindo coleções de saída sempre inicializadas (`[]`), eliminando o erro `TypeError: Cannot read properties of undefined (reading 'filter')` em todas as fases do Fechamento Manual e corrigindo o mapeamento de meios de pagamento (`parsed_credit`, `parsed_debit`, `parsed_pix_transfer`, `parsed_cash`).

### Feature 279: Correção do Fechamento por Filial, Agregação Canônica e Cálculo de Diferença por Loja
- **Status:** COMPLETED & ARCHIVED
- **Data:** 2026-09-01
- **Arquivos Criados/Modificados:**
  - `supabase/migrations/20260901000003_fix_store_breakdown_metrics_and_differences.sql`
  - `src/components/conciliacao/StoreCardModulo1.tsx`
  - `src/components/conciliacao/ConciliacaoLojasView.tsx`
  - `src/routes/conciliacao.index.tsx`
  - `src/routes/conciliacao.$lojaId.tsx`
  - `src/hooks/useBackendConciliacao.ts`
- **DescriÃ§Ã£o:** AgregaÃ§Ã£o de dados por loja com CTEs isoladas na RPC `get_daily_reconciliation_summary`, padronizaÃ§Ã£o de `store_id` como `TEXT` (MauÃ¡ UUID e IDs curtos perfeitamente compatibilizados), cÃ¡lculo exato da diferenÃ§a e previsto por filial, componentizaÃ§Ã£o modular do card de 6 mÃ©tricas em Dark UI Zinc-950 e preservaÃ§Ã£o do parÃ¢metro temporal na navegaÃ§Ã£o.

### Feature 322: IdempotÃªncia do Motor de ConciliaÃ§Ã£o, ConciliaÃ§Ã£o de SaÃ­das OFX x Contas e Justificativa de Despesas Ã“rfÃ£s
- **Status:** COMPLETED & ARCHIVED
- **Data:** 2026-08-31
- **Arquivos Criados/Modificados:**
  - `supabase/migrations/20260831000008_resolve_orphan_saida_ofx.sql`
  - `src/components/importacoes/wizard/Step2NonRevenueJustifications.tsx`
  - `src/components/importacoes/CentralImportWizard.tsx`
- **DescriÃ§Ã£o:** EliminaÃ§Ã£o de dupla execuÃ§Ã£o no wizard de importaÃ§Ã£o, criaÃ§Ã£o de rotina atÃ´mica `close_daily_snapshot` para o Step 7, suporte a resoluÃ§Ã£o de saÃ­das Ã³rfÃ£s do OFX com abas dedicadas, toggle contÃ¡bil para compor ou nÃ£o despesas no DRE e vÃ­nculo manual a contas da loja em 1 clique.

## [2026-08-31] â€” Feature 321: InversÃ£o do Pipeline de IngestÃ£o com Motor AutomÃ¡tico + IA e UnificaÃ§Ã£o do VÃ­nculo Manual PIX & REDE
- **InversÃ£o da Esteira no `CentralImportWizard.tsx`:**
  - O botÃ£o de confirmaÃ§Ã£o do Preview executa imediatamente a persistÃªncia no banco (`patio_os`, `pos_transactions`, `ofx_transactions`, `daily_manual_bills`), as RPCs `auto_match_transactions`, `auto_match_saidas`, `calculate_daily_conciliation` e a auditoria de IA (Gemini).
  - O Step 1 de pagamentos nÃ£o registrados recebe e exibe apenas as transaÃ§Ãµes que continuaram genuinamente Ã³rfÃ£s / sem vÃ­nculo.
- **Novas RPCs AtÃ´micas (`20260831000007_create_link_manual_pix_and_rede_rpcs.sql`):**
  - `public.link_manual_pix_to_os`: Vincula atÃ´mica e seguramente depÃ³sitos PIX a OSs do pÃ¡tio com isolamento por `store_id`.
  - `public.link_manual_rede_to_os`: Vincula vendas de cartÃ£o da Rede a OSs da mesma loja, abatendo saldo sem duplicar faturamento.
  - `public.unlink_manual_os_match`: Desfaz o vÃ­nculo restaurando o status da OS e das transaÃ§Ãµes.
- **UnificaÃ§Ã£o do VÃ­nculo Manual (`ManualMatchOsModal.tsx` & `useManualMatch.ts`):**
  - Suporte completo a transaÃ§Ãµes REDE (com NSU, autorizaÃ§Ã£o, modalidade) e PIX, com ranking inteligente por Match Score (100, 80, 60) e isolamento por loja.

## [2026-08-31] â€” Feature 320: PersistÃªncia de Contas Manual e GestÃ£o de Despesas End-to-End
- **RPC `public.update_manual_bill` (`20260831000006_fix_contas_manual_override_and_management.sql`):** AtualizaÃ§Ã£o atÃ´mica de despesas (valor, fornecedor, filial, categoria DRE e toggle contÃ¡bil).
- **PrecedÃªncia CanÃ´nica de Contas (`get_daily_reconciliation_summary`):** Respeita `daily_snapshots.metadata->>'contas_manual_override'` sem reverter para a soma bruta da planilha.
- **EdiÃ§Ã£o em Tempo Real (`ContasManualModal.tsx` & `ResumoDiaPanel.tsx`):** BotÃ£o de ediÃ§Ã£o em cada linha de conta a pagar (`EditBillModal`) e badge `Ajustado` no card de Contas.

## [2026-08-30] â€” Feature 314: Teste E2E e Fechamento da ConciliaÃ§Ã£o com Arquivos Reais de 27-08
- **AutomaÃ§Ã£o Playwright Ponta a Ponta (`scripts/run-e2e-conciliacao-2708.ts`):**
  - IngestÃ£o automatizada de 27 arquivos reais de `C:\Users\admin\Desktop\conciliacao\27-08` (10 relatÃ³rios de OS, 10 OFX ItaÃº, 5 Rede, 1 Contas a Pagar e 1 PDF).
  - ExecuÃ§Ã£o sequencial dos 8 steps do Wizard no `localhost:8080/importacoes`:
    - *Step 1:* Upload & parsing paralelo multi-formato.
    - *Step 2:* Mapeamento automÃ¡tico das 10 filiais (OFX, OSs e Rede).
    - *Step 3:* Preview Geral com inserÃ§Ã£o do OdÃ´metro OI (R$ 891.663,62), Dinheiro MP (R$ 20.225,00) e A Receber (R$ 8.349,67).
    - *Step 4:* ResoluÃ§Ã£o de pagamentos sem lanÃ§amento na OS (Tela A).
    - *Step 5:* ClassificaÃ§Ã£o contÃ¡bil de movimentaÃ§Ãµes intercompany com toggle Faturamento vs Apenas Conciliar (Tela B).
    - *Step 6:* ConfirmaÃ§Ã£o de integridade fÃ­sica dos 10 cofres das lojas (Tela C).
    - *Step 7:* ValidaÃ§Ã£o do semÃ¡foro dos 5 Pilares ContÃ¡beis (Tela D).
    - *Step 8:* GravaÃ§Ã£o em lote no PostgreSQL/Supabase com auto-healing.
  - Captura sequencial de 10 screenshots de evidÃªncia em `./e2e-results/screenshots/`.
- **BalanÃ§o ContÃ¡bil dos 5 Pilares (27/08/2026):**
  - Saldo Bancos LÃ­quido: R$ 60.575,77 (Positivo R$ 82.615,97 - Cheque Especial R$ 22.040,20).
  - Dinheiro MP: R$ 20.225,00 | A Receber: R$ 8.349,67 | PÃ¡tio OS: R$ 65.603,74.
  - Contas a Pagar + Juros Rede: R$ 20.752,83 | Faturamento do Dia: R$ 23.864,38.
  - DiferenÃ§a ContÃ¡bil Final: -R$ 0,03 (10 filiais aprovadas com 0 divergÃªncia).
### Spec 314 â€” Auditoria de Integridade de Saldos, DeduplicaÃ§Ã£o OFX Multi-Dias e Ciclo Rede
- **EliminaÃ§Ã£o de Trigger Destrutiva**: Drop definitivo da trigger update_reconciliation_bank_total e de update_bank_total_from_transactions, garantindo que o saldo patrimonial <LEDGERBAL> do extrato nunca seja sobrescrito por soma de transaÃ§Ãµes.
- **RPC get_store_pos_triple_reconciliation**: CÃ¡lculo 100% dinÃ¢mico de 
ao_entrou_valor (cartÃµes a compensar) sem hardcodes legados de filiais, apurando GREATEST(0, rede_liquido - ofx_maquininhas).
- **RPC get_dashboard_metrics**: Alinhamento 1:1 com a regra canÃ´nica dos 5 Pilares e deduÃ§Ã£o estrita de Cheque Especial (saldo_negativo_itau).
- **CentralImportWizard.tsx & useTransactions.ts**: PartiÃ§Ã£o temporal estrita por <DTPOSTED> para transaÃ§Ãµes OFX individuais, prevenindo que extratos com dados de 2 dias (D-1 e D) dupliquem depÃ³sitos da Rede em uma Ãºnica data.
- **Frontend & ResumoDiaPanel.tsx**: EliminaÃ§Ã£o de cÃ¡lculos paralelos no frontend, delegaÃ§Ã£o total para RPCs e preservaÃ§Ã£o de ank_total no upsert histÃ³rico de reconciliaÃ§Ãµes.

ï»¿## [2026-08-30] â€” Feature 314: Teste E2E e Fechamento da ConciliaÃ§Ã£o com Arquivos Reais de 27-08
- **AutomaÃ§Ã£o Playwright Ponta a Ponta (`scripts/run-e2e-conciliacao-2708.ts`):**
  - IngestÃ£o automatizada de 27 arquivos reais de `C:\Users\admin\Desktop\conciliacao\27-08` (10 relatÃ³rios de OS, 10 OFX ItaÃº, 5 Rede, 1 Contas a Pagar e 1 PDF).
  - ExecuÃ§Ã£o sequencial dos 8 steps do Wizard no `localhost:8080/importacoes`:
    - *Step 1:* Upload & parsing paralelo multi-formato.
    - *Step 2:* Mapeamento automÃ¡tico das 10 filiais (OFX, OSs e Rede).
    - *Step 3:* Preview Geral com inserÃ§Ã£o do OdÃ´metro OI (R$ 891.663,62), Dinheiro MP (R$ 20.225,00) e A Receber (R$ 8.349,67).
    - *Step 4:* ResoluÃ§Ã£o de pagamentos sem lanÃ§amento na OS (Tela A).
    - *Step 5:* ClassificaÃ§Ã£o contÃ¡bil de movimentaÃ§Ãµes intercompany com toggle Faturamento vs Apenas Conciliar (Tela B).
    - *Step 6:* ConfirmaÃ§Ã£o de integridade fÃ­sica dos 10 cofres das lojas (Tela C).
    - *Step 7:* ValidaÃ§Ã£o do semÃ¡foro dos 5 Pilares ContÃ¡beis (Tela D).
    - *Step 8:* GravaÃ§Ã£o em lote no PostgreSQL/Supabase com auto-healing.
  - Captura sequencial de 10 screenshots de evidÃªncia em `./e2e-results/screenshots/`.
- **BalanÃ§o ContÃ¡bil dos 5 Pilares (27/08/2026):**
  - Saldo Bancos LÃ­quido: R$ 60.575,77 (Positivo R$ 82.615,97 - Cheque Especial R$ 22.040,20).
  - Dinheiro MP: R$ 20.225,00 | A Receber: R$ 8.349,67 | PÃ¡tio OS: R$ 65.603,74.
  - Contas a Pagar + Juros Rede: R$ 20.752,83 | Faturamento do Dia: R$ 23.864,38.
  - DiferenÃ§a ContÃ¡bil Final: -R$ 0,03 (10 filiais aprovadas com 0 divergÃªncia). (feat(314): auditoria de integridade de saldos, deduplicacao ofx multi-dias e ciclo rede)
## [2026-08-27] â€” Feature 310: Novo Wizard Modular de IngestÃ£o e ConciliaÃ§Ã£o Passo a Passo
- **Fase 0 â€” IngestÃ£o Global Unificada (`Stage0UnifiedIngestion.tsx`):**
  - Dropzone multi-arquivos para upload simultÃ¢neo de OFX (10 filiais ItaÃº), Vendas da Rede (`.xlsx`), OSs do PÃ¡tio e Contas a Pagar (`BuscaContasAPagar.xls`).
  - Inputs manuais de Data de Fechamento e OdÃ´metro preliminar por loja, garantindo processamento e cruzamento em memÃ³ria antes de abrir as etapas de resoluÃ§Ã£o.
- **Passo 1 â€” TransaÃ§Ãµes sem LanÃ§amento de Pagamento na OS (`Step1UnregisteredPayments.tsx`):**
  - IdentificaÃ§Ã£o de vendas da Rede ou PIX do extrato que nÃ£o tiveram o pagamento lanÃ§ado na OS pelo gerente.
  - VÃ­nculo direto de 1 clique Ã  OS da filial com busca rÃ¡pida no pÃ¡tio: heranÃ§a automÃ¡tica e obrigatÃ³ria do valor e da forma de pagamento da prÃ³pria transaÃ§Ã£o (`PIX`, `CrÃ©dito Visa`, `DÃ©bito Elo`), abatimento do saldo em aberto do PÃ¡tio (`NA LOJA OS`) e gravaÃ§Ã£o atÃ´mica em `patio_os` e `conciliation_matches`.
- **Passo 2 â€” Justificativas de NÃ£o-Faturamento (`Step2NonRevenueJustifications.tsx`):**
  - ClassificaÃ§Ã£o contÃ¡bil por loja de movimentaÃ§Ãµes que nÃ£o sÃ£o vendas de serviÃ§os da oficina (Aportes, TransferÃªncias entre filiais, Estornos, Tarifas).
  - Total liberdade para o operador editar ou cancelar as justificativas a qualquer momento antes do fechamento definitivo.
- **Passo 3 â€” ConferÃªncia de Cofre & Recolhimento do Daniel (`Step3CashVaultDaniel.tsx`):**
  - Pergunta operacional: *"O Daniel recolheu dinheiro no cofre de alguma filial hoje?"*.
  - Tabela dos 10 cofres com saldos em tempo real e lanÃ§amento do valor recolhido por filial com baixa automÃ¡tica em `store_cash_vault` (`status: 'depositado'`).
- **Passo 4 â€” Auditoria Final & Fechamento (`Step4FinalAuditAndClose.tsx`):**
  - ExibiÃ§Ã£o dos 5 pilares contÃ¡beis calculados em tempo real via PostgreSQL RPC `get_daily_reconciliation_summary`.
  - BotÃ£o de reconciliaÃ§Ã£o assistida padronizado estritamente para o modelo canÃ´nico `gemini-3.5-flash-lite`.
  - SemÃ¡foro de tolerÃ¢ncia ($\pm	ext{R\$}~50$) e gravaÃ§Ã£o de snapshot imutÃ¡vel em `daily_snapshots`.
- **Orquestrador Central (`UnifiedReconciliationWizard.tsx` & `useReconciliationWizardState.ts`):**
  - Stepper visual Dark UI Zinc-950 integrado na rota `/importacoes?tab=diario` com auto-save no `localStorage`.

## [2026-08-27] â€” Feature 308: PadronizaÃ§Ã£o do Modal de OSs do PÃ¡tio, Painel Executivo da Filial e Abas
- **Modal de OSs do PÃ¡tio (`src/components/conciliacao/PatioOsDetailModal.tsx`):**
  - Implementados 4 Summary Cards canÃ´nicos com borda lateral esquerda grossa (`border-l-4`), `<AmountCell>` em fonte mono tabular e tipografia corporativa.
  - Toolbar de busca e seleÃ§Ã£o de filiais padronizada com a paleta `bg-[var(--bg-surface)]` e `border-[var(--border-subtle)]`.
  - Tabela encapsulada em `<Card className="p-0 overflow-hidden">` com cabeÃ§alho tabular `bg-[var(--bg-surface-elevated)]`, `<AmountCell>` alinhado Ã  direita e `<Badge variant="..." dot>` para status contÃ¡bil.
- **VisÃ£o da Filial (`src/routes/conciliacao.$lojaId.tsx`):**
  - Incorporado o painel executivo com as 6 mÃ©tricas contÃ¡beis consolidadas (`SALDO TOTAL`, `Maquininha`, `PIX`, `Na Loja OS`, `Previsto`, `DiferenÃ§a`), consumindo 100% diretamente da RPC `get_daily_reconciliation_summary` do PostgreSQL (zero cÃ¡lculos no frontend).
  - Abas internas (`TabBtn`) padronizadas para o estilo canÃ´nico plano 1:1 com `src/routes/patio.tsx` (`border-b-2 border-emerald-500 text-white font-semibold` na aba ativa), com remoÃ§Ã£o total do fundo esverdeado (`bg-emerald-500/5`).
- **HarmonizaÃ§Ã£o da Aba 3 (`src/components/conciliacao/StoreOrdensServicoView.tsx`):**
  - Promovidos os 4 cards da aba para o padrÃ£o canÃ´nico `border-l-4` com `<AmountCell>`.
- **Backend & RPCs PostgreSQL:**
  - Corrigida referÃªncia de coluna `payment_methods` para `payment_method` em `calculate_daily_conciliation`.
  - Adicionado overload em PostgreSQL para `get_daily_reconciliation_summary(p_date date)` delegando para `p_target_date`, eliminando o erro `PGRST202 (404 Not Found in schema cache)`.

## [2026-08-27] â€” Feature 303: CorreÃ§Ã£o do Card de Faturamento do Dia (Hoje - Ontem)
- **Migration PostgreSQL (`20260827000003_segregate_positive_and_negative_bank_balances.sql`):** Ramal 1 atualizado para buscar `faturamento_anterior` do snapshot fechado anterior e calcular `v_faturamento_oi_base = v_snapshot.faturamento - v_faturamento_anterior`, retornando `faturamento_periodo = 23792.80` e `faturamento_anterior = 867870.82`.
- **Frontend (`src/components/conciliacao/ResumoDiaPanel.tsx`):** Card "Faturamento do Dia" exibe o valor do prÃ³prio dia (`R$ 23.792,80`). Durante a ediÃ§Ã£o do odÃ´metro acumulado, helper em tempo real exibe `Dia: R$ ...` e `Ant: R$ ...`.
- **Snapshot Data Hotfix (27/08):** `metadata.faturamento_oi_base = 23792.80`, `metadata.faturamento_periodo = 23792.80`, `metadata.faturamento_anterior = 867870.82`, `metadata.valor_disp_contas = 11679.84`.

## [2026-08-27] â€” Feature 302: CorreÃ§Ã£o do Saldo Bancos, Caixa Atual e EliminaÃ§Ã£o do Bug de AcumulaÃ§Ã£o ao Salvar
- **Migration PostgreSQL (update `20260827000003_segregate_positive_and_negative_bank_balances.sql`):** Ramal 1 (dia fechado) passou a recalcular `saldo_bancos_positivo` e `saldo_negativo_itau` diretamente dos `reconciliations` (DISTINCT ON store_id, date <= target_date) em vez de usar `daily_snapshots.saldo_bancario` (que estava inflado). Campos de fechamento como `caixa_atual`, `dinheiro_mp`, `a_receber_manual`, `total_patio` e `faturamento` continuam vindo do snapshot como autoridade contÃ¡bil.
- **Hotfix de dados (SQL direto):** Snapshot de 27/08 corrigido com `saldo_bancario = 60575.77` (OFX lÃ­quido puro) e `caixa_atual = 163755.56` e metadata reconstruÃ­do com valores auditados dos OFXs brutos.
- **Frontend (`src/components/conciliacao/ResumoDiaPanel.tsx`):**
  - `caixaAtualCalculado` corrigido para subtrair `saldoNegativoItau` (Bug B).
  - `handleSave` corrigido para gravar `saldo_bancario: summary?.saldo_bancos_ofx ?? 0` em vez de `saldoBancosValor` (eliminaÃ§Ã£o do loop de acumulaÃ§Ã£o â€” Bug A).
  - Metadata do snapshot atualizado com campos canÃ´nicos: `saldo_bancos_ofx`, `saldo_bancos_positivo`, `total_saldo_banco`, `devolucoes_rede`.

## [2026-08-27] â€” Feature 301: SegregaÃ§Ã£o de Saldo Negativo (Cheque Especial) e DeduÃ§Ã£o ExplÃ­cita no Caixa Atual
- **Migration PostgreSQL (`20260827000003_segregate_positive_and_negative_bank_balances.sql`):** RPC `get_daily_reconciliation_summary` atualizada com discriminaÃ§Ã£o canÃ´nica de `saldo_bancos_positivo` (contas $\ge 0$) e `saldo_negativo_itau` (contas $< 0$ em mÃ³dulo).
- **Pilar 1 e Card de Bancos (`src/components/conciliacao/ResumoDiaPanel.tsx`):** Valor de destaque exibe o total bruto de ativos disponÃ­veis (Positivos + Cofre + Rede) com pill dedicado em vermelho para contas devedoras (`(-) Cheque Esp.`).
- **Hero Card do Caixa Atual:** DeduÃ§Ã£o explÃ­cita de passivo de cheque especial uma Ãºnica vez no fechamento contÃ¡bil.
- **Modal de Raio-X de Bancos (`src/components/conciliacao/SaldoBancosDetailModal.tsx`):** 5 cards segregados no cabeÃ§alho e tabela com formataÃ§Ã£o diferenciada para filiais com limite negativo.

## [2026-08-27] â€” Feature 300: SimplificaÃ§Ã£o dos Cards de Filiais e ImportaÃ§Ã£o de OS com Nome do Cliente
- **Schema & Migration (`20260827000002_add_client_name_to_patio_os.sql`):** Adicionada coluna `client_name text` em `patio_os` e `estoque_os_pendente` com backfill automÃ¡tico de 347 OSs.
- **Parsers de OS (`src/hooks/useOsImportProcessor.ts` e `src/hooks/useImportProcessor.ts`):** Mapeamento do cabeÃ§alho `Cliente` e persistÃªncia do nome do titular da OS.
- **Cards de Filiais (`src/routes/conciliacao.index.tsx` e `src/routes/conciliacao.$lojaId.tsx`):** Redesenhados com exibiÃ§Ã£o Ãºnica de `SALDO TOTAL` colorido e sem textos poluÃ­dos.
- **Modal de Match Inteligente (`src/components/conciliacao/ManualMatchOsModal.tsx`):** Algoritmo de cruzamento por similaridade textual de nomes entre PIX e OSs.

## Feature 289 â€” DeduplicaÃ§Ã£o CanÃ´nica de Contas (Manual / ImportaÃ§Ã£o)
- **Migration PostgreSQL (`20260826000001_fix_contas_manual_deduplication.sql`):** RPC `get_daily_reconciliation_summary` atualizada para segregar estritamente contas importadas de ERP (`external_code IS NOT NULL`) de despesas manuais avulsas (`external_code IS NULL`).
- **EliminaÃ§Ã£o de Dupla Contagem:** `contas_base` reflete fielmente o lote do `BuscaContasAPagar.xls` e `contas_extras` computa apenas lanÃ§amentos manuais avulsos, garantindo fechamento perfeito em R$ 18.839,83 no dia 26/08.
- **Blindagem de EdiÃ§Ã£o Manual:** `ResumoDiaPanel` e `ContasManualModal` sincronizados para permitir ediÃ§Ã£o manual da base e inclusÃ£o/exclusÃ£o dinÃ¢mica de contas sem distorÃ§Ã£o contÃ¡bil.

## [2026-08-25] â€” Feature 287: Limpeza de Lixo da Raiz, ConfiguraÃ§Ã£o de .graphifyignore e OtimizaÃ§Ã£o do Grafo
- **HigienizaÃ§Ã£o da Raiz:** 96 arquivos descartÃ¡veis (screenshots, dumps de banco, scripts de teste de uso Ãºnico e temporÃ¡rios) removidos.
- **ConfiguraÃ§Ã£o de Ignore:** `.graphifyignore` criado com exclusÃ£o de `specs/archive/**`, `scripts/**`, `dist/**`, `.output/**`, `.tanstack/**`, `scratch/**`, `.council/**`.
- **Grafo Otimizado:** ReduÃ§Ã£o do grafo de 8.168 nÃ³s inflados para 1.305 nÃ³s 100% interconectados em 129 comunidades sem nÃ³s Ã³rfÃ£os residuais.

## [2026-08-25] â€” Feature 286: AutomaÃ§Ã£o de RecebÃ­veis para Boletos e TransferÃªncias com Match OFX
- **UtilitÃ¡rio de CalendÃ¡rio BancÃ¡rio:** `src/lib/bankingCalendar.ts` com cÃ¡lculo determinÃ­stico de feriados nacionais e dias Ãºteis (Febraban/BACEN).
- **ExtraÃ§Ã£o AutomÃ¡tica de Formas de Pagamento em OS:** `src/hooks/useOsImportProcessor.ts` com identificaÃ§Ã£o de Boletos (N parcelas), TransferÃªncias BancÃ¡rias (D+1 Ãºtil), DÃ©bito em Conta e Cheques.
- **PersistÃªncia Idempotente de RecebÃ­veis:** `src/hooks/useImportProcessor.ts` salvando `os_number`, `installment`, `description`, `due_date` em `public.receivables`.
- **RPC de Baixa AutomÃ¡tica:** `public.auto_match_receivables(p_store_id text, p_date date)` em `supabase/migrations/20260825000005_receivables_automatch_and_calendar.sql`.
- **Hooks e Interface:** `useAutoMatchReceivables` em `src/hooks/useRecebiveis.ts` e botÃ£o Auto-Match OFX em `src/routes/recebiveis.tsx`.

## [2026-08-25] â€” Feature 285: CorreÃ§Ã£o Definitiva RPC ConciliaÃ§Ã£o e Blindagem de Performance
- **RPC CanÃ´nica:** `public.get_daily_reconciliation_summary(p_date date, p_force_dynamic boolean DEFAULT false)` com bifurcaÃ§Ã£o determinÃ­stica (Ramal 1: snapshots fechados imutÃ¡veis; Ramal 2: cÃ¡lculo dinÃ¢mico com saldo patrimonial real das 10 filiais).
- **RPC RecebÃ­veis:** `public.get_receivables_summary(p_date date)` agregaÃ§Ã£o 100% no PostgreSQL.
- **Ã�ndices de Performance:** 8 Ã­ndices compostos em `ofx_transactions`, `pos_transactions`, `store_cash_vault`, `patio_os`, `daily_manual_bills`.
- **Hooks:** `useDailyReconciliationSummary`, `useReceivablesSummary` em `src/hooks/useBackendConciliacao.ts` e `src/hooks/useRecebiveis.ts`.

# Features e MÃƒÆ’Ã‚Â³dulos Existentes (Mapa Vivo Anti-DuplicaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o)

## ConciliaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o & Fechamento
- **Cards de Fechamento por Loja (`src/routes/conciliacao.index.tsx`):** Exibe 6 colunas por loja: Faturamento, Maquininha, PIX, Na Loja OS, Faturamento ItaÃƒÆ’Ã‚Âº (OFX - Saldo Real) e DiferenÃƒÆ’Ã‚Â§a.
- **Resumo Financeiro Consolidado (`src/components/conciliacao/ResumoDiaPanel.tsx`):** Hero Card ÃƒÆ’Ã‚Âºnico consolidando os saldos da rede, OFX e OSs.
- **Hook `useLatestBankBalance` (`src/hooks/useTransactions.ts`):** Retorna o ÃƒÆ’Ã‚Âºltimo saldo real OFX (`bank_total`) por loja para evitar saldo zerado em dias sem importaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o nova.
- **Hook `useModulo1StoresData` (`src/hooks/useConciliacao.ts`):** Retorna o faturamento real (Maquininha + PIX Casado no banco), entradas de cartÃƒÆ’Ã‚Â£o, PIX vÃƒÆ’Ã‚Â¡lidos com match de OFX, e saldo em aberto real por loja na data.

## InteligÃƒÆ’Ã‚Âªncia Artificial & Telemetria
- **Motor de ConciliaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o Headless (`src/hooks/useBackgroundAiReconciler.ts`):** Dispara automaticamente em background em busca de triplas associaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes (OS / Maquininha / Banco).
- **Gerador de AssociaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes (`src/lib/llm-matcher.ts`):** IntegraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o com Gemini, OpenAI e Claude. Grava logs em `public.ai_execution_logs`.
- **Painel de GestÃƒÆ’Ã‚Â£o & Telemetria (`src/routes/agente.tsx`):** Abas Chat, Provedores & API Keys, Telemetria & Custos (tokens e R$ BRL) e DevTools Inspector JSON com botÃƒÆ’Ã‚Â£o "Executar Teste de IA".
- **Tabela `public.ai_execution_logs`:** Registro imutÃƒÆ’Ã‚Â¡vel de chamadas, tokens, custo estimado, tempo de execuÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o e payloads.
- **Tabela `public.ai_settings`:** ConfiguraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes de provedor, modelo e chave de API por usuÃƒÆ’Ã‚Â¡rio ou `GLOBAL`.
- **ConciliaMec Bot (VPS / Traefik):** ServiÃƒÆ’Ã‚Â§o headless de coleta de relatÃƒÆ’Ã‚Â³rios via Playwright (Oficina Inteligente / Rede), exposto publicamente sob `bot.tork.services` via Cloudflare Tunnel.
- **API `GET /api/os/:id` (Bot VPS):** Endpoint para busca de OS em tempo real via AJAX UpdatePanel direto no sistema legado da Oficina, contornando bloqueios de scraping.
- **PromptInput Minimalista (`src/components/chat/PromptInput.tsx`):** Componente avanÃƒÆ’Ã‚Â§ado com animaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes framer-motion e auto-resize.
- **MessageList (`src/components/chat/MessageList.tsx`):** Exibe execuÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes de MCP logs via um bloco expansÃƒÆ’Ã‚Â­vel `StepAccordion` minimalista com suporte a `aggregateAssistantTurns`.
- **Tool Edge Function (`supabase/functions/ai-chat/index.ts`):** Possui as ferramentas locais `consulta_resumo_os`, `consulta_saldo_contas`, `consulta_conciliacao_periodo`, `consulta_contas_em_aberto` e as externas `consulta_os_detalhe_completo`, `consulta_contas_pagar_oficina`, `consulta_contas_receber_oficina`.
- **PersistÃƒÆ’Ã‚Âªncia de Retaguarda:** Gravando no evento `onFinish` do `streamText` usando `supabaseAdmin` (`SERVICE_ROLE_KEY`) para garantir persistÃƒÆ’Ã‚Âªncia no Supabase sem depender do cliente.
- **Workspace do Agente de IA (`src/routes/agente.tsx`):** Container SPA com navegaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o fluida em abas (Chat, ConfiguraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes, Custos, Logs) gerenciada por `activeView`, sem reload de rotas globais.
- **PainÃƒÆ’Ã‚Â©is do Workspace (`src/components/agente/*`):** Componentes extraÃƒÆ’Ã‚Â­dos para modularizar a interface, incluindo `CustosPanel`, `ConfiguracoesPanel`, `LogsAgentePanel` e `LogsMotorPanel`.
- **Auto-TitulaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do HistÃƒÆ’Ã‚Â³rico:** Em `src/routes/agente.tsx`, sistema de requisiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o assÃƒÆ’Ã‚Â­ncrona gerando "Smart Titles" em background para nÃƒÆ’Ã‚Â£o travar a UI de chat, incluindo limpeza imediata de histÃƒÆ’Ã‚Â³rico ao alternar conversas.
- **Regras de ProveniÃƒÆ’Ã‚Âªncia & Isolamento (`supabase/functions/ai-chat/index.ts`):** InclusÃƒÆ’Ã‚Â£o da `<regra_proibiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o_alucinaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o_origem>` e isolamento estrito de histÃƒÆ’Ã‚Â³rico por `conversation_id` em `src/routes/agente.tsx`.

## Parsers e ImportaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o
- **NormalizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de Nomes de Loja (`src/lib/parsers/storeMapping.ts`):** DicionÃƒÆ’Ã‚Â¡rio utilitÃƒÆ’Ã‚Â¡rio que padroniza lojas inconsistentes (Maquininha/Juros) usando keys normalizadas em lowercase e mapeamento explÃƒÆ’Ã‚Â­cito, protegendo contra hard-ignores destrutivos.
- **IdempotÃƒÆ’Ã‚Âªncia de Maquininha (`src/components/importacoes/CentralImportWizard.tsx`):** GeraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de `fitid` sintÃƒÆ’Ã‚Â©tico determinÃƒÆ’Ã‚Â­stico (`source_store_date_amount_method`) para transaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes Rede/Taxas/Maquininha, prevenindo duplicaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o em mÃƒÆ’Ã‚Âºltiplas importaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes do mesmo Excel via onConflict nativo.

- **[Backend] Edge Function sync-oficina**: Motor de sincronizaÃƒÂ§ÃƒÂ£o que puxa listas de Contas a Pagar e OSs de forma assÃƒÂ­ncrona do bot.
- **[Backend] Tabelas de Cache de IA**: oficina_contas e oficina_os_cache. Essenciais para o funcionamento condicional (live vs cache) da ferramenta do Agente AI para evitar timeouts no Playwright.

- **[Frontend] Telemetria HÃƒÂ­brida**: PainÃƒÂ©is \LogsAgentePanel\ (lendo da tabela \mcp_logs\) e \CacheAgentePanel\ para inspecionar cache nativo das Ordens de ServiÃƒÂ§o diretamente pela UI do Agente.
- **[Backend] AutomaÃƒÂ§ÃƒÂ£o Postgres Cron**: Migration com pg_cron e pg_net para acionar HTTP hooks em background.

## Dashboard Executivo (Fintech V5)
- **Hook Central de KPIs (`src/hooks/useDashboardV2.ts`):** Pivotado para ancorar datas e o faturamento base na tabela `import_logs` (jÃƒÂ¡ que a importaÃƒÂ§ÃƒÂ£o parou de gravar `os_total` em `reconciliations`).
- **Data Augmentation:** Puxa e soma dados manuais globais (`daily_snapshots`) como *Dinheiro MP*, *Faturamento Outros* e *A Receber Manual*.
- **Contas via OFX:** Elimina o uso da API legada (`oficina_contas`) e extrai as "Contas (OFX)" filtrando `amount < 0` e `type = 'out'` diretamente da tabela `transactions` para aquele fechamento.
- **Tabela de Lojas (`src/components/dashboard/StoreTableDashboard.tsx`):** Exibe colunas de saldo, faturamento e a nova coluna `Contas (OFX)` por loja, usando dados extraÃƒÂ­dos do extrato bancÃƒÂ¡rio puro.
- **`KpiCard` GenÃƒÂ©rico (`src/components/dashboard/KpiCard.tsx`):** Componente base de UI para mÃƒÂ©tricas com animaÃƒÂ§ÃƒÂµes, formataÃƒÂ§ÃƒÂ£o inteligente e tooltips.
- **Tabela de Lojas (`src/components/dashboard/StoreTableDashboard.tsx`):** VisÃƒÂ£o base do dashboard condensando status, saldo real, contas e pÃƒÂ¡tio por loja (com dados empilhados para nÃƒÂ£o espremer layout). Possui `<tfoot>` nativo para Totalizadores da rede.
- **Faturamento vs Contas Chart (`src/components/dashboard/FaturamentoVsContasChart.tsx`):** GrÃƒÂ¡fico de barras horizontal responsivo usando Recharts.
- **EvoluÃƒÂ§ÃƒÂ£o do Saldo Global (`src/components/dashboard/EvolucaoSaldoChart.tsx`):** GrÃƒÂ¡fico de ÃƒÂ¡rea preenchida (`AreaChart`) ilustrando o histÃƒÂ³rico do saldo total (bank_total) nos ÃƒÂºltimos 15 dias para leitura executiva da saÃƒÂºde financeira.
- **HistÃƒÂ³rico de TransaÃƒÂ§ÃƒÂµes por Loja (`src/routes/loja.$lojaId.tsx`):** Exibe a lista completa de transaÃƒÂ§ÃƒÂµes da loja (OFX e sistema) em um layout de tabela clÃƒÂ¡ssica e compacta (Data, Tipo, DescriÃƒÂ§ÃƒÂ£o, Valor), em substituiÃƒÂ§ÃƒÂ£o aos blocos de card.
- **Limite de Conta (OFX):** Extrai dinamicamente as tags `<OVERDRAFTLIMIT>` ou `<CREDITLIMIT>` no parser `ofxParser.ts` e atualiza `account_limit` da tabela `stores` automaticamente na importaÃƒÂ§ÃƒÂ£o.

- **AutomaÃ§Ã£o ContÃ¡bil OFX (Agosto 2026)**: 'Contas a Pagar' e 'Outros Faturamentos' sÃ£o calculados dinamicamente via useConciliacaoResumo (	otalOfxOut e deduÃ§Ãµes de 	otalOfxIn vs 	otalPixOs) em ResumoDiaPanel.tsx. NÃ£o existem mais campos manuais para esses valores na ImportaÃ§Ã£o.

- **HeranÃ§a de PÃ¡tio Pendente (Agosto 2026)**: A mÃ©trica 'Na Loja OS' no fechamento diÃ¡rio agora usa uma estratÃ©gia de carry-over (useModulo1StoresData), varrendo os Ãºltimos 30 dias para herdar a dÃ­vida legada caso nÃ£o haja snapshot gravado para o dia corrente.

- **RefatoraÃ§Ã£o MatemÃ¡tica Bruto/LÃ­quido (Agosto 2026)**: A conciliaÃ§Ã£o distingue Venda Bruta (OS e Maquininha na data) de Pagamento LÃ­quido (OFX na data de liquidaÃ§Ã£o). O parser da Rede salva `gross_amount` e `fee_amount` na tabela `transactions`, e a UI `ResumoDiaPanel.tsx` exibe as "Taxas/Juros" subtraÃ­das dinamicamente para evitar falsas divergÃªncias.

- **DeduplicaÃ§Ã£o de OFX Ignorando Conflitos (Agosto 2026)**: O hook `useBulkInsertTransactions` utiliza o mÃ©todo de Upsert nativo com `ignoreDuplicates: true` para ignorar silenciosamente transaÃ§Ãµes OFX de outros dias presentes no lote corrente, evitando o erro de constraint `transactions_store_fitid_key`.
  
- **Mï¿½dulo**: Logger (Trace Log Json) (src/lib/logger.ts) - Implementado na Spec 101 

- **Advanced Trace Logging (Spec 102)**: Propagaï¿½ï¿½o de sessionId pelo useCentralImport.ts e emissï¿½o de array JSON completo para cada parser (ofxParser, redeParser, useOsImportProcessor, maquininha) para viabilizar debug 100% acurado no DevTools.
# #   D e v   A u t o - I m p o r t   ( F e a t u r e   1 0 5 ) 
 -   * * S c r i p t * * :   s c r i p t s / g e n e r a t e - m o c k s . m j s   ( C o n v e r t e   e x t r a t o s   e m   B a s e 6 4   p a r a   b y p a s s a r   s e g u r a n a   d o   n a v e g a d o r   v i a   V i t e ) . 
 -   * * M a p e a m e n t o   d e   L o j a s   ( R e s i l i n c i a ) * * :   u s e U n i f i e d S t o r e M a p p i n g   s a l v a   o   s l u g   n o r m a l i z a d o   d a   l o j a   n o   l o c a l S t o r a g e   e m   v e z   d o   U U I D   q u e b r a d o ,   r e c a r r e g a n d o   a u t o m a t i c a m e n t e   a p s   r e s e t a r   o   b a n c o . 
 
 - **[Backend] Performance Fixes (Specs 112-114):** A RPC `calculate_daily_conciliation` agora processa toda a matemÃ¡tica consolidada da Dashboard diretamente no PostgreSQL. Protegida contra falhas de digitaÃ§Ã£o e schema (removido parsed_pix_transfer e payment_methods).
-   * * [ B a c k e n d   e   F r o n t e n d ]   F l u x o   d e   C a i x a   e   V a l o r   C o n t a s   ( S p e c   1 4 1 ) : * *   C o r r e c a o   d a   m a t e m a t i c a   n o   g e t _ d a s h b o a r d _ m e t r i c s   p a r a   u s a r   C a i x a   A t u a l   -   C a i x a   A n t e r i o r ,   e   n o v o   h o o k   u s e G l o b a l O f x O u t   n o   R e a c t   p a r a   g a r a n t i r   a   i n c l u s a o   d e   s a i d a s   O F X   n o   s o m a t o r i o   g l o b a l   d e   d e s p e s a s . 
 
   
- [146] [2026-08-07] Restauraï¿½ï¿½o de import_logs, tipagem de get_store_financial_stats para text, e view transactions baseada em target_date 
- **Feature 147 (Conciliacao):** Navegacao estrita de datas (bloqueio de dias vazios) usando o novo hook useAvailableConciliacaoDates (src/hooks/useDailySnapshot.ts). 

- **ImportSourceBadges (149-conciliation-details)**: Modal de raio-x de lotes na conciliaï¿½ï¿½o que exibe RawOsTable, RawRedeTable e RawOfxTable (src/components/conciliacao/)
- **useRawImportData (149-conciliation-details)**: Hook para buscar dados limpos vindos das novas RPCs get_raw_os_data, get_raw_rede_data, get_raw_ofx_data (src/hooks/)
- **get_raw_os_data(text, date) (150-fix)**: RPC corrigida ï¿½ p_store_id agora text, filtro por opened_at::date
- **get_raw_rede_data(text, date) (150-fix)**: RPC corrigida ï¿½ p_store_id text, filtro target_date, novos campos machine_name/payment_method/occurred_at
- **get_raw_ofx_data(text, date) (150-fix)**: RPC corrigida ï¿½ p_store_id text, filtro target_date, cast p_store_id::uuid para stores.id
  
### Marco Zero Global e Auditoria (11/08/2026)  
- **MarcoZeroWizard.tsx**: Modificado para parsear todas as abas dinamicamente da planilha e renderizar cards de visualizaï¿½ï¿½o para cada uma, suportando multiplas inserï¿½ï¿½es.  
- **AuditoriaPassivoWizard.tsx**: Novo wizard estilo checklist para aprovaï¿½ï¿½o/baixa manual das OSs que estï¿½o em estoque_os_pendente com status PENDENTE. Foi inserido em CentralImportWizard (passo 2.5).  
- **marcoZeroParser.ts**: Modificado para extrair MarcoZeroExtraction[] iterando sobre todas as SheetNames do workbook xlsx. 
  
- **LegacyOsTable** (src/components/conciliacao/LegacyOsTable.tsx): Tabela dedicada para gestï¿½o e liquidaï¿½ï¿½o em lote de OSs legadas do Marco Zero.  
- **liquidate_legacy_os** (Supabase RPC): Baixa atï¿½mica de OSs legadas alterando status para pago e integrando com o contador de pendï¿½ncias na loja. 
- **roundCurrency** (src/lib/parsers/numberUtils.ts): Utilitï¿½rio central de alta precisï¿½o (Math.round((val + Number.EPSILON) * 100) / 100) para sanitizar IEEE 754. 

- **Desacoplamento Marco Zero e CorreÃ§Ã£o Na Loja OS (195):** RPCs `get_dashboard_metrics` e `calculate_daily_conciliation` refatoradas na migration `20260814000000_decouple_marco_zero.sql` para isolar a mÃ©trica "Na Loja OS" de `estoque_os_pendente`, garantindo que o card reflita 100% o pÃ¡tio diÃ¡rio real e zere ao acionar o botÃ£o de limpeza.
## Feature 240: SegregaÃ§Ã£o de DevoluÃ§Ãµes Rede (Pilar 5) & Ã‚ncora Temporal de OS PÃ¡tio
- **Tratamento ContÃ¡bil de DevoluÃ§Ãµes da Maquininha Rede:**
  - Adicionada coluna `transaction_type text NOT NULL DEFAULT 'venda' CHECK (transaction_type IN ('venda', 'devolucao'))` Ã  tabela `pos_transactions`.
  - Estornos, cancelamentos e devoluÃ§Ãµes da Rede agora sÃ£o expurgados do saldo de vendas a compensar do Pilar 1 e computados obrigatoriamente como obrigaÃ§Ãµes financeiras (Conta a Pagar) somadas em `v_subtotal_contas` no Pilar 5.
  - Sub-linha `DevoluÃ§Ãµes REDE: - R$ X` no Pilar 5 do `ResumoDiaPanel.tsx` e 5Âº KPI card `DevoluÃ§Ãµes / Estornos` em `MaquininhasDetailModal.tsx`.
- **Janela Temporal e Isolamento Retroativo no PÃ¡tio (`patio_os`):**
  - Adicionada coluna `last_payment_date date` em `patio_os` com Ã­ndice `idx_patio_os_last_payment_date`.
  - `savePatioOsAndReceivables` registra a data do pagamento no momento do input.
  - As RPCs `get_daily_reconciliation_summary` e `get_store_pos_triple_reconciliation` avaliam `effective_paid_value` respeitando a data consultada (`last_payment_date <= p_date`), impedindo vazamento de pagamentos futuros para conciliaÃ§Ãµes de dias passados.
- **Parsers & Importadores:**
  - `redeParser.ts` e `useTransactions.ts` detectam devoluÃ§Ãµes automaticamente por valor negativo (`net_amount < 0`) e por texto de estorno/cancelamento.

## Feature 241: RestauraÃ§Ã£o do Layout ClÃ¡ssico e Tokens Originais dos Cards de Lojas e Resumo do Dia
- **Restabelecimento do Design System em `ResumoDiaPanel.tsx`:**
  - Retorno ao padrÃ£o estÃ©tico com gradiente de cabeÃ§alho `from-[var(--bg-surface)] to-[var(--bg-surface-elevated)]` e tokens nativos do design system (`var(--bg-surface-elevated)`, `var(--border-subtle)`).
  - 5 Pilares organizados em `grid grid-cols-2 md:grid-cols-5 gap-4` com cores caracterÃ­sticas e whisper dots.
  - Cockpit de 2 colunas: ConsolidaÃ§Ã£o do Dia (Esquerda) e DiferenÃ§a Final destacada com tolerÃ¢ncia Â± R$ 50 (Direita).
  - Preservadas as devoluÃ§Ãµes da Rede no Pilar 5 e no subtotal de contas da Spec 240.
- **RestauraÃ§Ã£o dos Cards Horizontais de Filiais em `conciliacao.index.tsx`:**
  - Layout horizontal em nÃ­vel Ãºnico: Barra vertical de conformidade `w-2 h-14 rounded-full`, Nome da loja, badges de compensaÃ§Ã£o (`ENTROU` / `NÃƒO ENTROU`) e ID.
  - Envelope contÃ­nuo `bg-black/25 p-4 sm:p-5 rounded-2xl border border-white/5 flex-1` alinhando as 6 mÃ©tricas em grid de 6 colunas (`Saldo Bancos + CartÃµes`, `Maquininha`, `PIX`, `Na Loja OS`, `Previsto`, `DiferenÃ§a`).
  - BotÃ£o Raio-X flutuante no topo direito do card com revelaÃ§Ã£o suave no hover.

## Motor de ConciliaÃ§Ã£o AutÃ´noma Zero-Touch & Auto-Healing (Spec 258)
- **RPC `run_autonomous_reconciliation_loop` (`supabase/migrations/20260821000007_autonomous_reconciliation_engine.sql`):** Executa loop pericial de auto-cura no fechamento diÃ¡rio, buscando correspondÃªncias de cofre, ancoragem de datas, identificaÃ§Ã£o de aportes intercompany de sÃ³cios nos extratos OFX e balanceamento de contrapartidas de despesa.
- **Tabela `public.reconciliation_audit_logs`:** Armazena logs de auditoria pericial, deltas (inicial e final), contagem de iteraÃ§Ãµes e etapas executadas.
- **Hook `useAutonomousReconciliation` (`src/hooks/useAutonomousReconciliation.ts`):** Invoca o motor autÃ´nomo via RPC e invalida as queries de conciliaÃ§Ã£o.
- **EstÃ¡gio 5 de Auto-Healing no Wizard (`src/components/importacoes/CentralImportWizard.tsx`):** Executa a conciliaÃ§Ã£o autÃ´noma diretamente na esteira de importaÃ§Ã£o e renderiza o laudo pericial de auto-cura no modal final de conclusÃ£o.

## ImportaÃ§Ã£o AnalÃ­tica de Contas a Pagar & Cruzamento Triangular (Spec 256)
- **Parser de Contas a Pagar (`src/lib/parsers/contasPagarParser.ts`):** ExtraÃ§Ã£o de arquivos `BuscaContasAPagar.xls` do ERP Oficina Inteligente, mapeamento das 10 filiais pela coluna `Emp`, categorizaÃ§Ã£o inteligente e extraÃ§Ã£o de OS em recibos de Uber.
- **Hook `useContasAPagarImport` (`src/hooks/useContasAPagarImport.ts`):** GravaÃ§Ã£o e persistÃªncia de contas em chunks de 100 linhas na tabela `daily_manual_bills` e log em `accounts_payable_imports`.
- **Hook & Modal de Entidades (`src/hooks/useIntercompanyEntities.ts` e `src/components/configuracoes/IntercompanyEntitiesModal.tsx`):** Cadastro e gerenciamento de SÃ³cios, Chaves PIX e Regras de ClassificaÃ§Ã£o de Fornecedores.
- **Modal AnalÃ­tico de Contas (`src/components/conciliacao/ContasManualModal.tsx`):** Tabela analÃ­tica com busca, filtros por filial/categoria, reclassificaÃ§Ã£o rÃ¡pida de categoria e badges intercompany.
- **Tabelas Supabase (`supabase/migrations/20260821000008_accounts_payable_support.sql`):** `public.intercompany_entities`, `public.expense_category_rules`, `public.accounts_payable_imports` e colunas estendidas em `daily_manual_bills`.

## ExclusÃ£o CirÃºrgica por Data & CorreÃ§Ã£o do BotÃ£o de Excluir Imports (Spec 259)
- **RPC `purge_daily_financial_data` (`supabase/migrations/20260821000009_purge_daily_financial_data.sql`):** ExclusÃ£o transacional atÃ´mica de todos os registros de conciliaÃ§Ã£o por data especÃ­fica (`p_date DATE`), direcionada Ã s tabelas base (`manual_transactions`, `pos_transactions`, `ofx_transactions`, `daily_snapshots`, `reconciliations`, `conciliation_matches`, `daily_manual_bills`, `daily_revenue_adjustments`, `store_cash_vault`, `accounts_payable_imports` e `import_logs`).
- **Hook `usePurgeDailyData` (`src/hooks/usePurgeDailyData.ts`):** Hook React Query para executar a exclusÃ£o cirÃºrgica de um dia selecionado e invalidar todos os caches locais.
- **Modal de Reset DiÃ¡rio (`src/components/importacoes/PurgeDailyModal.tsx`):** Interface com seletor de data, aviso de escopo e botÃ£o de confirmaÃ§Ã£o.
- **Header de ImportaÃ§Ãµes Atualizado (`src/routes/importacoes.tsx`):** BotÃ£o "Resetar Dados do Dia" e eliminaÃ§Ã£o de `alert()` nativo em favor de notificaÃ§Ãµes `Sonner toast`.
- **Ponto de Retorno / Checkpoint (`scratch/checkpoint_day_21_20260821.json` e `scratch/restore_checkpoint_day_21.cjs`):** Mecanismo de backup completo e restauraÃ§Ã£o em 1 comando para testes periciais do dia 21.

## AtualizaÃ§Ã£o de OSs Pendentes, ConciliaÃ§Ã£o de Ã“rfÃ£s & Auto-Preenchimento de Contas (Spec 260)
- **RPC `auto_match_transactions` (`supabase/migrations/20260821000010_auto_match_pending_os.sql`):** Motor de pareamento inteligente por filial (`store_id`) que busca OSs em aberto (`em_aberto`, `pago_parcial`) por correspondÃªncia com Saldo Pendente (`total_value - paid_value`), PIX ou Valor Total. Quita a OS (`status = finalizado`, `closed_at = p_date`), atualiza `paid_value`, vincula a transaÃ§Ã£o OFX (`matched_os_number`) e gera os registros em `conciliation_matches`. Suporta tambÃ©m pareamento de crÃ©ditos com lotes de cartÃ£o da Rede.
- **Auto-Preenchimento de Contas a Pagar (`CentralImportWizard.tsx`):** SincronizaÃ§Ã£o automÃ¡tica do valor analÃ­tico de contas a pagar no formulÃ¡rio de valores manuais com badge de confirmaÃ§Ã£o visual.
- **Visibilidade de Estoque em PÃ¡tio (`CentralImportWizard.tsx`):** ExibiÃ§Ã£o do Delta de recebimentos do dia e do total ativo em pÃ¡tio por filial.

### Feature 290: Extrato BancÃ¡rio Completo por Filial com Entradas, SaÃ­das, Filtros e Fuzzy Match de Despesas
- **Status:** `CONCLUÃ�DO / ARQUIVADO`
- **Data:** 26/08/2026
- **Componentes:**
  - `src/components/conciliacao/StoreExtratoBancarioView.tsx` (VisÃ£o completa de extrato com entradas, saÃ­das, 4 KPI cards e filtros)
  - `src/lib/expenseMatcher.ts` (Motor de fuzzy auto-match de dÃ©bitos OFX com contas a pagar)
- **Hooks:**
  - `useTransactionsPorDataELoja` em `src/hooks/useTransactions.ts` (ordenado por `occurred_at`)
  - `useStoreDailyBills` em `src/hooks/useTransactions.ts` (consulta `daily_manual_bills`)

### Feature 291: PreservaÃ§Ã£o Total de TransaÃ§Ãµes OFX e HeranÃ§a de ConciliaÃ§Ãµes Anteriores/Posteriores
- **Status:** `CONCLUÃ�DO / ARQUIVADO`
- **Data:** 26/08/2026
- **Componentes:**
  - `src/components/conciliacao/StoreExtratoBancarioView.tsx` (HeranÃ§a de histÃ³rico, badge de lock ðŸ”’, trava de ediÃ§Ã£o e filtro de outras conciliaÃ§Ãµes)
- **Hooks:**
  - `useHistoricalReconciledTransactions` em `src/hooks/useTransactions.ts` (busca transaÃ§Ãµes justificadas de outras datas para enriquecimento)

### Spec 292 â€” Desacoplamento Temporal da Rede, Blindagem do Motor de ConciliaÃ§Ã£o e Extrato Otimizado (2026-08-26)
- **RPCs:** `get_store_pos_triple_reconciliation`, `get_daily_reconciliation_summary` unificada e universal (sem hardcodes).
- **Frontend:** `StoreExtratoBancarioView.tsx` com badges compactos `h-5`, saÃ­das sem justificativa e crÃ©ditos de lote com bloqueio seguro de vÃ­nculo de OS.
- **Hooks:** `useAiSettings.ts` e `useTransactions.ts` blindados com zero erros 400 e cache de 5-10 minutos.

### Spec 293 â€” EliminaÃ§Ã£o Definitiva de Sobrecargas de RPC (PGRST203) e RestauraÃ§Ã£o Integral do Painel (2026-08-26)
- **RPCs Desambiguadas (PostgREST Single Canonical Signature):**
  - `get_daily_reconciliation_summary(p_date text, p_force_dynamic boolean DEFAULT false)`
  - `get_store_pos_triple_reconciliation(p_target_date text)`

### Spec 296 â€” ResoluÃ§Ã£o de PGRST303 e Blindagem de AI Settings (2026-08-26)
- **Leitura PÃºblica de Lojas:** RLS da tabela `stores` atualizada para leitura irrestrita (`USING (true)`) e auto-refresh de sessÃ£o no hook `useStores.ts`.
- **Schema AI Settings:** Colunas `provider`, `model`, `api_key` e `user_id` adicionadas com RLS na tabela `ai_settings`.

- **ConsolidaÃ§Ã£o de 25/08 e 26/08:** 25/08 fechado em R$ 141.440,93; 26/08 fechado em R$ 151.642,60.
- **Ancoragem de 27/08:** Caixa anterior limpo em R$ 151.642,60.
- **UI:** BotÃµes explÃ­citos de Salvar e Editar no `ResumoDiaPanel.tsx`.


## Spec 330: Correção de Regressão nas Filiais
- Ajuste nos JOINs de UUID na RPC de summary
- Alteração na definição de 'diferenca' por loja para 'orphans' ao invés de previsto-realizado absoluto (evita pânico em dias sem importação da Rede).
- UI bloqueia fallbacks de '0' e renderiza N/D quando há quebra de infraestrutura (isMissingData).


### [2026-09-01] 331-fix-nulls-and-revert-diferenca
**Status:** âœ… ConcluÃ­do
**Arquivos Modificados:**
- `src/components/importacoes/CentralImportWizard.tsx` (CorreÃ§Ã£o do target_date de fds e fallback de sid pra rede)
- `supabase/migrations/20260901000008_fix_nulls_and_revert_diferenca.sql` (ReversÃ£o DiferenÃ§a e COALESCE em Nulos)
