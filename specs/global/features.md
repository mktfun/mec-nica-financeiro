### Spec 355 — Expurgo de OSs Zumbis/Antigas e Blindagem de Consulta do Pátio Ativo
- **Limpeza Canônica de Pátio**: Aplicada a migration `20260902000022_cleanup_patio_os_zombies.sql` eliminando registros espúrios (`%Faturamento%` e datas anômalas < 2026-07-01 ou anos anteriores como 2020).
- **Blindagem da RPC `get_pending_patio_os_for_ocr`**: Inseridos guardrails de janela temporal de 60 dias e exclusão permanente de termos contábeis de faturamento nas OSs.

### Spec 354 — Controle de OS Estilo Planilha Excel por Loja com Accordion
- **Visão em Blocos Expansíveis por Loja (Accordion)**: Criado `PatioExcelStoreAccordion.tsx` com cabeçalho de totais em tempo real, persistência de expansão em `localStorage` e adição inline de novas OSs.
- **Tabela Estilo Excel & Mini Popover de Lançamento**: Decomposição transparente de formas de pagamento (Pix, Crédito, Débito, Dinheiro, Total Pago, Restante) com popover inline flutuante de lançamento cumulativo (`[ ⚡ Usar restante ]` e botão `Zerar`).

### Spec 353 — Redesign Minimalista e Ergonômico de Pátio e Faturamento
- **Ergonomia e Redesign no Step 1.5 e Modal de Pátio**: Redesenhado `PatioManualStoreGrid.tsx` e `PatioManagementDualModal.tsx` eliminando poluição visual, com 3 botões claros de pagamento rápido (`PIX`, `Cartão`, `Dinheiro`), seletor enxuto de filial e formulário inline de apenas 3 campos.
- **Grid Padronizado de 4 Cards no Step 3**: Removida a calculadora volumosa em `CentralImportWizard.tsx`, estabelecendo um grid simétrico e limpo com botão/badge discreto `💡 Sugestão [Usar]` quando não houver arquivos de OS.

### Spec 352 — Correção de Import do Ícone Car em CentralImportWizard
- **Inclusão do Ícone `Car`**: Adicionado `Car` no import de `lucide-react` em `CentralImportWizard.tsx`, eliminando o erro de execução `ReferenceError: Car is not defined` ao carregar as abas de Pátio e botões de atalho no Step 1.5 e Step 3.

### Spec 351 — Correção de Case Sensitivity em Importações UI para Deploy Linux / Lovable
- **Normalização de Imports PascalCase**: `OcrBatchDropzoneAndPaste.tsx` e `OcrBatchReviewGrid.tsx` atualizados para importar `Button` de `@/components/ui/Button` em conformidade estrita com o sistema de arquivos case-sensitive Linux (Lovable/Cloudflare/CI).
- **Blindagem no `tsconfig.json`**: Inserida a opção `"forceConsistentCasingInFileNames": true` nas `compilerOptions` para detecção estática no ambiente de desenvolvimento local.

### Spec 350 — Faturamento Assistido por Mapa de Metas e Gestão Dual de Pátio sem Import de OS
- **Calculadora Condicional Assistida de Faturamento (`AssistedRevenueCalculator.tsx`)**: Ativada no Step 3 exclusivamente quando `results.osFiles.length === 0`, calcula $\text{Faturamento Sugerido} = (\text{Concil. Anterior} - \text{Mês Anterior}) + \text{Mapa de Metas}$, com botão *"⚡ Aplicar ao Faturamento do Dia"*, mantendo o odômetro padrão 100% inalterado quando houver planilhas XLS.
- **Gestão de Pátio com Chips de Pagamento 1-Clique (`PatioManualStoreGrid.tsx`)**: Tabela por filial em Dark UI Zinc-950 com chips de 1-clique (`[ ⚡ PIX ]`, `[ ⚡ Crédito ]`, `[ ⚡ Débito ]`, `[ ⚡ Dinheiro ]`), preenchendo automaticamente os campos numéricos de split (`pix_transfer_value`, `credit_value`, `debit_value`, `cash_value`) para alimentar o auto-match com a Rede e o OFX.
- **Modal Unificado Dual de Pátio (`PatioManagementDualModal.tsx`)**: 2 abas integradas (Aba 1: Baixa Manual por Filial e Aba 2: Importação por Imagem / OCR IA) com persistência atômica via RPC `batch_upsert_patio_os`.
- **Integração no Wizard (`CentralImportWizard.tsx`)**: Step 1.5 renovado com abas fluidas e Step 3 com card de faturamento assistido e botão *"🚗 Gerenciar Pátio & Baixas"*.

### Spec 349 — Blindagem do Salvamento de Contas a Pagar e Refatoração do Terminal de Logs
- **Blindagem no Parser de Contas a Pagar**: `contasPagarParser.ts` descarta estritamente linhas com `amount <= 0 || isNaN(amount)` (ex: títulos cancelados ou estornos), eliminando na causa raiz a violação da check constraint `daily_manual_bills_amount_check` do PostgreSQL.
- **Sanitização de Foreign Keys e Deduplicação**: `useContasAPagarImport.ts` sanitiza `store_id` (deixa `null` se `'master'` ou se não existir em `stores`), `intercompany_entity_id`, valida campos obrigatórios, deduplica itens em memória e aplica fallback granular individual para inserções resilientes em chunks de 100.
- **Terminal de Logs Profissional (`ImportExecutionTerminal.tsx`)**: Layout Dark Zinc-950 estilo macOS com dots de cabeçalho, filtros rápidos por severidade (`Todos`, `Erros ❌`, `Avisos ⚠️`, `OK ✅`), botão de cópia de logs 1-clique e auto-scroll suave interno no container (sem saltos de viewport).
- **Banner de Diagnóstico de Erros (`ExecutionErrorBanner.tsx`)**: Card de alta visibilidade com diagnóstico amigável em português para erros comuns de banco, visualizador colapsável de payload JSON/Stack Trace e botão de retry inteligente (`handleConfirm(true)`).
- **Saneamento de UTF-8 / Mojibake**: Todas as mensagens de log em `CentralImportWizard.tsx` saneadas para caracteres UTF-8 limpos com emojis válidos.

### Spec 341 — Criação de Nova OS com Baixa Granular e Vínculo de Pagamento Manual no Wizard
- **Criação de OS On-the-Fly no Step 1**: Adição de formulário na aba *"➕ Criar Nova OS na Filial"* no modal `ManualMatchOsModal.tsx` com campos de Loja, Nº da OS, Cliente, Placa, Forma de Pagamento e opção de Liquidação Integral vs Parcial.
- **RPC Atômica `create_and_link_manual_os`**: Migration `supabase/migrations/20260901000016_create_and_link_manual_os_rpc.sql` gravando a OS em `patio_os`, incrementando `pix_transfer_value`, `credit_value` ou `debit_value`, atualizando `paid_value` e recalculando `status` ('finalizada' vs 'pago_parcial').
- **Hook `useManualMatch.ts`**: Mutation `createAndLinkOs` com invalidação coordenada de cache do TanStack Query (`patio_os`, `available_store_os`, `reconciliation_views`, `daily-reconciliation-summary`).

### Spec 340 — Motor de Auto-Match com OSs Finalizadas, Roteamento Corporativo e Orquestração Linear de Steps
- **Pareamento com OSs Finalizadas**: Migration `supabase/migrations/20260901000015_auto_match_finalized_os_and_corporate_routing.sql` expandindo a RPC `auto_match_daily_transactions` para casar tanto OSs abertas quanto finalizadas que possuam `pix_transfer_value` ou `credit_value`/`debit_value` correspondentes.
- **Auto-Tagging e Roteamento Corporativo**: Pré-classificação de Empréstimos, Seguros, Sinistros e Transferências Interlojas diretamente para o Step 2 (Justificativas), despoluindo a fila do Step 1.
- **Orquestração Suave de Steps no Frontend**: Remoção do timer artificial e do flash da tela final de sucesso em `CentralImportWizard.tsx`, transicionando diretamente para o Step 1 com controle 100% manual do operador.

### Spec 335 — Justificativa de Saídas OFX, Integração com Contas a Pagar e Equalização Matemática Linear dos Cards
- **Subtração Linear dos Cards de Filial**: O split dos cards em `StoreCardModulo1.tsx` adota a equação linear explícita ($A - B = C$): $\text{OFX Entradas} - \text{Créditos Conciliados} = \text{Dif. a Justificar}$ e $\text{Saídas OFX} - \text{Contas Conciliadas} = \text{Dif. a Justificar}$, eliminando comparações ambíguas entre balcão D-0 e extratos D-1.
- **Justificativa Polimórfica de Débitos Bancários**: `OrphanCategorizationModal.tsx` suporta transações de saída (`type === 'out'`) com paleta Rose, categorias de autopeças/fornecedores/serviços e escolha de destino: *"Somar ao Contas a Pagar"* (`contabilizar_no_subtotal = true`) vs *"Apenas Conciliar"*.
- **Habilitação de Ações de Saída**: `StoreExtratoBancarioView.tsx` libera o botão "Justificar / Editar" para todas as saídas no extrato da filial, disparando a RPC atômica `resolve_orphan_saida_ofx`.
- **SSOT de Despesas sem Duplicação**: Migration `supabase/migrations/20260901000012_fix_store_split_linear_subtraction_and_expenses.sql` ajustando a RPC `get_daily_reconciliation_summary` com blindagem contra dupla contagem de despesas.

