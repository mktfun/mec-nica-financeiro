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
- **Descrição:** Agregação de dados por loja com CTEs isoladas na RPC `get_daily_reconciliation_summary`, padronização de `store_id` como `TEXT` (Mauá UUID e IDs curtos perfeitamente compatibilizados), cálculo exato da diferença e previsto por filial, componentização modular do card de 6 métricas em Dark UI Zinc-950 e preservação do parâmetro temporal na navegação.

### Feature 322: Idempotência do Motor de Conciliação, Conciliação de Saídas OFX x Contas e Justificativa de Despesas Órfãs
- **Status:** COMPLETED & ARCHIVED
- **Data:** 2026-08-31
- **Arquivos Criados/Modificados:**
  - `supabase/migrations/20260831000008_resolve_orphan_saida_ofx.sql`
  - `src/components/importacoes/wizard/Step2NonRevenueJustifications.tsx`
  - `src/components/importacoes/CentralImportWizard.tsx`
- **Descrição:** Eliminação de dupla execução no wizard de importação, criação de rotina atômica `close_daily_snapshot` para o Step 7, suporte a resolução de saídas órfãs do OFX com abas dedicadas, toggle contábil para compor ou não despesas no DRE e vínculo manual a contas da loja em 1 clique.

## [2026-08-31] — Feature 321: Inversão do Pipeline de Ingestão com Motor Automático + IA e Unificação do Vínculo Manual PIX & REDE
- **Inversão da Esteira no `CentralImportWizard.tsx`:**
  - O botão de confirmação do Preview executa imediatamente a persistência no banco (`patio_os`, `pos_transactions`, `ofx_transactions`, `daily_manual_bills`), as RPCs `auto_match_transactions`, `auto_match_saidas`, `calculate_daily_conciliation` e a auditoria de IA (Gemini).
  - O Step 1 de pagamentos não registrados recebe e exibe apenas as transações que continuaram genuinamente órfãs / sem vínculo.
- **Novas RPCs Atômicas (`20260831000007_create_link_manual_pix_and_rede_rpcs.sql`):**
  - `public.link_manual_pix_to_os`: Vincula atômica e seguramente depósitos PIX a OSs do pátio com isolamento por `store_id`.
  - `public.link_manual_rede_to_os`: Vincula vendas de cartão da Rede a OSs da mesma loja, abatendo saldo sem duplicar faturamento.
  - `public.unlink_manual_os_match`: Desfaz o vínculo restaurando o status da OS e das transações.
- **Unificação do Vínculo Manual (`ManualMatchOsModal.tsx` & `useManualMatch.ts`):**
  - Suporte completo a transações REDE (com NSU, autorização, modalidade) e PIX, com ranking inteligente por Match Score (100, 80, 60) e isolamento por loja.

## [2026-08-31] — Feature 320: Persistência de Contas Manual e Gestão de Despesas End-to-End
- **RPC `public.update_manual_bill` (`20260831000006_fix_contas_manual_override_and_management.sql`):** Atualização atômica de despesas (valor, fornecedor, filial, categoria DRE e toggle contábil).
- **Precedência Canônica de Contas (`get_daily_reconciliation_summary`):** Respeita `daily_snapshots.metadata->>'contas_manual_override'` sem reverter para a soma bruta da planilha.
- **Edição em Tempo Real (`ContasManualModal.tsx` & `ResumoDiaPanel.tsx`):** Botão de edição em cada linha de conta a pagar (`EditBillModal`) e badge `Ajustado` no card de Contas.

## [2026-08-30] — Feature 314: Teste E2E e Fechamento da Conciliação com Arquivos Reais de 27-08
- **Automação Playwright Ponta a Ponta (`scripts/run-e2e-conciliacao-2708.ts`):**
  - Ingestão automatizada de 27 arquivos reais de `C:\Users\admin\Desktop\conciliacao\27-08` (10 relatórios de OS, 10 OFX Itaú, 5 Rede, 1 Contas a Pagar e 1 PDF).
  - Execução sequencial dos 8 steps do Wizard no `localhost:8080/importacoes`:
    - *Step 1:* Upload & parsing paralelo multi-formato.
    - *Step 2:* Mapeamento automático das 10 filiais (OFX, OSs e Rede).
    - *Step 3:* Preview Geral com inserção do Odômetro OI (R$ 891.663,62), Dinheiro MP (R$ 20.225,00) e A Receber (R$ 8.349,67).
    - *Step 4:* Resolução de pagamentos sem lançamento na OS (Tela A).
    - *Step 5:* Classificação contábil de movimentações intercompany com toggle Faturamento vs Apenas Conciliar (Tela B).
    - *Step 6:* Confirmação de integridade física dos 10 cofres das lojas (Tela C).
    - *Step 7:* Validação do semáforo dos 5 Pilares Contábeis (Tela D).
    - *Step 8:* Gravação em lote no PostgreSQL/Supabase com auto-healing.
  - Captura sequencial de 10 screenshots de evidência em `./e2e-results/screenshots/`.
- **Balanço Contábil dos 5 Pilares (27/08/2026):**
  - Saldo Bancos Líquido: R$ 60.575,77 (Positivo R$ 82.615,97 - Cheque Especial R$ 22.040,20).
  - Dinheiro MP: R$ 20.225,00 | A Receber: R$ 8.349,67 | Pátio OS: R$ 65.603,74.
  - Contas a Pagar + Juros Rede: R$ 20.752,83 | Faturamento do Dia: R$ 23.864,38.
  - Diferença Contábil Final: -R$ 0,03 (10 filiais aprovadas com 0 divergência).
### Spec 314 — Auditoria de Integridade de Saldos, Deduplicação OFX Multi-Dias e Ciclo Rede
- **Eliminação de Trigger Destrutiva**: Drop definitivo da trigger update_reconciliation_bank_total e de update_bank_total_from_transactions, garantindo que o saldo patrimonial <LEDGERBAL> do extrato nunca seja sobrescrito por soma de transações.
- **RPC get_store_pos_triple_reconciliation**: Cálculo 100% dinâmico de 
ao_entrou_valor (cartões a compensar) sem hardcodes legados de filiais, apurando GREATEST(0, rede_liquido - ofx_maquininhas).
- **RPC get_dashboard_metrics**: Alinhamento 1:1 com a regra canônica dos 5 Pilares e dedução estrita de Cheque Especial (saldo_negativo_itau).
- **CentralImportWizard.tsx & useTransactions.ts**: Partição temporal estrita por <DTPOSTED> para transações OFX individuais, prevenindo que extratos com dados de 2 dias (D-1 e D) dupliquem depósitos da Rede em uma única data.
- **Frontend & ResumoDiaPanel.tsx**: Eliminação de cálculos paralelos no frontend, delegação total para RPCs e preservação de ank_total no upsert histórico de reconciliações.