### Spec 334 — Transparência de Entradas OFX, Empilhamento Visual dos Cards e Centralização dos Cálculos na RPC
- **Vertical Stack no Card de Filiais**: Reestruturação do bloco esquerdo em `StoreCardModulo1.tsx` com empilhamento vertical de *Saldo Total*, *Rede Total (com badge de compensação)* e *Saldo em Pátio*, eliminando qualquer truncamento com reticências (`...`).
- **Extrato OFX Imutável**: Migration `supabase/migrations/20260901000011_fix_canonical_store_ofx_entries_and_split.sql` garantindo que `ofx_entradas_total` reflita 100% dos créditos bancários da filial.
- **Zero Recálculo no Frontend**: Todas as métricas de filiais derivam de propriedades retornadas pela RPC `get_daily_reconciliation_summary`.

### Spec 279 — Correção do Fechamento por Filial, Agregação Canônica e Cálculo de Diferença por Loja
- **Agregação Canônica por CTEs na RPC**: RPC `get_daily_reconciliation_summary` atualizada com CTEs isoladas (`rede_agg`, `ofx_rede_agg`, `pix_agg`, `patio_agg`, `vault_agg`, `recon_latest`) e tratamento de `store_id` como `TEXT`, garantindo agregação sem perda para as 10 lojas ativas (Mauá UUID e IDs curtos `st-01` a `st-09`).
- **Cálculo da Diferença por Loja**: $\text{Previsto Loja} = \text{Rede Líquido} + \text{PIX}$, $\text{Realizado Loja} = \text{OFX Maquininhas} + \text{PIX}$, $\text{Diferença Loja} = \text{Realizado Loja} - \text{Previsto Loja}$.
- **Componentização Modular no Frontend**: Criação de `StoreCardModulo1.tsx` e `ConciliacaoLojasView.tsx` no padrão Dark UI Zinc-950 com badges `ENTROU`, `A COMPENSAR (+ R$)`, `DIVERGÊNCIA` e `SEM MOVIMENTO`.
- **Preservação de Contexto Temporal**: Correção do botão de retorno em `conciliacao.$lojaId.tsx` mantendo `search={{ date: targetDate }}`.
- **Migration**: `supabase/migrations/20260901000003_fix_store_breakdown_metrics_and_differences.sql`.

### Spec 315 — Correção Crítica da RPC de Conciliação, Cálculo de Faturamento e Blindagem de Snapshots
- **Retorno de Lojas em Snapshots Fechados (Ramal 1)**: Inclusão obrigatória de `'stores'` com as 10 filiais preenchidas no retorno da RPC `get_daily_reconciliation_summary` para dias homologados (`is_closed = true`).
- **Cálculo de Odômetro Estável**: Odômetro delta corrigido (`IF v_faturamento_oi_base >= v_faturamento_anterior THEN v_faturamento_oi_base - v_faturamento_anterior`), evitando vazamento do acumulado histórico como receita do dia quando o faturamento não muda.
- **Guarda Anti-Corrupção no Frontend**: Implementada a trava `isStoreBreakdownCorrupted` em `ResumoDiaPanel.tsx` que desabilita o botão "Salvar Fechamento" e impede mutações com dados de filiais zerados, além de blindar `reconciliations` contra sobrescrita com zeros.
- **Guarda Impeditiva no Backend**: RPC `close_daily_snapshot` com `RAISE EXCEPTION` impedindo selamento com filiais zeradas havendo movimentação financeira consolidada.
- **Migration**: `supabase/migrations/20260901000002_fix_daily_reconciliation_stores_and_snapshot_guard.sql`.

### Spec 328 — Equalização Definitiva dos 5 Pilares e Fechamento Canônico de 31/08/2026
- **Saneamento e Paridade Pericial**: Equalização integral dos 5 pilares com paridade estrita à planilha `CONCILIAÇÃO 3108.xlsx` com Diferença Final de **+R$ 8,94 (Sobra de Caixa Aprovada)**.
- **Compensação Intra-Loja de Cheque Especial vs Rede**: Cálculo dinâmico para as 10 filiais, agregando Bancos Positivos (R$ 231.813,81) e (-) Cheque Especial Holding (R$ 13.188,08).
- **Faturamento DRE Composto**: Faturamento Base da Oficina Inteligente (R$ 55.420,95) + Aporte de Sócios (R$ 5.000,00) = R$ 60.420,95.
- **Subtotal de Contas a Pagar**: Base Planilha (R$ 46.848,95) + Pró-labore Daniel (R$ 5.000,00) + DIF Joaci (R$ 1.714,84) + Juros Rede (R$ 3.932,35) = R$ 57.496,14.
- **RPC Genérica e Preservação de Snapshots**: RPC `get_daily_reconciliation_summary` 100% dinâmica para todas as datas com preservação do `caixa_atual` em snapshots homologados.
- **Migration**: `supabase/migrations/20260831000011_spec_328_forensic_reconciliation_3108.sql`.

### Spec 327 — Alinhamento Integral dos 5 Pilares e Compensação Intra-Loja (31/08/2026)
- **Compensação Intra-Loja de Cheque Especial**: Cálculo da posição líquida de cada filial antes da agregação holding ($\text{Saldo Consolidado} = \text{OFX} + \text{Cofre} + \text{Rede a Compensar}$), segregando Ativos Positivos e Cheque Especial Real sem dupla penalização.
- **Aportes de Sócios no Faturamento**: Consolidação de entradas justificadas como aporte no Faturamento Total do DRE (`faturamento_periodo = faturamento_oi_base + faturamento_ajustes`), equalizando o Valor Disponível para Contas.
- **Subtotal de Contas a Pagar**: Agregação canônica de Contas Base + Pró-labore Daniel + Despesas Extras + Juros Rede.
- **Frontend Reativo & Modais**: Header cards atualizados em `SaldoBancosDetailModal.tsx` e `ResumoDiaPanel.tsx` com Dark UI Zinc-950.
- **Migration**: `supabase/migrations/20260831000010_align_5_pillars_and_intra_store_offset.sql`.

### Spec 319 — Correção do Caixa Atual, Fluxo Contábil e Paridade dos 5 Pilares na RPC
- **Equação Canônica Inviolável (5 Pilares)**: $\text{Caixa Atual} = (\text{Total Saldo Banco Positivo} + \text{Dinheiro MP} + \text{A Receber} + \text{Na Loja OS}) - \text{Saldo Negativo Itaú}$.
- **Eliminação de Congelamento Híbrido em Snapshots Fechados**: RPC `get_daily_reconciliation_summary` atualizada para computar deterministicamente o Caixa Atual em ambos os ramais, evitando divergências causadas por atualizações dinâmicas no Pátio ou Cofre.
- **Sincronização DRY no Dashboard e Conciliação**: `get_dashboard_metrics` e `calculate_daily_conciliation` agora consomem internamente o motor de `get_daily_reconciliation_summary`, garantindo coerência matemática absoluta em toda a aplicação.
- **Frontend Reativo (`ResumoDiaPanel.tsx`)**: Paridade total na derivação em tempo real e na persistência em `daily_snapshots`.
- **Migration**: `supabase/migrations/20260831000005_fix_caixa_atual_and_fluxo_contabil.sql`.

### Spec 316 — Pareamento de Quitações em OSs Finalizadas e Encadeamento Canônico de Odômetro (28/08 -> 31/08)
- **Motor Auto-Matching (`auto_match_transactions`)**: 3 camadas de pareamento (Regex textual de número de OS em memo/counterpart, matching de saldo devedor em OSs abertas, e matching de quitação em OSs finalizadas na data/últimos 7 dias).
- **Vínculo Manual Assistido (`Step1UnregisteredPayments.tsx`)**: Exibição de OSs abertas e finalizadas com badges inteligentes e ordenação por proximidade de valor. Vínculo atômico de 1 clique sem alterar saldo de pátio em OSs já quitadas.
- **Encadeamento de Odômetro Anterior**: Retorno de `'faturamento_anterior'` no Ramal 2 da RPC `get_daily_reconciliation_summary` com extração canônica de `metadata.odometro_hoje` (R$ 920.496,64 para o fechamento de 28/08).
- **Interface Reativa do Wizard (`CentralImportWizard.tsx` & `Step4FinalAuditAndClose.tsx`)**: Exibição do Odômetro Anterior e cálculo do Delta de Faturamento do Dia em tempo real nos Steps 3 e 4.
- **Migration**: `supabase/migrations/20260831000002_fix_automatch_and_odometro_encadeamento.sql`.