﻿## [2026-08-30] — Feature 314: Teste E2E e Fechamento da Conciliação com Arquivos Reais de 27-08
- **Automação Playwright Ponta a Ponta (`scripts/run-e2e-conciliacao-2708.ts`):**
  - Ingestão automatizada de 27 arquivos reais de `C:\Users\admin\Desktop\conciliacao\27-08` (10 relatórios de OS, 10 OFX Itaú, 5 Rede, 1 Contas a Pagar e 1 PDF).
  - Execução sequencial dos 8 steps do Wizard no `localhost:8080/importacoes`:
    - *Step 1:* Upload & parsing paralelo multi-formato.
    - *Step 2:* Mapeamento automático das 10 filiais (OFX, OSs e Rede).
    - *Step 3:* Preview Geral com inserção do Odômetro OI (R$ 891.663,62), Dinheiro MP (R$ 20.225,00) e A Receber (R$ 8.349,67).
    - *Step 4:* Resolução de pagamentos sem lançamento na OS (Tela A).
    - *Step 5:* Classificação contábil de movimentações intercompany com toggle Faturamento vs Apenas Conciliar (Tela B).
    - *Step 6:* Confirmação de integridade física dos 10 cofres das lojas (Tela C).
    - *Step 7:* Validação do semáforo dos 5 Pilares Contábeis (Tela D).
    - *Step 8:* Gravação em lote no PostgreSQL/Supabase com auto-healing.
  - Captura sequencial de 10 screenshots de evidência em `./e2e-results/screenshots/`.
- **Balanço Contábil dos 5 Pilares (27/08/2026):**
  - Saldo Bancos Líquido: R$ 60.575,77 (Positivo R$ 82.615,97 - Cheque Especial R$ 22.040,20).
  - Dinheiro MP: R$ 20.225,00 | A Receber: R$ 8.349,67 | Pátio OS: R$ 65.603,74.
  - Contas a Pagar + Juros Rede: R$ 20.752,83 | Faturamento do Dia: R$ 23.864,38.
  - Diferença Contábil Final: -R$ 0,03 (10 filiais aprovadas com 0 divergência). (feat(314): auditoria de integridade de saldos, deduplicacao ofx multi-dias e ciclo rede)
## [2026-08-27] — Feature 310: Novo Wizard Modular de Ingestão e Conciliação Passo a Passo
- **Fase 0 — Ingestão Global Unificada (`Stage0UnifiedIngestion.tsx`):**
  - Dropzone multi-arquivos para upload simultâneo de OFX (10 filiais Itaú), Vendas da Rede (`.xlsx`), OSs do Pátio e Contas a Pagar (`BuscaContasAPagar.xls`).
  - Inputs manuais de Data de Fechamento e Odômetro preliminar por loja, garantindo processamento e cruzamento em memória antes de abrir as etapas de resolução.
- **Passo 1 — Transações sem Lançamento de Pagamento na OS (`Step1UnregisteredPayments.tsx`):**
  - Identificação de vendas da Rede ou PIX do extrato que não tiveram o pagamento lançado na OS pelo gerente.
  - Vínculo direto de 1 clique à OS da filial com busca rápida no pátio: herança automática e obrigatória do valor e da forma de pagamento da própria transação (`PIX`, `Crédito Visa`, `Débito Elo`), abatimento do saldo em aberto do Pátio (`NA LOJA OS`) e gravação atômica em `patio_os` e `conciliation_matches`.
- **Passo 2 — Justificativas de Não-Faturamento (`Step2NonRevenueJustifications.tsx`):**
  - Classificação contábil por loja de movimentações que não são vendas de serviços da oficina (Aportes, Transferências entre filiais, Estornos, Tarifas).
  - Total liberdade para o operador editar ou cancelar as justificativas a qualquer momento antes do fechamento definitivo.
- **Passo 3 — Conferência de Cofre & Recolhimento do Daniel (`Step3CashVaultDaniel.tsx`):**
  - Pergunta operacional: *"O Daniel recolheu dinheiro no cofre de alguma filial hoje?"*.
  - Tabela dos 10 cofres com saldos em tempo real e lançamento do valor recolhido por filial com baixa automática em `store_cash_vault` (`status: 'depositado'`).
- **Passo 4 — Auditoria Final & Fechamento (`Step4FinalAuditAndClose.tsx`):**
  - Exibição dos 5 pilares contábeis calculados em tempo real via PostgreSQL RPC `get_daily_reconciliation_summary`.
  - Botão de reconciliação assistida padronizado estritamente para o modelo canônico `gemini-3.5-flash-lite`.
  - Semáforo de tolerância ($\pm	ext{R\$}~50$) e gravação de snapshot imutável em `daily_snapshots`.
- **Orquestrador Central (`UnifiedReconciliationWizard.tsx` & `useReconciliationWizardState.ts`):**
  - Stepper visual Dark UI Zinc-950 integrado na rota `/importacoes?tab=diario` com auto-save no `localStorage`.

## [2026-08-27] — Feature 308: Padronização do Modal de OSs do Pátio, Painel Executivo da Filial e Abas
- **Modal de OSs do Pátio (`src/components/conciliacao/PatioOsDetailModal.tsx`):**
  - Implementados 4 Summary Cards canônicos com borda lateral esquerda grossa (`border-l-4`), `<AmountCell>` em fonte mono tabular e tipografia corporativa.
  - Toolbar de busca e seleção de filiais padronizada com a paleta `bg-[var(--bg-surface)]` e `border-[var(--border-subtle)]`.
  - Tabela encapsulada em `<Card className="p-0 overflow-hidden">` com cabeçalho tabular `bg-[var(--bg-surface-elevated)]`, `<AmountCell>` alinhado à direita e `<Badge variant="..." dot>` para status contábil.