### Spec 284 — Reestruturação Canônica da Tela de Recebíveis e Integração do Pilar 3
- **src/routes/recebiveis.tsx**: Alinhamento 1:1 com o padrão canônico de `src/routes/patio.tsx`, com 4 Summary Cards com `border-l-4`, abas de status (`Todas`, `Em Aberto`, `Vencidos`, `Liquidados`), timeline de boletos com badges de OS, parcela e vencimento, e paginação canônica.
- **Filtro de Filiais Ativas**: Exibição exclusiva no dropdown e listas das lojas que possuem títulos registrados (Mauá - MHE R$ 10.394,50, Planalto - BRASICAR R$ 1.120,00, Piraporinha - EMPORIO R$ 300,00).
- **Higienização de Banco de Dados**: Expurgados 83 registros legados mock (`Outros`), mantendo os 5 boletos autênticos de 25/08/2026 totalizando exatamente R$ 11.814,50.
- **Integração Pilar 3 da Conciliação**: Atualização da RPC `get_daily_reconciliation_summary` e de `ResumoDiaPanel.tsx` para refletir os R$ 11.814,50 de A Receber com link de navegação rápida.
- **Parser de Recebíveis**: `src/lib/parsers/recebiveisParser.ts` para extração automática da aba `RECEBIVEIS ` das planilhas `CONCILIAÇÃO *.xlsx`.

### Spec 283 — Congelamento Imutável de Snapshots e Isolamento Histórico de Conciliação
- **Period Close Locking**: Implementação de colunas `is_closed` e `closed_at` em `daily_snapshots`.
- **RPC `get_daily_reconciliation_summary`**: Bifurcação contábil (Branch 1: Leitura congelada instantânea para dias homologados com `is_closed = true`; Branch 2: Cálculo dinâmico em tempo real para dias abertos).
- **Isolamento de Contas a Pagar**: `daily_snapshots.contas_a_pagar` reservado exclusivamente para a Base da Planilha (`BuscaContasAPagar.xls`), com despesas manuais extras isoladas em `daily_manual_bills`.
- **Correção da Tripla Conciliação de Maquininhas**: Remoção de cláusulas de exclusão hardcoded em `get_store_pos_triple_reconciliation`, integrando 100% das 10 filiais no cálculo de cartões a compensar.
- **ResumoDiaPanel.tsx**: Badge visual de *Dia Consolidado (Imutável)* e proteção contra duplicação de despesas na mutação de salvamento.

### Spec 278 — Motor de Cálculo Direto das Fontes Brutas e Desduplicação de Contas
- **useOsImportProcessor.ts**: Mapeamento estrito de R$ Total da OS e Restante na OS diretamente dos arquivos do ERP, eliminando a sobreposição de Total no Financeiro.
- **MissingPatioOsEditor.tsx**: Preservação automática no pátio para veículos de dias anteriores (carryover de 4 OSs) por padrão sem induzir baixa acidental.
- **RPC get_daily_reconciliation_summary**: Apuração de _contas_manual diretamente de daily_manual_bills (R$ 29.999,51) sem duplicar com contas_base do snapshot.

### Spec 276 — Refinamento Estrito do Modal de Vínculo Manual de PIX com OS
- **useManualMatch.ts**: useAvailableStoreOs com isolamento rigoroso por filial (storeId), exclusão de OSs já vinculadas em ofx_transactions (matched_os_number IS NOT NULL), bloqueio de OSs puramente em Cartão/Dinheiro sem saldo em aberto, e filtro estrito para pagamentos em PIX.
- **ManualMatchOsModal.tsx**: Ordenação e match score estritamente comparando com o valor esperado de PIX (pix_transfer_value ou saldo restante) em vez de valores pagos em cartão.
- **StoreExtratoBancarioView.tsx**: Repasse explícito de targetDate para o modal de vínculo manual.

### Spec 275 — Previsto = Total Entradas OFX, Diferença = Pendentes Não Justificados + Guardrails de Auto-Match de PIX
- **RPC get_daily_reconciliation_summary**: Previsto por loja padronizado para soma total de entradas OFX do dia. Diferença por loja refletindo o saldo exato de entradas pendentes de identificação/justificativa.
- **CentralImportWizard.tsx**: 4 guardrails ativos no auto-match de PIX (valor mínimo >= R$ 10, filtro de rendimentos/aplicação financeira, exigência de PIX esperado na OS > 0 e tolerância < R$ 0,10).
- **StoreExtratoBancarioView.tsx & conciliacao.index.tsx**: Harmonização visual e computacional da classificação de liquidações da Rede e status de conciliação por filial.

### Spec 274 — Motor Inteligente de Auto-Match (Rede ↔ OS) e Carry-Over de Pátio
- **useImportProcessor.ts**: Auto-match inteligente entre transações da Rede e OSs em aberto na filial para quitação automática sem intervenção manual.
- **patio_os**: Preservação cumulativa de carros em pátio de datas anteriores (carry-over).
- **Sincronização 24/08**: Pátio total de R$ 88.212,39 com 100% de aderência às 10 filiais do fechamento real.

### Spec 273 — Ajuste Matemático Estrito da RPC de Conciliação
- **get_daily_reconciliation_summary**: Unificação dinâmica de total_saldo_banco (OFX + Dinheiro Cofre + Maquininhas a Compensar) e caixa_atual sem alteração na tabela de snapshots.
- **ResumoDiaPanel.tsx**: Consumo direto de summary.total_saldo_banco no Card 1.

### Spec 272 — Apuração Automática de Dinheiro no Cofre e Maquininhas a Compensar por Filial
- **useOsImportProcessor.ts**: Separação canônica de pagamentos em DINHEIRO em cash_value/parsed_cash.
- **useImportProcessor.ts**: Sincronização automática em store_cash_vault (status em_transito vs depositado com base na janela contábil).
- **get_daily_reconciliation_summary**: Apuração de dinheiro_loja, saldo_banco_ofx e nao_entrou_valor consolidando com 100% de precisão no modal SaldoBancosDetailModal.

# Global Features

## Feature 217: Auditoria de MDR e Divergência Contratual Multi-Loja (Rede)
- Cálculo da Taxa Efetiva de MDR: `(1 - (líquido / bruto)) * 100`.
- Comparação contra tabela oficial de contratos (`pos_fee_contracts`) e alerta de divergência contratual.

## Feature 218: Tela Dedicada de Auditoria de Taxas, MDR Diário e por Transação (/taxas)
- Substituição da antiga rota `/alertas` pela nova `/taxas` no menu principal (`Sidebar.tsx` e `BottomNav.tsx`).
- Visão Diária com evolução de faturamento bruto, líquido, retenção em R$ e % média de MDR diária.
- Visão Transacional linha a linha com cálculo de taxas, desvio e prejuízo por venda de cartão.
- Gestão ativa de contratos de taxas (`ContractFeeEditorModal.tsx`) e exportação de planilha CSV de contestação.

## Feature 219: Faturamento Atual com Justificativas e Resolução de Diferenças na Loja
- Renomeação de *Faturamento Líquido* para *Faturamento Atual* e do input manual para *Faturamento Mapa de Metas*.
- Cálculo unificado: `Faturamento Atual = Faturamento Mapa de Metas + Soma(Transações Justificadas)`.
- Abatimento das transações justificadas no Previsto de cada loja em `conciliacao.index.tsx`, zerando a diferença da filial.
- Modal `FaturamentoAtualBreakdownModal.tsx` ao clicar no card de Faturamento Atual para exibir detalhamento linha a linha de cada justificativa.

## Feature 220: Correção de Justificativas no Faturamento e Redesign do Card de Diferença Final
- Correção de schema na busca de transações justificadas (`bank_name`, `counterpart_name` em vez de `title`) e suporte a justificativas por `manual_category`.
- Sincronização da tabela `transactions` no hook `useCategorizeOrphan.ts`.
- Redesign premium e harmonioso do card lateral de *Diferença Final* no `ResumoDiaPanel.tsx` com tipografia ampliada, gradiente suave e badge de tolerância.

## Feature 221: Vínculo Manual de PIX/Banco com OS, Desvinculação e Proteção contra Duplicidade
- Modal `ManualMatchOsModal.tsx` para busca e vínculo direto de qualquer transação bancária/PIX com as Ordens de Serviço da filial.
- Ação de `Desvincular` em `PixVsOfxTable.tsx` para corrigir OSs pagas em dinheiro vinculadas a PIX por engano.
- Regra contábil estrita: transações vinculadas a OS baixam a OS e o extrato bancário sem somar ao Faturamento Atual (evitando duplicar com o Mapa de Metas).

## Feature 222: Ajuste da Tabela de Cartão da Maquininha (Bruto, Taxa MDR, Líquido e Bandeira)
- Remoção completa da média artificial (`R$ 2.907,025` / divisão por lote) na coluna de banco.
- Exibição de colunas transparentes e individuais por venda: Bandeira/Modalidade (*Visa, Mastercard, Elo, Hipercard, Amex, PIX*), Bruto, Taxa MDR (-R$ e %), Líquido Creditado, Referência/OS e Status.
- Cards do topo atualizados com Total Bruto, Total Taxas Retidas e Total Líquido a Receber.

## Feature 223: Auditoria de Status de Liquidação Bancária para Cartões e PIX de OS
- Exibição rica dos dados do extrato Itaú (contraparte, banco e valor) para PIXs confirmados.
- Modal `LinkOfxToOsModal.tsx` acionado diretamente pela tabela de PIX para vincular OSs pendentes a depósitos bancários avulsos.
- Status claro de liquidação bancária para lotes de cartões (`Liquidado no Banco` vs `Aguardando Compensação`).