- **Visão da Filial (`src/routes/conciliacao.$lojaId.tsx`):**
  - Incorporado o painel executivo com as 6 métricas contábeis consolidadas (`SALDO TOTAL`, `Maquininha`, `PIX`, `Na Loja OS`, `Previsto`, `Diferença`), consumindo 100% diretamente da RPC `get_daily_reconciliation_summary` do PostgreSQL (zero cálculos no frontend).
  - Abas internas (`TabBtn`) padronizadas para o estilo canônico plano 1:1 com `src/routes/patio.tsx` (`border-b-2 border-emerald-500 text-white font-semibold` na aba ativa), com remoção total do fundo esverdeado (`bg-emerald-500/5`).
- **Harmonização da Aba 3 (`src/components/conciliacao/StoreOrdensServicoView.tsx`):**
  - Promovidos os 4 cards da aba para o padrão canônico `border-l-4` com `<AmountCell>`.
- **Backend & RPCs PostgreSQL:**
  - Corrigida referência de coluna `payment_methods` para `payment_method` em `calculate_daily_conciliation`.
  - Adicionado overload em PostgreSQL para `get_daily_reconciliation_summary(p_date date)` delegando para `p_target_date`, eliminando o erro `PGRST202 (404 Not Found in schema cache)`.

## [2026-08-27] — Feature 303: Correção do Card de Faturamento do Dia (Hoje - Ontem)
- **Migration PostgreSQL (`20260827000003_segregate_positive_and_negative_bank_balances.sql`):** Ramal 1 atualizado para buscar `faturamento_anterior` do snapshot fechado anterior e calcular `v_faturamento_oi_base = v_snapshot.faturamento - v_faturamento_anterior`, retornando `faturamento_periodo = 23792.80` e `faturamento_anterior = 867870.82`.
- **Frontend (`src/components/conciliacao/ResumoDiaPanel.tsx`):** Card "Faturamento do Dia" exibe o valor do próprio dia (`R$ 23.792,80`). Durante a edição do odômetro acumulado, helper em tempo real exibe `Dia: R$ ...` e `Ant: R$ ...`.
- **Snapshot Data Hotfix (27/08):** `metadata.faturamento_oi_base = 23792.80`, `metadata.faturamento_periodo = 23792.80`, `metadata.faturamento_anterior = 867870.82`, `metadata.valor_disp_contas = 11679.84`.

## [2026-08-27] — Feature 302: Correção do Saldo Bancos, Caixa Atual e Eliminação do Bug de Acumulação ao Salvar
- **Migration PostgreSQL (update `20260827000003_segregate_positive_and_negative_bank_balances.sql`):** Ramal 1 (dia fechado) passou a recalcular `saldo_bancos_positivo` e `saldo_negativo_itau` diretamente dos `reconciliations` (DISTINCT ON store_id, date <= target_date) em vez de usar `daily_snapshots.saldo_bancario` (que estava inflado). Campos de fechamento como `caixa_atual`, `dinheiro_mp`, `a_receber_manual`, `total_patio` e `faturamento` continuam vindo do snapshot como autoridade contábil.
- **Hotfix de dados (SQL direto):** Snapshot de 27/08 corrigido com `saldo_bancario = 60575.77` (OFX líquido puro) e `caixa_atual = 163755.56` e metadata reconstruído com valores auditados dos OFXs brutos.
- **Frontend (`src/components/conciliacao/ResumoDiaPanel.tsx`):**
  - `caixaAtualCalculado` corrigido para subtrair `saldoNegativoItau` (Bug B).
  - `handleSave` corrigido para gravar `saldo_bancario: summary?.saldo_bancos_ofx ?? 0` em vez de `saldoBancosValor` (eliminação do loop de acumulação — Bug A).
  - Metadata do snapshot atualizado com campos canônicos: `saldo_bancos_ofx`, `saldo_bancos_positivo`, `total_saldo_banco`, `devolucoes_rede`.

## [2026-08-27] — Feature 301: Segregação de Saldo Negativo (Cheque Especial) e Dedução Explícita no Caixa Atual
- **Migration PostgreSQL (`20260827000003_segregate_positive_and_negative_bank_balances.sql`):** RPC `get_daily_reconciliation_summary` atualizada com discriminação canônica de `saldo_bancos_positivo` (contas $\ge 0$) e `saldo_negativo_itau` (contas $< 0$ em módulo).
- **Pilar 1 e Card de Bancos (`src/components/conciliacao/ResumoDiaPanel.tsx`):** Valor de destaque exibe o total bruto de ativos disponíveis (Positivos + Cofre + Rede) com pill dedicado em vermelho para contas devedoras (`(-) Cheque Esp.`).
- **Hero Card do Caixa Atual:** Dedução explícita de passivo de cheque especial uma única vez no fechamento contábil.
- **Modal de Raio-X de Bancos (`src/components/conciliacao/SaldoBancosDetailModal.tsx`):** 5 cards segregados no cabeçalho e tabela com formatação diferenciada para filiais com limite negativo.

## [2026-08-27] — Feature 300: Simplificação dos Cards de Filiais e Importação de OS com Nome do Cliente
- **Schema & Migration (`20260827000002_add_client_name_to_patio_os.sql`):** Adicionada coluna `client_name text` em `patio_os` e `estoque_os_pendente` com backfill automático de 347 OSs.
- **Parsers de OS (`src/hooks/useOsImportProcessor.ts` e `src/hooks/useImportProcessor.ts`):** Mapeamento do cabeçalho `Cliente` e persistência do nome do titular da OS.
- **Cards de Filiais (`src/routes/conciliacao.index.tsx` e `src/routes/conciliacao.$lojaId.tsx`):** Redesenhados com exibição única de `SALDO TOTAL` colorido e sem textos poluídos.
- **Modal de Match Inteligente (`src/components/conciliacao/ManualMatchOsModal.tsx`):** Algoritmo de cruzamento por similaridade textual de nomes entre PIX e OSs.

## Feature 289 — Deduplicação Canônica de Contas (Manual / Importação)
- **Migration PostgreSQL (`20260826000001_fix_contas_manual_deduplication.sql`):** RPC `get_daily_reconciliation_summary` atualizada para segregar estritamente contas importadas de ERP (`external_code IS NOT NULL`) de despesas manuais avulsas (`external_code IS NULL`).
- **Eliminação de Dupla Contagem:** `contas_base` reflete fielmente o lote do `BuscaContasAPagar.xls` e `contas_extras` computa apenas lançamentos manuais avulsos, garantindo fechamento perfeito em R$ 18.839,83 no dia 26/08.
- **Blindagem de Edição Manual:** `ResumoDiaPanel` e `ContasManualModal` sincronizados para permitir edição manual da base e inclusão/exclusão dinâmica de contas sem distorção contábil.

## [2026-08-25] — Feature 287: Limpeza de Lixo da Raiz, Configuração de .graphifyignore e Otimização do Grafo
- **Higienização da Raiz:** 96 arquivos descartáveis (screenshots, dumps de banco, scripts de teste de uso único e temporários) removidos.
- **Configuração de Ignore:** `.graphifyignore` criado com exclusão de `specs/archive/**`, `scripts/**`, `dist/**`, `.output/**`, `.tanstack/**`, `scratch/**`, `.council/**`.
- **Grafo Otimizado:** Redução do grafo de 8.168 nós inflados para 1.305 nós 100% interconectados em 129 comunidades sem nós órfãos residuais.

## [2026-08-25] — Feature 286: Automação de Recebíveis para Boletos e Transferências com Match OFX
- **Utilitário de Calendário Bancário:** `src/lib/bankingCalendar.ts` com cálculo determinístico de feriados nacionais e dias úteis (Febraban/BACEN).
- **Extração Automática de Formas de Pagamento em OS:** `src/hooks/useOsImportProcessor.ts` com identificação de Boletos (N parcelas), Transferências Bancárias (D+1 útil), Débito em Conta e Cheques.
- **Persistência Idempotente de Recebíveis:** `src/hooks/useImportProcessor.ts` salvando `os_number`, `installment`, `description`, `due_date` em `public.receivables`.
- **RPC de Baixa Automática:** `public.auto_match_receivables(p_store_id text, p_date date)` em `supabase/migrations/20260825000005_receivables_automatch_and_calendar.sql`.
- **Hooks e Interface:** `useAutoMatchReceivables` em `src/hooks/useRecebiveis.ts` e botão Auto-Match OFX em `src/routes/recebiveis.tsx`.

## [2026-08-25] — Feature 285: Correção Definitiva RPC Conciliação e Blindagem de Performance
- **RPC Canônica:** `public.get_daily_reconciliation_summary(p_date date, p_force_dynamic boolean DEFAULT false)` com bifurcação determinística (Ramal 1: snapshots fechados imutáveis; Ramal 2: cálculo dinâmico com saldo patrimonial real das 10 filiais).
- **RPC Recebíveis:** `public.get_receivables_summary(p_date date)` agregação 100% no PostgreSQL.
- **Índices de Performance:** 8 índices compostos em `ofx_transactions`, `pos_transactions`, `store_cash_vault`, `patio_os`, `daily_manual_bills`.
- **Hooks:** `useDailyReconciliationSummary`, `useReceivablesSummary` em `src/hooks/useBackendConciliacao.ts` e `src/hooks/useRecebiveis.ts`.

# Features e MÃƒÂ³dulos Existentes (Mapa Vivo Anti-DuplicaÃƒÂ§ÃƒÂ£o)

## ConciliaÃƒÂ§ÃƒÂ£o & Fechamento
- **Cards de Fechamento por Loja (`src/routes/conciliacao.index.tsx`):** Exibe 6 colunas por loja: Faturamento, Maquininha, PIX, Na Loja OS, Faturamento ItaÃƒÂº (OFX - Saldo Real) e DiferenÃƒÂ§a.
- **Resumo Financeiro Consolidado (`src/components/conciliacao/ResumoDiaPanel.tsx`):** Hero Card ÃƒÂºnico consolidando os saldos da rede, OFX e OSs.
- **Hook `useLatestBankBalance` (`src/hooks/useTransactions.ts`):** Retorna o ÃƒÂºltimo saldo real OFX (`bank_total`) por loja para evitar saldo zerado em dias sem importaÃƒÂ§ÃƒÂ£o nova.
- **Hook `useModulo1StoresData` (`src/hooks/useConciliacao.ts`):** Retorna o faturamento real (Maquininha + PIX Casado no banco), entradas de cartÃƒÂ£o, PIX vÃƒÂ¡lidos com match de OFX, e saldo em aberto real por loja na data.

## InteligÃƒÂªncia Artificial & Telemetria
- **Motor de ConciliaÃƒÂ§ÃƒÂ£o Headless (`src/hooks/useBackgroundAiReconciler.ts`):** Dispara automaticamente em background em busca de triplas associaÃƒÂ§ÃƒÂµes (OS / Maquininha / Banco).
- **Gerador de AssociaÃƒÂ§ÃƒÂµes (`src/lib/llm-matcher.ts`):** IntegraÃƒÂ§ÃƒÂ£o com Gemini, OpenAI e Claude. Grava logs em `public.ai_execution_logs`.
- **Painel de GestÃƒÂ£o & Telemetria (`src/routes/agente.tsx`):** Abas Chat, Provedores & API Keys, Telemetria & Custos (tokens e R$ BRL) e DevTools Inspector JSON com botÃƒÂ£o "Executar Teste de IA".
- **Tabela `public.ai_execution_logs`:** Registro imutÃƒÂ¡vel de chamadas, tokens, custo estimado, tempo de execuÃƒÂ§ÃƒÂ£o e payloads.
- **Tabela `public.ai_settings`:** ConfiguraÃƒÂ§ÃƒÂµes de provedor, modelo e chave de API por usuÃƒÂ¡rio ou `GLOBAL`.
- **ConciliaMec Bot (VPS / Traefik):** ServiÃƒÂ§o headless de coleta de relatÃƒÂ³rios via Playwright (Oficina Inteligente / Rede), exposto publicamente sob `bot.tork.services` via Cloudflare Tunnel.
- **API `GET /api/os/:id` (Bot VPS):** Endpoint para busca de OS em tempo real via AJAX UpdatePanel direto no sistema legado da Oficina, contornando bloqueios de scraping.
- **PromptInput Minimalista (`src/components/chat/PromptInput.tsx`):** Componente avanÃƒÂ§ado com animaÃƒÂ§ÃƒÂµes framer-motion e auto-resize.
- **MessageList (`src/components/chat/MessageList.tsx`):** Exibe execuÃƒÂ§ÃƒÂµes de MCP logs via um bloco expansÃƒÂ­vel `StepAccordion` minimalista com suporte a `aggregateAssistantTurns`.
- **Tool Edge Function (`supabase/functions/ai-chat/index.ts`):** Possui as ferramentas locais `consulta_resumo_os`, `consulta_saldo_contas`, `consulta_conciliacao_periodo`, `consulta_contas_em_aberto` e as externas `consulta_os_detalhe_completo`, `consulta_contas_pagar_oficina`, `consulta_contas_receber_oficina`.
- **PersistÃƒÂªncia de Retaguarda:** Gravando no evento `onFinish` do `streamText` usando `supabaseAdmin` (`SERVICE_ROLE_KEY`) para garantir persistÃƒÂªncia no Supabase sem depender do cliente.
- **Workspace do Agente de IA (`src/routes/agente.tsx`):** Container SPA com navegaÃƒÂ§ÃƒÂ£o fluida em abas (Chat, ConfiguraÃƒÂ§ÃƒÂµes, Custos, Logs) gerenciada por `activeView`, sem reload de rotas globais.
- **PainÃƒÂ©is do Workspace (`src/components/agente/*`):** Componentes extraÃƒÂ­dos para modularizar a interface, incluindo `CustosPanel`, `ConfiguracoesPanel`, `LogsAgentePanel` e `LogsMotorPanel`.
- **Auto-TitulaÃƒÂ§ÃƒÂ£o do HistÃƒÂ³rico:** Em `src/routes/agente.tsx`, sistema de requisiÃƒÂ§ÃƒÂ£o assÃƒÂ­ncrona gerando "Smart Titles" em background para nÃƒÂ£o travar a UI de chat, incluindo limpeza imediata de histÃƒÂ³rico ao alternar conversas.
- **Regras de ProveniÃƒÂªncia & Isolamento (`supabase/functions/ai-chat/index.ts`):** InclusÃƒÂ£o da `<regra_proibiÃƒÂ§ÃƒÂ£o_alucinaÃƒÂ§ÃƒÂ£o_origem>` e isolamento estrito de histÃƒÂ³rico por `conversation_id` em `src/routes/agente.tsx`.