## Feature 224: Conciliação Atemporal e Persistente de PIX (OFX-Centric)
- Inversão da polaridade para modelo *OFX-First Ledger*: fluxo guiado pela entrada real de dinheiro no banco.
- Busca atemporal no pool de OSs abertas do pátio em janela de $\pm 15$ dias.
- Regra de Ouro da Unicidade Estrita: auto-match apenas para valores 1:1 sem ambiguidade; múltiplas OSs com o mesmo valor geram sugestão para confirmação humana com 1 clique.
- Persistência imutável em banco relacional: reimportações diárias de relatórios de pátio não desfazem os vínculos já estabelecidos.

## Feature 225: Justificativa com Controle de Faturamento e Redesign de Vínculo de OS
- Modal `OrphanCategorizationModal.tsx` com opção explícita: "Somar ao Faturamento da Loja" (receitas sem OS) vs "Apenas Conciliar (NÃO Somar)" (Rendimentos, Marco Zero, transferências entre filiais, aportes).
- `useJustifiedTransactions.ts` somando no Faturamento Atual apenas transações justificadas que realmente impactam receita.
- Redesign completo do `ManualMatchOsModal.tsx`: desduplicação estrita de OSs, matches exatos no topo com badge verde luminoso e botão largo de vínculo.
- Reversão e limpeza de justificativas de teste para novos ensaios.

## Feature 226: Correção de Filtro PIX vs Movimentações Bancárias e Sincronização de Diferenças por Loja
- Isolamento estrito de PIX de clientes: termos corporativos e bancários (`SISPAG`, `REND PAGO`, `APLIC AUT`, `TRANSF CC`, `APORTE`, `RESGATE`, `APLICACAO`, `TAR BANCARIA`, `BOLETO`) são proibidos de entrar no pool de PIX de OS e direcionados 100% para a aba de *Entradas Avulsas*.
- Desvinculação no banco de 11 falsos matches automáticos de aportes, transferências de óleo e rendimentos que estavam indevidamente atrelados a OSs.
- Sincronização e abate automático na Diferença da filial no fechamento por loja para todas as entradas justificadas como "Apenas Conciliar (Não Somar)".
- Badge dinâmico de contagem de pendências avulsas na aba 4 da conciliação por loja.

## Feature 227: Métricas do Dashboard e Gráfico de Evolução Macro 100% no PostgreSQL RPC
- Migração completa dos cálculos do Dashboard para a RPC PostgreSQL `get_dashboard_metrics`: zero cálculos no frontend.
- Gráfico de Evolução Macro alimentado pela série cronológica de snapshots fechados do mês (`daily_snapshots`), desenhando as curvas de Saldo, Faturamento e Contas a Pagar.
- Mapeamento normalizado de filiais com saldo bancário real (`R$ 186.496,03`) e pátio (`33 veículos / R$ 92.746,71`).
- Comparação dinâmica de Faturamento Atual vs Anterior ancorada no último fechamento registrado (Marco Zero / Período).

## Feature 228: Redesign do Dashboard com Tabs de Análise por Unidade e Tabela Horizontal
- Card de Análise Setorial por Unidades (`StoreAnalyticsTabs.tsx`) em tela cheia com 3 abas: Saldo Bancário (Itaú), Faturamento (OFX) e Contas (OFX).
- Cada aba com Donut Chart, centro luminoso exibindo Total Líquido, 4 cards de KPIs da dimensão e ranking das 10 unidades com barras de progresso proporcionais.
- Tabela "Resultado por Loja" em layout widescreen espaçoso e horizontal.

## Feature 230: Redesign da Etapa 4 de Importação Central (Orquestração Multi-Agente de IA)
- Remoção dos 4 cards estáticos redundantes e da barra de gradiente pesada no wizard de importação.
- Redesign completo com foco no painel de orquestração multi-agente (`AgentStageItem.tsx`), detalhando os 4 agentes especializados (Car, CreditCard, Landmark, Sparkles) com badges dinâmicos de status, sub-etapas e telemetria.
- Ajuste na RPC do Dashboard para desaninhar corretamente o JSON escalar de `diferenca_final`.

## Feature 231: Diagnóstico de Conciliação e Cartões a Compensar (18/08)
- Mapeamento matemático das regras da planilha de conciliação diária (`CONCILIAÇÃO 1808.xlsx`).
- Dedução automática de pagamentos do dia no cálculo de saldo retido de Carros em Pátio (OSs).
- Isolamento estrito de snapshots diários (`daily_snapshots`) por data no fechamento.

## Feature 232: Whisper Dots e Audit Trail Discreto de Divergências na Conciliação
- Hook de inteligência analítica `useReconciliationInsights.ts` que cruza dados de cartões a compensar, PIX avulsos, OSs do pátio e contas vs saídas OFX.
- Componente `WhisperDot.tsx`: Micro-indicador estático e suave (4px) nos 5 pilares (`Saldo Banco Itaú`, `Dinheiro MP`, `A Receber`, `Na Loja OS`, `Contas (Manual)`) com tooltip nativo descritivo no hover.
- Componente `AuditTrailBar.tsx`: Barra colapsável e elegante abaixo da Consolidação do Dia (`⚙ N observações de conferência · Expandir`), detalhando cada causa raiz e delta financeiro sem poluição visual.

## Feature 233: Gestão de Acessos, Permissões Granulares e Logs Diários
- Gestão completa de usuários em `UserManagementPanel.tsx` e `CreateUserModal.tsx`: cadastro direto de novos acessos com E-mail, Senha e Papéis (`Admin`, `Operador`, `Visualizador`).
- Controle granular de privilégios (`can_import` e `can_edit_data`) com travas em tempo real no botão "Editar Fechamento" da conciliação e no fluxo de importações.
- Visualizador de Logs de Auditoria Diária (`DailyAuditLogsView.tsx`) com seletor de data (`< 18/08/2026 >`), linha do tempo vertical por tipo de ação e visualizador de detalhes técnicos / payload.
- Organização do menu `/configuracoes` em 3 abas intuitivas: *Acessos & Permissões*, *Logs de Auditoria Diária* e *Motor & Lojas*.

## Feature 234: Conciliação Tripla de Maquininhas, Saldo a Compensar e Batimento OFX
- RPCs `get_store_pos_triple_reconciliation` e `get_daily_reconciliation_summary` no Supabase: 100% dos cálculos no backend confrontando o Total Líquido das vendas da Rede contra a soma de todas as bandeiras do OFX (`REDE MAST`, `REDE VISA`, `REDE ELO`, etc.) e OSs com pagamentos em cartão.
- Inclusão automática das vendas de maquininhas pendentes de crédito bancário (`cartoes_a_compensar`) no Saldo do Pilar 1 (`total_saldo_banco = saldo_bancos_ofx + cartoes_a_compensar`) e no Caixa Atual.
- Redesign do Card 1 em `ResumoDiaPanel.tsx` com sub-linhas transparentes (`OFX: R$ ...` | `+ Maq: R$ ...`) no padrão visual do card de Contas.
- Modal `MaquininhasDetailModal.tsx` com visão widescreen dos 4 KPIs globais e tabela detalhada das 10 lojas com status de compensação (`ENTROU`, `PARCIAL`, `NÃO ENTROU`).

## Feature 235: Exibição e Soma de Maquininhas Não Entradas por Loja e no Consolidador Geral
- Enriquecimento da lista `stores` da RPC `get_daily_reconciliation_summary` com `saldo_banco_ofx`, `nao_entrou_valor`, `saldo_banco` (Consolidado: $\text{OFX} + \text{Não Entrou}$) e `status_compensacao` por filial.
- Atualização do card de cada uma das 10 filiais em `conciliacao.index.tsx`: exibição do Saldo Consolidado, sub-linhas (`OFX: R$ ...` | `+ Maq: + R$ ...`) e badge no cabeçalho da loja (`ENTROU` / `NÃO ENTROU (+ R$ ...)`).
- Header de `conciliacao.$lojaId.tsx` com painel de 4 métricas da maquininha da loja (Vendas Líquido, Creditado no OFX, A Compensar e Status de Compensação).