## Parsers e ImportaÃƒÂ§ÃƒÂ£o
- **NormalizaÃƒÂ§ÃƒÂ£o de Nomes de Loja (`src/lib/parsers/storeMapping.ts`):** DicionÃƒÂ¡rio utilitÃƒÂ¡rio que padroniza lojas inconsistentes (Maquininha/Juros) usando keys normalizadas em lowercase e mapeamento explÃƒÂ­cito, protegendo contra hard-ignores destrutivos.
- **IdempotÃƒÂªncia de Maquininha (`src/components/importacoes/CentralImportWizard.tsx`):** GeraÃƒÂ§ÃƒÂ£o de `fitid` sintÃƒÂ©tico determinÃƒÂ­stico (`source_store_date_amount_method`) para transaÃƒÂ§ÃƒÂµes Rede/Taxas/Maquininha, prevenindo duplicaÃƒÂ§ÃƒÂ£o em mÃƒÂºltiplas importaÃƒÂ§ÃƒÂµes do mesmo Excel via onConflict nativo.

- **[Backend] Edge Function sync-oficina**: Motor de sincronizaÃ§Ã£o que puxa listas de Contas a Pagar e OSs de forma assÃ­ncrona do bot.
- **[Backend] Tabelas de Cache de IA**: oficina_contas e oficina_os_cache. Essenciais para o funcionamento condicional (live vs cache) da ferramenta do Agente AI para evitar timeouts no Playwright.

- **[Frontend] Telemetria HÃ­brida**: PainÃ©is \LogsAgentePanel\ (lendo da tabela \mcp_logs\) e \CacheAgentePanel\ para inspecionar cache nativo das Ordens de ServiÃ§o diretamente pela UI do Agente.
- **[Backend] AutomaÃ§Ã£o Postgres Cron**: Migration com pg_cron e pg_net para acionar HTTP hooks em background.

## Dashboard Executivo (Fintech V5)
- **Hook Central de KPIs (`src/hooks/useDashboardV2.ts`):** Pivotado para ancorar datas e o faturamento base na tabela `import_logs` (jÃ¡ que a importaÃ§Ã£o parou de gravar `os_total` em `reconciliations`).
- **Data Augmentation:** Puxa e soma dados manuais globais (`daily_snapshots`) como *Dinheiro MP*, *Faturamento Outros* e *A Receber Manual*.
- **Contas via OFX:** Elimina o uso da API legada (`oficina_contas`) e extrai as "Contas (OFX)" filtrando `amount < 0` e `type = 'out'` diretamente da tabela `transactions` para aquele fechamento.
- **Tabela de Lojas (`src/components/dashboard/StoreTableDashboard.tsx`):** Exibe colunas de saldo, faturamento e a nova coluna `Contas (OFX)` por loja, usando dados extraÃ­dos do extrato bancÃ¡rio puro.
- **`KpiCard` GenÃ©rico (`src/components/dashboard/KpiCard.tsx`):** Componente base de UI para mÃ©tricas com animaÃ§Ãµes, formataÃ§Ã£o inteligente e tooltips.
- **Tabela de Lojas (`src/components/dashboard/StoreTableDashboard.tsx`):** VisÃ£o base do dashboard condensando status, saldo real, contas e pÃ¡tio por loja (com dados empilhados para nÃ£o espremer layout). Possui `<tfoot>` nativo para Totalizadores da rede.
- **Faturamento vs Contas Chart (`src/components/dashboard/FaturamentoVsContasChart.tsx`):** GrÃ¡fico de barras horizontal responsivo usando Recharts.
- **EvoluÃ§Ã£o do Saldo Global (`src/components/dashboard/EvolucaoSaldoChart.tsx`):** GrÃ¡fico de Ã¡rea preenchida (`AreaChart`) ilustrando o histÃ³rico do saldo total (bank_total) nos Ãºltimos 15 dias para leitura executiva da saÃºde financeira.
- **HistÃ³rico de TransaÃ§Ãµes por Loja (`src/routes/loja.$lojaId.tsx`):** Exibe a lista completa de transaÃ§Ãµes da loja (OFX e sistema) em um layout de tabela clÃ¡ssica e compacta (Data, Tipo, DescriÃ§Ã£o, Valor), em substituiÃ§Ã£o aos blocos de card.
- **Limite de Conta (OFX):** Extrai dinamicamente as tags `<OVERDRAFTLIMIT>` ou `<CREDITLIMIT>` no parser `ofxParser.ts` e atualiza `account_limit` da tabela `stores` automaticamente na importaÃ§Ã£o.

- **Automação Contábil OFX (Agosto 2026)**: 'Contas a Pagar' e 'Outros Faturamentos' são calculados dinamicamente via useConciliacaoResumo (	otalOfxOut e deduções de 	otalOfxIn vs 	otalPixOs) em ResumoDiaPanel.tsx. Não existem mais campos manuais para esses valores na Importação.

- **Herança de Pátio Pendente (Agosto 2026)**: A métrica 'Na Loja OS' no fechamento diário agora usa uma estratégia de carry-over (useModulo1StoresData), varrendo os últimos 30 dias para herdar a dívida legada caso não haja snapshot gravado para o dia corrente.

- **Refatoração Matemática Bruto/Líquido (Agosto 2026)**: A conciliação distingue Venda Bruta (OS e Maquininha na data) de Pagamento Líquido (OFX na data de liquidação). O parser da Rede salva `gross_amount` e `fee_amount` na tabela `transactions`, e a UI `ResumoDiaPanel.tsx` exibe as "Taxas/Juros" subtraídas dinamicamente para evitar falsas divergências.

- **Deduplicação de OFX Ignorando Conflitos (Agosto 2026)**: O hook `useBulkInsertTransactions` utiliza o método de Upsert nativo com `ignoreDuplicates: true` para ignorar silenciosamente transações OFX de outros dias presentes no lote corrente, evitando o erro de constraint `transactions_store_fitid_key`.
  
- **M�dulo**: Logger (Trace Log Json) (src/lib/logger.ts) - Implementado na Spec 101 

- **Advanced Trace Logging (Spec 102)**: Propaga��o de sessionId pelo useCentralImport.ts e emiss�o de array JSON completo para cada parser (ofxParser, redeParser, useOsImportProcessor, maquininha) para viabilizar debug 100% acurado no DevTools.
# #   D e v   A u t o - I m p o r t   ( F e a t u r e   1 0 5 ) 
 -   * * S c r i p t * * :   s c r i p t s / g e n e r a t e - m o c k s . m j s   ( C o n v e r t e   e x t r a t o s   e m   B a s e 6 4   p a r a   b y p a s s a r   s e g u r a n a   d o   n a v e g a d o r   v i a   V i t e ) . 
 -   * * M a p e a m e n t o   d e   L o j a s   ( R e s i l i n c i a ) * * :   u s e U n i f i e d S t o r e M a p p i n g   s a l v a   o   s l u g   n o r m a l i z a d o   d a   l o j a   n o   l o c a l S t o r a g e   e m   v e z   d o   U U I D   q u e b r a d o ,   r e c a r r e g a n d o   a u t o m a t i c a m e n t e   a p s   r e s e t a r   o   b a n c o . 
 
 - **[Backend] Performance Fixes (Specs 112-114):** A RPC `calculate_daily_conciliation` agora processa toda a matemática consolidada da Dashboard diretamente no PostgreSQL. Protegida contra falhas de digitação e schema (removido parsed_pix_transfer e payment_methods).
-   * * [ B a c k e n d   e   F r o n t e n d ]   F l u x o   d e   C a i x a   e   V a l o r   C o n t a s   ( S p e c   1 4 1 ) : * *   C o r r e c a o   d a   m a t e m a t i c a   n o   g e t _ d a s h b o a r d _ m e t r i c s   p a r a   u s a r   C a i x a   A t u a l   -   C a i x a   A n t e r i o r ,   e   n o v o   h o o k   u s e G l o b a l O f x O u t   n o   R e a c t   p a r a   g a r a n t i r   a   i n c l u s a o   d e   s a i d a s   O F X   n o   s o m a t o r i o   g l o b a l   d e   d e s p e s a s . 
 
   
- [146] [2026-08-07] Restaura��o de import_logs, tipagem de get_store_financial_stats para text, e view transactions baseada em target_date 
- **Feature 147 (Conciliacao):** Navegacao estrita de datas (bloqueio de dias vazios) usando o novo hook useAvailableConciliacaoDates (src/hooks/useDailySnapshot.ts). 

- **ImportSourceBadges (149-conciliation-details)**: Modal de raio-x de lotes na concilia��o que exibe RawOsTable, RawRedeTable e RawOfxTable (src/components/conciliacao/)
- **useRawImportData (149-conciliation-details)**: Hook para buscar dados limpos vindos das novas RPCs get_raw_os_data, get_raw_rede_data, get_raw_ofx_data (src/hooks/)
- **get_raw_os_data(text, date) (150-fix)**: RPC corrigida � p_store_id agora text, filtro por opened_at::date
- **get_raw_rede_data(text, date) (150-fix)**: RPC corrigida � p_store_id text, filtro target_date, novos campos machine_name/payment_method/occurred_at
- **get_raw_ofx_data(text, date) (150-fix)**: RPC corrigida � p_store_id text, filtro target_date, cast p_store_id::uuid para stores.id
  
### Marco Zero Global e Auditoria (11/08/2026)  
- **MarcoZeroWizard.tsx**: Modificado para parsear todas as abas dinamicamente da planilha e renderizar cards de visualiza��o para cada uma, suportando multiplas inser��es.  
- **AuditoriaPassivoWizard.tsx**: Novo wizard estilo checklist para aprova��o/baixa manual das OSs que est�o em estoque_os_pendente com status PENDENTE. Foi inserido em CentralImportWizard (passo 2.5).  
- **marcoZeroParser.ts**: Modificado para extrair MarcoZeroExtraction[] iterando sobre todas as SheetNames do workbook xlsx. 
  
- **LegacyOsTable** (src/components/conciliacao/LegacyOsTable.tsx): Tabela dedicada para gest�o e liquida��o em lote de OSs legadas do Marco Zero.  
- **liquidate_legacy_os** (Supabase RPC): Baixa at�mica de OSs legadas alterando status para pago e integrando com o contador de pend�ncias na loja. 
- **roundCurrency** (src/lib/parsers/numberUtils.ts): Utilit�rio central de alta precis�o (Math.round((val + Number.EPSILON) * 100) / 100) para sanitizar IEEE 754. 