## Feature 237: Redesign Visual & Descompressão do Painel de Resumo do Dia
- **Descompressão dos 5 Pilares (`ResumoDiaPanel.tsx`):** Grid responsivo e espaçoso (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5`) com respiro, tipografia `font-mono` nítida em destaque e ícones sutis em badges com cantos arredondados.
- **Sub-linhas Alinhadas:** Sub-totais do Card 1 (`OFX: R$ ...` / `+ Maq: + R$ ...`) e do Card 5 (`Juros: R$ ...` / `Saídas OFX: - R$ ...`) perfeitamente alinhados horizontalmente, sem sobreposição de textos ou quebras de linha defeituosas.
- **Cockpit de Fechamento Integrado (3 Colunas):** Área inferior reorganizada em 3 colunas harmoniosas:
  1. *Dinâmica de Caixa:* Caixa Atual Consolidado + Fluxo de Caixa (Variação vs Dia Anterior).
  2. *Operação & Disponível:* Faturamento Atual (com link de detalhes `↗`) + Disponível para Contas.
  3. *Balanço do Fechamento & Diferença Final:* Card unificado com Total de Contas a Pagar, Diferença Final apurada em destaque e badge de conformidade ($\pm \text{R\$ 50}$).
- **Eliminação de Ruído Visual:** Remoção de frases e micro-rótulos redundantes que poluíam o painel, gerando uma experiência limpa de padrão FinTech executivo.

## Feature 238: RPC de Limpeza Geral Atômica & Sincronização e Desbloqueio de Datas do Marco Zero
- **RPC `clear_all_financial_data()` no PostgreSQL (`SECURITY DEFINER`):** Truncamento atômico com `CASCADE` das 20 tabelas transacionais (`ofx_transactions`, `pos_transactions`, `patio_os`, `estoque_os_pendente`, `reconciliations`, `daily_snapshots`, etc.), garantindo zeração 100% real no banco e no React Query ao clicar no botão de limpeza.
- **Correção da RPC `process_marco_zero_import`:** Fix do erro de casting `operator does not exist: date = text`, gravando `saldo_bancario` (R$ 170.244,95) e `total_patio` (R$ 107.229,76) reais no `daily_snapshots`.
- **Aperfeiçoamento do `marcoZeroParser.ts`:** Varredura robusta multi-linha da aba `SALDO` e extração precisa de `saldoBancos` e `totalPatio`.
- **Desbloqueio Total de Navegação e Seletor de Datas:**
  - Inclusão de `<input type="date">` nativo e interativo nos headers de conciliação diária e do card de Marco Zero em `ResumoDiaPanel.tsx`.
  - Atualização do hook `useAvailableConciliacaoDates` para indexar automaticamente datas de `pos_transactions`, `patio_os`, `ofx_transactions`, `daily_snapshots` e o dia atual.
  - Navegação fluida com fallbacks para evitar travamento em qualquer data específica (14/08, 18/08, 19/08, etc.).

## Feature 239: Redesign Widescreen do Modal de Maquininhas & Refinamento dos Cards de Lojas
- **Modal Widescreen 2XL (`Modal.tsx` & `MaquininhasDetailModal.tsx`):**
  - Adição do controle dinâmico de largura `size="2xl"` (`max-w-6xl`) no componente `Modal.tsx`.
  - Expansão do modal de maquininhas: visualização dos 4 KPIs sem quebra de números (`R$ 36.317,07`) e tabela de conciliação tripla ampla com status claros (`ENTROU`, `PARCIAL`, `NÃO ENTROU`) e transações OFX vinculadas.
- **Refinamento dos Cards de Fechamento por Loja (`conciliacao.index.tsx`):**
  - Layout 2-Tier com cabeçalho limpo (identidade da filial, chips de status da maquininha e conformidade) e grid de 6 métricas proporcionais e alinhadas (`SALDO BANCOS`, `MAQUININHA`, `PIX`, `NA LOJA OS`, `PREVISTO`, `DIFERENÇA`).
- **Resolução de Conflitos de Sobrecarga no PostgreSQL:**
  - Eliminação de assinaturas duplicadas para `process_marco_zero_import` e `get_daily_reconciliation_summary`, garantindo chamadas RPC 100% livres de erros de ambiguidade no Supabase.











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

## Feature 261: Saldo Total Bancário OFX e Tabela Interativa de Edição Livre de OSs no Preview
- Card de Extratos Bancários atualizado para **"Saldo Total Bancário (OFX)"** com a soma consolidada das entradas de todos os extratos importados e a contagem total de lançamentos.
- Tabela completa e interativa de Ordens de Serviço Importadas no Step 3 do `CentralImportWizard.tsx` com busca por OS/placa/filial, filtro por loja e filtro por status.
- Inputs editáveis inline para **Valor Total OS (R$)** (`os.total_value`), **Total Pago no Dia (R$)** (`os.paid_value`) e **Status** (`em_aberto`, `pago_parcial`, `finalizado`, `cancelado`).
- Cálculo reativo em tempo real do **Saldo Pendente** (`Math.max(0, total_value - paid_value)`), cards de resumo do topo (`Total OS`, `Estoque em Pátio`) e previsões por filial.
- Persistência integral das OSs editadas em `patio_os`, `reconciliations` (`na_loja_os`) e `daily_snapshots` no fechamento diário (`executeDailyClosing`).

## Feature 262: Tabela Exclusiva de OSs Ausentes no Preview de Importação
- Remoção da tabela genérica de todas as OSs importadas do Step 3 do `CentralImportWizard.tsx`.
- Restauração e aprimoramento da rotina `detectMissingOs` que cruza o banco com os arquivos e isola exclusivamente as OSs ativas ausentes.
- Tabela interativa dedicada com inputs inline de **Valor Total (R$)**, **Total Pago (R$)**, **Saldo Pendente Calculado** e **Status** (`em_aberto`, `pago_parcial`, `finalizado`, `cancelado`).
- Busca rápida por placa, OS ou loja dentro das ordens ausentes.
- Persistência atômica das alterações em `patio_os` durante o fechamento diário (`executeDailyClosing`).

## Feature 263: Tabela Unificada de OSs no Preview com Filtros Rápidos e Edição Livre
- Tabela unificada permanente de Ordens de Serviço no Step 3 do `CentralImportWizard.tsx` consolidando OSs das planilhas importadas e OSs ausentes do banco.
- 4 Pílulas de filtro rápido com contadores em tempo real: **Todas as OSs**, **Ausentes no Relatório**, **Recebimentos do Dia** e **Estoque em Pátio**.
- Edição inline livre de **Valor Total OS (R$)**, **Total Pago (R$)** e **Status** com recálculo reativo dos cards de resumo e saldos por filial.
- Busca textual por placa, número da OS e filial, com filtro por loja e paginação de 50 itens por página.
- Persistência atômica das alterações em `patio_os` no fechamento diário (`executeDailyClosing`).

## Feature 264: Motor de Diagnóstico Pré-Conciliação no Step 3
- Hook `useDiagnosticEngine.ts` que consulta os últimos 5 fechamentos em `daily_snapshots` e calcula o Caixa Projetado e desvios por fonte.
- Componente `DiagnosticPanel.tsx` integrado no Step 3 do `CentralImportWizard.tsx` exibindo tabela de conferência dos 5 pilares patrimoniais (Pátio, Banco OFX, Dinheiro MP, A Receber, Contas a Pagar + Juros) com semáforo (`Conforme`, `Atenção`, `Divergente`).
- Indicação automática da origem da divergência com callout explicativo quando a variação ultrapassa a tolerância dinâmica (`max(R$ 500, 2% do faturamento)`).

## Feature 265: Correção de RPC Tripla de Maquininhas e Transparência em Contas
- Correção do parâmetro `p_target_date` no hook `usePosTripleReconciliation` em `useBackendConciliacao.ts`.
- Migration `20260824000001_overload_get_store_pos_triple_reconciliation.sql` unificando a assinatura SQL para aceitar tanto `p_target_date` quanto `p_date`.
- Detalhamento transparente da composição do card de Contas no `ResumoDiaPanel.tsx`: Base da Planilha + Despesas Manuais Avulsas (`daily_manual_bills`) + Juros Rede = Subtotal a Cobrir.

## Feature 266: Alinhamento de Conciliação com Excel Oficial e Âncora de Dia Útil
- Atualização da RPC `get_daily_reconciliation_summary` e hook `usePreviousDaySnapshot` para buscar o último snapshot consolidado (`caixa_atual > 0`), ignorando fins de semana vazios.
- Cálculo de Caixa Líquido com dedução automática do saldo negativo das contas Itaú.
- Integração de ajustes de faturamento (Sucatas) e despesas de pró-labore na apuração do resultado diário.

## Feature 267: Painel de Edição de OSs Ausentes no Pátio e Deduplicação da Rede
- Componente `MissingPatioOsEditor.tsx` integrado no Step 3 do `CentralImportWizard.tsx` para visualização e edição inline (Valor Total, Valor Pago, Status) de OSs que não vieram nos arquivos de hoje.
- Sincronização individual e granular de todas as 69 OSs do Excel oficial no banco `patio_os` (totalizando R$ 88.212,39 exatos).
- Deduplicação determinística em `useTransactions.ts` para `pos_transactions` e eliminação de transações repetidas da Rede em Santo André.
### Spec 314 — Auditoria de Integridade de Saldos, Deduplicação OFX Multi-Dias e Ciclo Rede
- **Eliminação de Trigger Destrutiva**: Drop definitivo da trigger update_reconciliation_bank_total e de update_bank_total_from_transactions, garantindo que o saldo patrimonial <LEDGERBAL> do extrato nunca seja sobrescrito por soma de transações.
- **RPC get_store_pos_triple_reconciliation**: Cálculo 100% dinâmico de 
ao_entrou_valor (cartões a compensar) sem hardcodes legados de filiais, apurando GREATEST(0, rede_liquido - ofx_maquininhas).
- **RPC get_dashboard_metrics**: Alinhamento 1:1 com a regra canônica dos 5 Pilares e dedução estrita de Cheque Especial (saldo_negativo_itau).
- **CentralImportWizard.tsx & useTransactions.ts**: Partição temporal estrita por <DTPOSTED> para transações OFX individuais, prevenindo que extratos com dados de 2 dias (D-1 e D) dupliquem depósitos da Rede em uma única data.
- **Frontend & ResumoDiaPanel.tsx**: Eliminação de cálculos paralelos no frontend, delegação total para RPCs e preservação de ank_total no upsert histórico de reconciliações.

### Spec 284 — Reestruturação Canônica da Tela de Recebíveis e Integração do Pilar 3
- **src/routes/recebiveis.tsx**: Alinhamento 1:1 com o padrão canônico de `src/routes/patio.tsx`, com 4 Summary Cards com `border-l-4`, abas de status (`Todas`, `Em Aberto`, `Vencidos`, `Liquidados`), timeline de boletos com badges de OS, parcela e vencimento, e paginação canônica.
- **Filtro de Filiais Ativas**: Exibição exclusiva no dropdown e listas das lojas que possuem títulos registrados (Mauá - MHE R$ 10.394,50, Planalto - BRASICAR R$ 1.120,00, Piraporinha - EMPORIO R$ 300,00).
- **Higienização de Banco de Dados**: Expurgados 83 registros legados mock (`Outros`), mantendo os 5 boletos autênticos de 25/08/2026 totalizando exatamente R$ 11.814,50.
- **Integração Pilar 3 da Conciliação**: Atualização da RPC `get_daily_reconciliation_summary` e de `ResumoDiaPanel.tsx` para refletir os R$ 11.814,50 de A Receber com link de navegação rápida.
- **Parser de Recebíveis**: `src/lib/parsers/recebiveisParser.ts` para extração automática da aba `RECEBIVEIS ` das planilhas `CONCILIAÇÃO *.xlsx`.

### Spec 283 — Congelamento Imutável de Snapshots e Isolamento Histórico de Conciliação
- **Period Close Locking**: Implementação de colunas `is_closed` e `closed_at` em `daily_snapshots`.
- **RPC `get_daily_reconciliation_summary`**: Bifurcação contábil (Branch 1: Leitura congelada instantânea para dias homologados com `is_closed = true`; Branch 2: Cálculo dinâmico em tempo real para dias abertos).
- **Isolamento de Contas a Pagar**: `daily_snapshots.contas_a_pagar` reservado exclusivamente para a Base da Planilha (`BuscaContasAPagar.xls`), com despesas manuais extras isoladas em `daily_manual_bills`.
- **Correção da Tripla Conciliação de Maquininhas**: Remoção de cláusulas de exclusão hardcoded em `get_store_pos_triple_reconciliation`, integrando 100% das 10 filiais no cálculo de cartões a compensar.
- **ResumoDiaPanel.tsx**: Badge visual de *Dia Consolidado (Imutável)* e proteção contra duplicação de despesas na mutação de salvamento.

### Spec 278 — Motor de Cálculo Direto das Fontes Brutas e Desduplicação de Contas
- **useOsImportProcessor.ts**: Mapeamento estrito de R$ Total da OS e Restante na OS diretamente dos arquivos do ERP, eliminando a sobreposição de Total no Financeiro.
- **MissingPatioOsEditor.tsx**: Preservação automática no pátio para veículos de dias anteriores (carryover de 4 OSs) por padrão sem induzir baixa acidental.
- **RPC get_daily_reconciliation_summary**: Apuração de _contas_manual diretamente de daily_manual_bills (R$ 29.999,51) sem duplicar com contas_base do snapshot.

### Spec 276 — Refinamento Estrito do Modal de Vínculo Manual de PIX com OS
- **useManualMatch.ts**: useAvailableStoreOs com isolamento rigoroso por filial (storeId), exclusão de OSs já vinculadas em ofx_transactions (matched_os_number IS NOT NULL), bloqueio de OSs puramente em Cartão/Dinheiro sem saldo em aberto, e filtro estrito para pagamentos em PIX.
- **ManualMatchOsModal.tsx**: Ordenação e match score estritamente comparando com o valor esperado de PIX (pix_transfer_value ou saldo restante) em vez de valores pagos em cartão.
- **StoreExtratoBancarioView.tsx**: Repasse explícito de targetDate para o modal de vínculo manual.

### Spec 275 — Previsto = Total Entradas OFX, Diferença = Pendentes Não Justificados + Guardrails de Auto-Match de PIX
- **RPC get_daily_reconciliation_summary**: Previsto por loja padronizado para soma total de entradas OFX do dia. Diferença por loja refletindo o saldo exato de entradas pendentes de identificação/justificativa.
- **CentralImportWizard.tsx**: 4 guardrails ativos no auto-match de PIX (valor mínimo >= R$ 10, filtro de rendimentos/aplicação financeira, exigência de PIX esperado na OS > 0 e tolerância < R$ 0,10).
- **StoreExtratoBancarioView.tsx & conciliacao.index.tsx**: Harmonização visual e computacional da classificação de liquidações da Rede e status de conciliação por filial.

### Spec 274 — Motor Inteligente de Auto-Match (Rede ↔ OS) e Carry-Over de Pátio
- **useImportProcessor.ts**: Auto-match inteligente entre transações da Rede e OSs em aberto na filial para quitação automática sem intervenção manual.
- **patio_os**: Preservação cumulativa de carros em pátio de datas anteriores (carry-over).
- **Sincronização 24/08**: Pátio total de R$ 88.212,39 com 100% de aderência às 10 filiais do fechamento real.

### Spec 273 — Ajuste Matemático Estrito da RPC de Conciliação
- **get_daily_reconciliation_summary**: Unificação dinâmica de total_saldo_banco (OFX + Dinheiro Cofre + Maquininhas a Compensar) e caixa_atual sem alteração na tabela de snapshots.
- **ResumoDiaPanel.tsx**: Consumo direto de summary.total_saldo_banco no Card 1.

### Spec 272 — Apuração Automática de Dinheiro no Cofre e Maquininhas a Compensar por Filial
- **useOsImportProcessor.ts**: Separação canônica de pagamentos em DINHEIRO em cash_value/parsed_cash.
- **useImportProcessor.ts**: Sincronização automática em store_cash_vault (status em_transito vs depositado com base na janela contábil).
- **get_daily_reconciliation_summary**: Apuração de dinheiro_loja, saldo_banco_ofx e nao_entrou_valor consolidando com 100% de precisão no modal SaldoBancosDetailModal.

# Global Features

## Feature 217: Auditoria de MDR e Divergência Contratual Multi-Loja (Rede)
- Cálculo da Taxa Efetiva de MDR: `(1 - (líquido / bruto)) * 100`.
- Comparação contra tabela oficial de contratos (`pos_fee_contracts`) e alerta de divergência contratual.

## Feature 218: Tela Dedicada de Auditoria de Taxas, MDR Diário e por Transação (/taxas)
- Substituição da antiga rota `/alertas` pela nova `/taxas` no menu principal (`Sidebar.tsx` e `BottomNav.tsx`).
- Visão Diária com evolução de faturamento bruto, líquido, retenção em R$ e % média de MDR diária.
- Visão Transacional linha a linha com cálculo de taxas, desvio e prejuízo por venda de cartão.
- Gestão ativa de contratos de taxas (`ContractFeeEditorModal.tsx`) e exportação de planilha CSV de contestação.

## Feature 219: Faturamento Atual com Justificativas e Resolução de Diferenças na Loja
- Renomeação de *Faturamento Líquido* para *Faturamento Atual* e do input manual para *Faturamento Mapa de Metas*.
- Cálculo unificado: `Faturamento Atual = Faturamento Mapa de Metas + Soma(Transações Justificadas)`.
- Abatimento das transações justificadas no Previsto de cada loja em `conciliacao.index.tsx`, zerando a diferença da filial.
- Modal `FaturamentoAtualBreakdownModal.tsx` ao clicar no card de Faturamento Atual para exibir detalhamento linha a linha de cada justificativa.

## Feature 220: Correção de Justificativas no Faturamento e Redesign do Card de Diferença Final
- Correção de schema na busca de transações justificadas (`bank_name`, `counterpart_name` em vez de `title`) e suporte a justificativas por `manual_category`.
- Sincronização da tabela `transactions` no hook `useCategorizeOrphan.ts`.
- Redesign premium e harmonioso do card lateral de *Diferença Final* no `ResumoDiaPanel.tsx` com tipografia ampliada, gradiente suave e badge de tolerância.

## Feature 221: Vínculo Manual de PIX/Banco com OS, Desvinculação e Proteção contra Duplicidade
- Modal `ManualMatchOsModal.tsx` para busca e vínculo direto de qualquer transação bancária/PIX com as Ordens de Serviço da filial.
- Ação de `Desvincular` em `PixVsOfxTable.tsx` para corrigir OSs pagas em dinheiro vinculadas a PIX por engano.
- Regra contábil estrita: transações vinculadas a OS baixam a OS e o extrato bancário sem somar ao Faturamento Atual (evitando duplicar com o Mapa de Metas).

## Feature 222: Ajuste da Tabela de Cartão da Maquininha (Bruto, Taxa MDR, Líquido e Bandeira)
- Remoção completa da média artificial (`R$ 2.907,025` / divisão por lote) na coluna de banco.
- Exibição de colunas transparentes e individuais por venda: Bandeira/Modalidade (*Visa, Mastercard, Elo, Hipercard, Amex, PIX*), Bruto, Taxa MDR (-R$ e %), Líquido Creditado, Referência/OS e Status.
- Cards do topo atualizados com Total Bruto, Total Taxas Retidas e Total Líquido a Receber.

## Feature 223: Auditoria de Status de Liquidação Bancária para Cartões e PIX de OS
- Exibição rica dos dados do extrato Itaú (contraparte, banco e valor) para PIXs confirmados.
- Modal `LinkOfxToOsModal.tsx` acionado diretamente pela tabela de PIX para vincular OSs pendentes a depósitos bancários avulsos.
- Status claro de liquidação bancária para lotes de cartões (`Liquidado no Banco` vs `Aguardando Compensação`).

## Feature 224: Conciliação Atemporal e Persistente de PIX (OFX-Centric)
- Inversão da polaridade para modelo *OFX-First Ledger*: fluxo guiado pela entrada real de dinheiro no banco.
- Busca atemporal no pool de OSs abertas do pátio em janela de $\pm 15$ dias.
- Regra de Ouro da Unicidade Estrita: auto-match apenas para valores 1:1 sem ambiguidade; múltiplas OSs com o mesmo valor geram sugestão para confirmação humana com 1 clique.
- Persistência imutável em banco relacional: reimportações diárias de relatórios de pátio não desfazem os vínculos já estabelecidos.

## Feature 225: Justificativa com Controle de Faturamento e Redesign de Vínculo de OS
- Modal `OrphanCategorizationModal.tsx` com opção explícita: "Somar ao Faturamento da Loja" (receitas sem OS) vs "Apenas Conciliar (NÃO Somar)" (Rendimentos, Marco Zero, transferências entre filiais, aportes).
- `useJustifiedTransactions.ts` somando no Faturamento Atual apenas transações justificadas que realmente impactam receita.
- Redesign completo do `ManualMatchOsModal.tsx`: desduplicação estrita de OSs, matches exatos no topo com badge verde luminoso e botão largo de vínculo.
- Reversão e limpeza de justificativas de teste para novos ensaios.

## Feature 226: Correção de Filtro PIX vs Movimentações Bancárias e Sincronização de Diferenças por Loja
- Isolamento estrito de PIX de clientes: termos corporativos e bancários (`SISPAG`, `REND PAGO`, `APLIC AUT`, `TRANSF CC`, `APORTE`, `RESGATE`, `APLICACAO`, `TAR BANCARIA`, `BOLETO`) são proibidos de entrar no pool de PIX de OS e direcionados 100% para a aba de *Entradas Avulsas*.
- Desvinculação no banco de 11 falsos matches automáticos de aportes, transferências de óleo e rendimentos que estavam indevidamente atrelados a OSs.
- Sincronização e abate automático na Diferença da filial no fechamento por loja para todas as entradas justificadas como "Apenas Conciliar (Não Somar)".
- Badge dinâmico de contagem de pendências avulsas na aba 4 da conciliação por loja.

## Feature 227: Métricas do Dashboard e Gráfico de Evolução Macro 100% no PostgreSQL RPC
- Migração completa dos cálculos do Dashboard para a RPC PostgreSQL `get_dashboard_metrics`: zero cálculos no frontend.
- Gráfico de Evolução Macro alimentado pela série cronológica de snapshots fechados do mês (`daily_snapshots`), desenhando as curvas de Saldo, Faturamento e Contas a Pagar.
- Mapeamento normalizado de filiais com saldo bancário real (`R$ 186.496,03`) e pátio (`33 veículos / R$ 92.746,71`).
- Comparação dinâmica de Faturamento Atual vs Anterior ancorada no último fechamento registrado (Marco Zero / Período).

## Feature 228: Redesign do Dashboard com Tabs de Análise por Unidade e Tabela Horizontal
- Card de Análise Setorial por Unidades (`StoreAnalyticsTabs.tsx`) em tela cheia com 3 abas: Saldo Bancário (Itaú), Faturamento (OFX) e Contas (OFX).
- Cada aba com Donut Chart, centro luminoso exibindo Total Líquido, 4 cards de KPIs da dimensão e ranking das 10 unidades com barras de progresso proporcionais.
- Tabela "Resultado por Loja" em layout widescreen espaçoso e horizontal.

## Feature 230: Redesign da Etapa 4 de Importação Central (Orquestração Multi-Agente de IA)
- Remoção dos 4 cards estáticos redundantes e da barra de gradiente pesada no wizard de importação.
- Redesign completo com foco no painel de orquestração multi-agente (`AgentStageItem.tsx`), detalhando os 4 agentes especializados (Car, CreditCard, Landmark, Sparkles) com badges dinâmicos de status, sub-etapas e telemetria.
- Ajuste na RPC do Dashboard para desaninhar corretamente o JSON escalar de `diferenca_final`.

## Feature 231: Diagnóstico de Conciliação e Cartões a Compensar (18/08)
- Mapeamento matemático das regras da planilha de conciliação diária (`CONCILIAÇÃO 1808.xlsx`).
- Dedução automática de pagamentos do dia no cálculo de saldo retido de Carros em Pátio (OSs).
- Isolamento estrito de snapshots diários (`daily_snapshots`) por data no fechamento.

## Feature 232: Whisper Dots e Audit Trail Discreto de Divergências na Conciliação
- Hook de inteligência analítica `useReconciliationInsights.ts` que cruza dados de cartões a compensar, PIX avulsos, OSs do pátio e contas vs saídas OFX.
- Componente `WhisperDot.tsx`: Micro-indicador estático e suave (4px) nos 5 pilares (`Saldo Banco Itaú`, `Dinheiro MP`, `A Receber`, `Na Loja OS`, `Contas (Manual)`) com tooltip nativo descritivo no hover.
- Componente `AuditTrailBar.tsx`: Barra colapsável e elegante abaixo da Consolidação do Dia (`⚙ N observações de conferência · Expandir`), detalhando cada causa raiz e delta financeiro sem poluição visual.

## Feature 233: Gestão de Acessos, Permissões Granulares e Logs Diários
- Gestão completa de usuários em `UserManagementPanel.tsx` e `CreateUserModal.tsx`: cadastro direto de novos acessos com E-mail, Senha e Papéis (`Admin`, `Operador`, `Visualizador`).
- Controle granular de privilégios (`can_import` e `can_edit_data`) com travas em tempo real no botão "Editar Fechamento" da conciliação e no fluxo de importações.
- Visualizador de Logs de Auditoria Diária (`DailyAuditLogsView.tsx`) com seletor de data (`< 18/08/2026 >`), linha do tempo vertical por tipo de ação e visualizador de detalhes técnicos / payload.
- Organização do menu `/configuracoes` em 3 abas intuitivas: *Acessos & Permissões*, *Logs de Auditoria Diária* e *Motor & Lojas*.

## Feature 234: Conciliação Tripla de Maquininhas, Saldo a Compensar e Batimento OFX
- RPCs `get_store_pos_triple_reconciliation` e `get_daily_reconciliation_summary` no Supabase: 100% dos cálculos no backend confrontando o Total Líquido das vendas da Rede contra a soma de todas as bandeiras do OFX (`REDE MAST`, `REDE VISA`, `REDE ELO`, etc.) e OSs com pagamentos em cartão.
- Inclusão automática das vendas de maquininhas pendentes de crédito bancário (`cartoes_a_compensar`) no Saldo do Pilar 1 (`total_saldo_banco = saldo_bancos_ofx + cartoes_a_compensar`) e no Caixa Atual.
- Redesign do Card 1 em `ResumoDiaPanel.tsx` com sub-linhas transparentes (`OFX: R$ ...` | `+ Maq: R$ ...`) no padrão visual do card de Contas.
- Modal `MaquininhasDetailModal.tsx` com visão widescreen dos 4 KPIs globais e tabela detalhada das 10 lojas com status de compensação (`ENTROU`, `PARCIAL`, `NÃO ENTROU`).

## Feature 235: Exibição e Soma de Maquininhas Não Entradas por Loja e no Consolidador Geral
- Enriquecimento da lista `stores` da RPC `get_daily_reconciliation_summary` com `saldo_banco_ofx`, `nao_entrou_valor`, `saldo_banco` (Consolidado: $\text{OFX} + \text{Não Entrou}$) e `status_compensacao` por filial.
- Atualização do card de cada uma das 10 filiais em `conciliacao.index.tsx`: exibição do Saldo Consolidado, sub-linhas (`OFX: R$ ...` | `+ Maq: + R$ ...`) e badge no cabeçalho da loja (`ENTROU` / `NÃO ENTROU (+ R$ ...)`).
- Header de `conciliacao.$lojaId.tsx` com painel de 4 métricas da maquininha da loja (Vendas Líquido, Creditado no OFX, A Compensar e Status de Compensação).

## Feature 237: Redesign Visual & Descompressão do Painel de Resumo do Dia
- **Descompressão dos 5 Pilares (`ResumoDiaPanel.tsx`):** Grid responsivo e espaçoso (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5`) com respiro, tipografia `font-mono` nítida em destaque e ícones sutis em badges com cantos arredondados.
- **Sub-linhas Alinhadas:** Sub-totais do Card 1 (`OFX: R$ ...` / `+ Maq: + R$ ...`) e do Card 5 (`Juros: R$ ...` / `Saídas OFX: - R$ ...`) perfeitamente alinhados horizontalmente, sem sobreposição de textos ou quebras de linha defeituosas.
- **Cockpit de Fechamento Integrado (3 Colunas):** Área inferior reorganizada em 3 colunas harmoniosas:
  1. *Dinâmica de Caixa:* Caixa Atual Consolidado + Fluxo de Caixa (Variação vs Dia Anterior).
  2. *Operação & Disponível:* Faturamento Atual (com link de detalhes `↗`) + Disponível para Contas.
  3. *Balanço do Fechamento & Diferença Final:* Card unificado com Total de Contas a Pagar, Diferença Final apurada em destaque e badge de conformidade ($\pm \text{R\$ 50}$).