- **Desacoplamento Marco Zero e Correção Na Loja OS (195):** RPCs `get_dashboard_metrics` e `calculate_daily_conciliation` refatoradas na migration `20260814000000_decouple_marco_zero.sql` para isolar a métrica "Na Loja OS" de `estoque_os_pendente`, garantindo que o card reflita 100% o pátio diário real e zere ao acionar o botão de limpeza.
## Feature 240: Segregação de Devoluções Rede (Pilar 5) & Âncora Temporal de OS Pátio
- **Tratamento Contábil de Devoluções da Maquininha Rede:**
  - Adicionada coluna `transaction_type text NOT NULL DEFAULT 'venda' CHECK (transaction_type IN ('venda', 'devolucao'))` à tabela `pos_transactions`.
  - Estornos, cancelamentos e devoluções da Rede agora são expurgados do saldo de vendas a compensar do Pilar 1 e computados obrigatoriamente como obrigações financeiras (Conta a Pagar) somadas em `v_subtotal_contas` no Pilar 5.
  - Sub-linha `Devoluções REDE: - R$ X` no Pilar 5 do `ResumoDiaPanel.tsx` e 5º KPI card `Devoluções / Estornos` em `MaquininhasDetailModal.tsx`.
- **Janela Temporal e Isolamento Retroativo no Pátio (`patio_os`):**
  - Adicionada coluna `last_payment_date date` em `patio_os` com índice `idx_patio_os_last_payment_date`.
  - `savePatioOsAndReceivables` registra a data do pagamento no momento do input.
  - As RPCs `get_daily_reconciliation_summary` e `get_store_pos_triple_reconciliation` avaliam `effective_paid_value` respeitando a data consultada (`last_payment_date <= p_date`), impedindo vazamento de pagamentos futuros para conciliações de dias passados.
- **Parsers & Importadores:**
  - `redeParser.ts` e `useTransactions.ts` detectam devoluções automaticamente por valor negativo (`net_amount < 0`) e por texto de estorno/cancelamento.

## Feature 241: Restauração do Layout Clássico e Tokens Originais dos Cards de Lojas e Resumo do Dia
- **Restabelecimento do Design System em `ResumoDiaPanel.tsx`:**
  - Retorno ao padrão estético com gradiente de cabeçalho `from-[var(--bg-surface)] to-[var(--bg-surface-elevated)]` e tokens nativos do design system (`var(--bg-surface-elevated)`, `var(--border-subtle)`).
  - 5 Pilares organizados em `grid grid-cols-2 md:grid-cols-5 gap-4` com cores características e whisper dots.
  - Cockpit de 2 colunas: Consolidação do Dia (Esquerda) e Diferença Final destacada com tolerância ± R$ 50 (Direita).
  - Preservadas as devoluções da Rede no Pilar 5 e no subtotal de contas da Spec 240.
- **Restauração dos Cards Horizontais de Filiais em `conciliacao.index.tsx`:**
  - Layout horizontal em nível único: Barra vertical de conformidade `w-2 h-14 rounded-full`, Nome da loja, badges de compensação (`ENTROU` / `NÃO ENTROU`) e ID.
  - Envelope contínuo `bg-black/25 p-4 sm:p-5 rounded-2xl border border-white/5 flex-1` alinhando as 6 métricas em grid de 6 colunas (`Saldo Bancos + Cartões`, `Maquininha`, `PIX`, `Na Loja OS`, `Previsto`, `Diferença`).
  - Botão Raio-X flutuante no topo direito do card com revelação suave no hover.

## Motor de Conciliação Autônoma Zero-Touch & Auto-Healing (Spec 258)
- **RPC `run_autonomous_reconciliation_loop` (`supabase/migrations/20260821000007_autonomous_reconciliation_engine.sql`):** Executa loop pericial de auto-cura no fechamento diário, buscando correspondências de cofre, ancoragem de datas, identificação de aportes intercompany de sócios nos extratos OFX e balanceamento de contrapartidas de despesa.
- **Tabela `public.reconciliation_audit_logs`:** Armazena logs de auditoria pericial, deltas (inicial e final), contagem de iterações e etapas executadas.
- **Hook `useAutonomousReconciliation` (`src/hooks/useAutonomousReconciliation.ts`):** Invoca o motor autônomo via RPC e invalida as queries de conciliação.
- **Estágio 5 de Auto-Healing no Wizard (`src/components/importacoes/CentralImportWizard.tsx`):** Executa a conciliação autônoma diretamente na esteira de importação e renderiza o laudo pericial de auto-cura no modal final de conclusão.

## Importação Analítica de Contas a Pagar & Cruzamento Triangular (Spec 256)
- **Parser de Contas a Pagar (`src/lib/parsers/contasPagarParser.ts`):** Extração de arquivos `BuscaContasAPagar.xls` do ERP Oficina Inteligente, mapeamento das 10 filiais pela coluna `Emp`, categorização inteligente e extração de OS em recibos de Uber.
- **Hook `useContasAPagarImport` (`src/hooks/useContasAPagarImport.ts`):** Gravação e persistência de contas em chunks de 100 linhas na tabela `daily_manual_bills` e log em `accounts_payable_imports`.
- **Hook & Modal de Entidades (`src/hooks/useIntercompanyEntities.ts` e `src/components/configuracoes/IntercompanyEntitiesModal.tsx`):** Cadastro e gerenciamento de Sócios, Chaves PIX e Regras de Classificação de Fornecedores.
- **Modal Analítico de Contas (`src/components/conciliacao/ContasManualModal.tsx`):** Tabela analítica com busca, filtros por filial/categoria, reclassificação rápida de categoria e badges intercompany.
- **Tabelas Supabase (`supabase/migrations/20260821000008_accounts_payable_support.sql`):** `public.intercompany_entities`, `public.expense_category_rules`, `public.accounts_payable_imports` e colunas estendidas em `daily_manual_bills`.

## Exclusão Cirúrgica por Data & Correção do Botão de Excluir Imports (Spec 259)
- **RPC `purge_daily_financial_data` (`supabase/migrations/20260821000009_purge_daily_financial_data.sql`):** Exclusão transacional atômica de todos os registros de conciliação por data específica (`p_date DATE`), direcionada às tabelas base (`manual_transactions`, `pos_transactions`, `ofx_transactions`, `daily_snapshots`, `reconciliations`, `conciliation_matches`, `daily_manual_bills`, `daily_revenue_adjustments`, `store_cash_vault`, `accounts_payable_imports` e `import_logs`).
- **Hook `usePurgeDailyData` (`src/hooks/usePurgeDailyData.ts`):** Hook React Query para executar a exclusão cirúrgica de um dia selecionado e invalidar todos os caches locais.
- **Modal de Reset Diário (`src/components/importacoes/PurgeDailyModal.tsx`):** Interface com seletor de data, aviso de escopo e botão de confirmação.
- **Header de Importações Atualizado (`src/routes/importacoes.tsx`):** Botão "Resetar Dados do Dia" e eliminação de `alert()` nativo em favor de notificações `Sonner toast`.
- **Ponto de Retorno / Checkpoint (`scratch/checkpoint_day_21_20260821.json` e `scratch/restore_checkpoint_day_21.cjs`):** Mecanismo de backup completo e restauração em 1 comando para testes periciais do dia 21.

## Atualização de OSs Pendentes, Conciliação de Órfãs & Auto-Preenchimento de Contas (Spec 260)
- **RPC `auto_match_transactions` (`supabase/migrations/20260821000010_auto_match_pending_os.sql`):** Motor de pareamento inteligente por filial (`store_id`) que busca OSs em aberto (`em_aberto`, `pago_parcial`) por correspondência com Saldo Pendente (`total_value - paid_value`), PIX ou Valor Total. Quita a OS (`status = finalizado`, `closed_at = p_date`), atualiza `paid_value`, vincula a transação OFX (`matched_os_number`) e gera os registros em `conciliation_matches`. Suporta também pareamento de créditos com lotes de cartão da Rede.
- **Auto-Preenchimento de Contas a Pagar (`CentralImportWizard.tsx`):** Sincronização automática do valor analítico de contas a pagar no formulário de valores manuais com badge de confirmação visual.
- **Visibilidade de Estoque em Pátio (`CentralImportWizard.tsx`):** Exibição do Delta de recebimentos do dia e do total ativo em pátio por filial.

### Feature 290: Extrato Bancário Completo por Filial com Entradas, Saídas, Filtros e Fuzzy Match de Despesas
- **Status:** `CONCLUÍDO / ARQUIVADO`
- **Data:** 26/08/2026
- **Componentes:**
  - `src/components/conciliacao/StoreExtratoBancarioView.tsx` (Visão completa de extrato com entradas, saídas, 4 KPI cards e filtros)
  - `src/lib/expenseMatcher.ts` (Motor de fuzzy auto-match de débitos OFX com contas a pagar)
- **Hooks:**
  - `useTransactionsPorDataELoja` em `src/hooks/useTransactions.ts` (ordenado por `occurred_at`)
  - `useStoreDailyBills` em `src/hooks/useTransactions.ts` (consulta `daily_manual_bills`)

### Feature 291: Preservação Total de Transações OFX e Herança de Conciliações Anteriores/Posteriores
- **Status:** `CONCLUÍDO / ARQUIVADO`
- **Data:** 26/08/2026
- **Componentes:**
  - `src/components/conciliacao/StoreExtratoBancarioView.tsx` (Herança de histórico, badge de lock 🔒, trava de edição e filtro de outras conciliações)
- **Hooks:**
  - `useHistoricalReconciledTransactions` em `src/hooks/useTransactions.ts` (busca transações justificadas de outras datas para enriquecimento)

### Spec 292 — Desacoplamento Temporal da Rede, Blindagem do Motor de Conciliação e Extrato Otimizado (2026-08-26)
- **RPCs:** `get_store_pos_triple_reconciliation`, `get_daily_reconciliation_summary` unificada e universal (sem hardcodes).
- **Frontend:** `StoreExtratoBancarioView.tsx` com badges compactos `h-5`, saídas sem justificativa e créditos de lote com bloqueio seguro de vínculo de OS.
- **Hooks:** `useAiSettings.ts` e `useTransactions.ts` blindados com zero erros 400 e cache de 5-10 minutos.

### Spec 293 — Eliminação Definitiva de Sobrecargas de RPC (PGRST203) e Restauração Integral do Painel (2026-08-26)
- **RPCs Desambiguadas (PostgREST Single Canonical Signature):**
  - `get_daily_reconciliation_summary(p_date text, p_force_dynamic boolean DEFAULT false)`
  - `get_store_pos_triple_reconciliation(p_target_date text)`
  - `get_raw_os_data(p_store_id text, p_date text)`
  - `get_store_financial_stats(p_store_id text, p_start_date text, p_end_date text)`
  - `get_receivables_summary(p_date text DEFAULT NULL)`
- **Catálogo pg_proc:** 0 sobrecargas duplicadas restantes no banco.

### Spec 294 — Deduplicação de Contas a Pagar e Resolução de NaN por Filial (2026-08-26)
- **Deduplicação de Contas:** `get_daily_reconciliation_summary` unificado para priorizar `daily_manual_bills` como fonte única da verdade, eliminando contagem dupla.
- **Fechamento por Filial:** Retorno de `maquininha`, `pix`, `previsto_ofx` e `diferenca` para todas as 10 lojas com blindagem anti-NaN no frontend.

### Spec 295 — Vinculação de Dinheiro no Cofre e Saldo Consolidado por Filial (2026-08-26)
- **Agregação de Cofre por Loja:** `get_daily_reconciliation_summary` atualizado com CTE `store_vault` populando `dinheiro_loja` e `vault_entries` por `store_id`.
- **Saldo Consolidado por Filial:** `saldo_banco` agora computa `OFX + Dinheiro + Maquininhas`, equalizando o rodapé com o card do topo (R$ 52.914,85).

### Spec 296 — Resolução de PGRST303 e Blindagem de AI Settings (2026-08-26)
- **Leitura Pública de Lojas:** RLS da tabela `stores` atualizada para leitura irrestrita (`USING (true)`) e auto-refresh de sessão no hook `useStores.ts`.
- **Schema AI Settings:** Colunas `provider`, `model`, `api_key` e `user_id` adicionadas com RLS na tabela `ai_settings`.

- **Consolidação de 25/08 e 26/08:** 25/08 fechado em R$ 141.440,93; 26/08 fechado em R$ 151.642,60.
- **Ancoragem de 27/08:** Caixa anterior limpo em R$ 151.642,60.
- **UI:** Botões explícitos de Salvar e Editar no `ResumoDiaPanel.tsx`.