- **Eliminação de Ruído Visual:** Remoção de frases e micro-rótulos redundantes que poluíam o painel, gerando uma experiência limpa de padrão FinTech executivo.

## Feature 238: RPC de Limpeza Geral Atômica & Sincronização e Desbloqueio de Datas do Marco Zero
- **RPC `clear_all_financial_data()` no PostgreSQL (`SECURITY DEFINER`):** Truncamento atômico com `CASCADE` das 20 tabelas transacionais (`ofx_transactions`, `pos_transactions`, `patio_os`, `estoque_os_pendente`, `reconciliations`, `daily_snapshots`, etc.), garantindo zeração 100% real no banco e no React Query ao clicar no botão de limpeza.
- **Correção da RPC `process_marco_zero_import`:** Fix do erro de casting `operator does not exist: date = text`, gravando `saldo_bancario` (R$ 170.244,95) e `total_patio` (R$ 107.229,76) reais no `daily_snapshots`.
- **Aperfeiçoamento do `marcoZeroParser.ts`:** Varredura robusta multi-linha da aba `SALDO` e extração precisa de `saldoBancos` e `totalPatio`.
- **Desbloqueio Total de Navegação e Seletor de Datas:**
  - Inclusão de `<input type="date">` nativo e interativo nos headers de conciliação diária e do card de Marco Zero em `ResumoDiaPanel.tsx`.
  - Atualização do hook `useAvailableConciliacaoDates` para indexar automaticamente datas de `pos_transactions`, `patio_os`, `ofx_transactions`, `daily_snapshots` e o dia atual.
  - Navegação fluida com fallbacks para evitar travamento em qualquer data específica (14/08, 18/08, 19/08, etc.).

## Feature 239: Redesign Widescreen do Modal de Maquininhas & Refinamento dos Cards de Lojas
- **Modal Widescreen 2XL (`Modal.tsx` & `MaquininhasDetailModal.tsx`):**
  - Adição do controle dinâmico de largura `size="2xl"` (`max-w-6xl`) no componente `Modal.tsx`.
  - Expansão do modal de maquininhas: visualização dos 4 KPIs sem quebra de números (`R$ 36.317,07`) e tabela de conciliação tripla ampla com status claros (`ENTROU`, `PARCIAL`, `NÃO ENTROU`) e transações OFX vinculadas.
- **Refinamento dos Cards de Fechamento por Loja (`conciliacao.index.tsx`):**
  - Layout 2-Tier com cabeçalho limpo (identidade da filial, chips de status da maquininha e conformidade) e grid de 6 métricas proporcionais e alinhadas (`SALDO BANCOS`, `MAQUININHA`, `PIX`, `NA LOJA OS`, `PREVISTO`, `DIFERENÇA`).
- **Resolução de Conflitos de Sobrecarga no PostgreSQL:**
  - Eliminação de assinaturas duplicadas para `process_marco_zero_import` e `get_daily_reconciliation_summary`, garantindo chamadas RPC 100% livres de erros de ambiguidade no Supabase.











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

## Feature 261: Saldo Total Bancário OFX e Tabela Interativa de Edição Livre de OSs no Preview
- Card de Extratos Bancários atualizado para **"Saldo Total Bancário (OFX)"** com a soma consolidada das entradas de todos os extratos importados e a contagem total de lançamentos.
- Tabela completa e interativa de Ordens de Serviço Importadas no Step 3 do `CentralImportWizard.tsx` com busca por OS/placa/filial, filtro por loja e filtro por status.
- Inputs editáveis inline para **Valor Total OS (R$)** (`os.total_value`), **Total Pago no Dia (R$)** (`os.paid_value`) e **Status** (`em_aberto`, `pago_parcial`, `finalizado`, `cancelado`).
- Cálculo reativo em tempo real do **Saldo Pendente** (`Math.max(0, total_value - paid_value)`), cards de resumo do topo (`Total OS`, `Estoque em Pátio`) e previsões por filial.
- Persistência integral das OSs editadas em `patio_os`, `reconciliations` (`na_loja_os`) e `daily_snapshots` no fechamento diário (`executeDailyClosing`).

## Feature 262: Tabela Exclusiva de OSs Ausentes no Preview de Importação
- Remoção da tabela genérica de todas as OSs importadas do Step 3 do `CentralImportWizard.tsx`.
- Restauração e aprimoramento da rotina `detectMissingOs` que cruza o banco com os arquivos e isola exclusivamente as OSs ativas ausentes.
- Tabela interativa dedicada com inputs inline de **Valor Total (R$)**, **Total Pago (R$)**, **Saldo Pendente Calculado** e **Status** (`em_aberto`, `pago_parcial`, `finalizado`, `cancelado`).
- Busca rápida por placa, OS ou loja dentro das ordens ausentes.
- Persistência atômica das alterações em `patio_os` durante o fechamento diário (`executeDailyClosing`).

## Feature 263: Tabela Unificada de OSs no Preview com Filtros Rápidos e Edição Livre
- Tabela unificada permanente de Ordens de Serviço no Step 3 do `CentralImportWizard.tsx` consolidando OSs das planilhas importadas e OSs ausentes do banco.
- 4 Pílulas de filtro rápido com contadores em tempo real: **Todas as OSs**, **Ausentes no Relatório**, **Recebimentos do Dia** e **Estoque em Pátio**.
- Edição inline livre de **Valor Total OS (R$)**, **Total Pago (R$)** e **Status** com recálculo reativo dos cards de resumo e saldos por filial.
- Busca textual por placa, número da OS e filial, com filtro por loja e paginação de 50 itens por página.
- Persistência atômica das alterações em `patio_os` no fechamento diário (`executeDailyClosing`).

## Feature 264: Motor de Diagnóstico Pré-Conciliação no Step 3
- Hook `useDiagnosticEngine.ts` que consulta os últimos 5 fechamentos em `daily_snapshots` e calcula o Caixa Projetado e desvios por fonte.
- Componente `DiagnosticPanel.tsx` integrado no Step 3 do `CentralImportWizard.tsx` exibindo tabela de conferência dos 5 pilares patrimoniais (Pátio, Banco OFX, Dinheiro MP, A Receber, Contas a Pagar + Juros) com semáforo (`Conforme`, `Atenção`, `Divergente`).
- Indicação automática da origem da divergência com callout explicativo quando a variação ultrapassa a tolerância dinâmica (`max(R$ 500, 2% do faturamento)`).

## Feature 265: Correção de RPC Tripla de Maquininhas e Transparência em Contas
- Correção do parâmetro `p_target_date` no hook `usePosTripleReconciliation` em `useBackendConciliacao.ts`.
- Migration `20260824000001_overload_get_store_pos_triple_reconciliation.sql` unificando a assinatura SQL para aceitar tanto `p_target_date` quanto `p_date`.
- Detalhamento transparente da composição do card de Contas no `ResumoDiaPanel.tsx`: Base da Planilha + Despesas Manuais Avulsas (`daily_manual_bills`) + Juros Rede = Subtotal a Cobrir.

## Feature 266: Alinhamento de Conciliação com Excel Oficial e Âncora de Dia Útil
- Atualização da RPC `get_daily_reconciliation_summary` e hook `usePreviousDaySnapshot` para buscar o último snapshot consolidado (`caixa_atual > 0`), ignorando fins de semana vazios.
- Cálculo de Caixa Líquido com dedução automática do saldo negativo das contas Itaú.
- Integração de ajustes de faturamento (Sucatas) e despesas de pró-labore na apuração do resultado diário.

## Feature 267: Painel de Edição de OSs Ausentes no Pátio e Deduplicação da Rede
- Componente `MissingPatioOsEditor.tsx` integrado no Step 3 do `CentralImportWizard.tsx` para visualização e edição inline (Valor Total, Valor Pago, Status) de OSs que não vieram nos arquivos de hoje.
- Sincronização individual e granular de todas as 69 OSs do Excel oficial no banco `patio_os` (totalizando R$ 88.212,39 exatos).
- Deduplicação determinística em `useTransactions.ts` para `pos_transactions` e eliminação de transações repetidas da Rede em Santo André.

## Feature 332: Correção da Diferença no Fechamento por Loja e Pendências OFX
- **Backend (`20260901000009_fix_store_difference_and_ofx_pendencias.sql`):** Atualizada a RPC `get_daily_reconciliation_summary` para calcular a Diferença por Loja estritamente pela CTE `ofx_unreconciled_agg` (soma de entradas OFX sem vínculo/categoria menos saídas sem conta a pagar).
- **Frontend (`StoreCardModulo1.tsx` & `conciliacao.$lojaId.tsx`):** Corrigido erro de digitação `"Diferena"`, ajustada a tolerância de centavos e sincronizado o cabeçalho das 6 métricas da filial com suporte nativo a query param `date`.

