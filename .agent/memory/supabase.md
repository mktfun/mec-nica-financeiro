## [2026-08-31] — [Feature ID: 316-pareamento-os-finalizada-e-encadeamento-odometro]

**Contexto:** Atualização da RPC `public.auto_match_transactions` com 3 camadas de matching (texto regex, saldo aberto e quitações em OSs finalizadas) e da RPC `public.get_daily_reconciliation_summary` para retornar `'faturamento_anterior'` no Ramal 2 com extração canônica de `metadata.odometro_hoje`.

**Regra aprendida:**
1. **Match de Quitação em OS Finalizada sem Inflar Pátio:**
   - Na RPC `auto_match_transactions(p_date)`, se a transação OFX for compatível com uma OS finalizada recentemente, o vínculo deve atualizar `ofx_transactions.matched_os_number` e `patio_os.matched_ofx_id`.
   - Se a OS já está com status `'finalizada'`, o PL/pgSQL **NÃO** deve alterar `paid_value` nem `status`, garantindo que o somatório dinâmico de `na_loja_os` permaneça inalterado.
2. **Retorno do Ramal 2 com `faturamento_anterior`:**
   - O objeto JSONB do Ramal 2 (dia aberto/draft) deve conter explicitamente a propriedade `'faturamento_anterior', ROUND(v_faturamento_anterior, 2)`.
   - `v_faturamento_anterior` busca do snapshot fechado anterior com a cadeia de fallback:
     `COALESCE((metadata->>'odometro_hoje')::numeric, (metadata->>'faturamento_anterior')::numeric, faturamento, 0)`.

## [2026-08-27] — [Feature ID: 303-correcao-faturamento-do-dia]

**Contexto:** Correção do Ramal 1 da RPC `get_daily_reconciliation_summary` para calcular `v_faturamento_oi_base = v_snapshot.faturamento - v_faturamento_anterior`, onde `v_faturamento_anterior` é buscado do snapshot fechado imediatamente anterior (`date < v_target_date ORDER BY date DESC LIMIT 1`). Retorno obrigatório de `faturamento_anterior` no payload JSON.

**Regra aprendida:**
1. No Ramal 1 da RPC, campos dependentes de diferencial de odômetro (como faturamento diário) precisam consultar o snapshot fechado do dia anterior para obter `faturamento_anterior`.
2. O payload JSON retornado deve sempre incluir:
   `'faturamento_oi_base', v_faturamento_oi_base, 'faturamento_periodo', v_faturamento_periodo, 'faturamento_anterior', v_faturamento_anterior`.

## [2026-08-27] — [Feature ID: 302-correcao-saldo-bancos-caixa-atual-e-acumulacao-ao-salvar]

**Contexto:** Correção do Ramal 1 da RPC `get_daily_reconciliation_summary` para recalcular `saldo_bancos_positivo` e `saldo_negativo_itau` sempre dos `reconciliations`, nunca do `daily_snapshots.saldo_bancario` (que pode estar inflado). Hotfix de dados no snapshot de 27/08.

**Regra aprendida:**
1. **Ramal 1 (is_closed=true) deve usar reconciliations para saldo bancário:**
   ```sql
   SELECT SUM(bank_total), SUM(CASE WHEN bank_total > 0 THEN bank_total ELSE 0 END), SUM(CASE WHEN bank_total < 0 THEN ABS(bank_total) ELSE 0 END)
   INTO v_saldo_bancos, v_saldo_bancos_positivo, v_saldo_negativo_itau
   FROM (SELECT DISTINCT ON (store_id) store_id, bank_total FROM reconciliations WHERE date <= v_target_date ORDER BY store_id, date DESC) lr;
   ```
2. **Campos de autoridade no snapshot:** `caixa_atual`, `dinheiro_mp`, `a_receber_manual`, `total_patio`, `faturamento`, `contas_a_pagar` = valores do snapshot. Apenas saldo bancário e cheque especial vêm dos reconciliations para evitar loops de acumulação.
3. **Hotfix de snapshots corrompidos:** Para corrigir um snapshot com valores inflados, usar UPDATE direto com `jsonb_build_object` para reconstruir o metadata corretamente — não usar UPSERT da aplicação pois pode re-inflar.

**Risco identificado:** Se as `reconciliations` de um dia fechado forem alteradas (por reimportação de OFX), o Ramal 1 agora retornará saldos distintos dos valores no snapshot. Este é o comportamento correto pois OFXs são a fonte da verdade.

**Não fazer:** Nunca salvar `saldo_bancario = total_saldo_banco_positivo` no snapshot. O campo canônico é `saldo_bancos_ofx` (OFX líquido puro). A composição com cofre e rede ocorre na RPC/frontend, não no campo persistido.

## [2026-08-27] — [Feature ID: 301-segregacao-saldo-negativo-cheque-especial-e-caixa-atual]

**Contexto:** Atualização da RPC `public.get_daily_reconciliation_summary` para calcular e segregar `saldo_bancos_positivo` e `saldo_negativo_itau`, além da unificação canônica da assinatura `(p_date text, p_force_dynamic boolean)` com eliminação de sobrecargas legadas.

**Regra aprendida:**
1. **Segregação de Saldos na RPC:**
   - `saldo_bancos_positivo`: `COALESCE(SUM(CASE WHEN bank_total > 0 THEN bank_total ELSE 0 END), 0)`
   - `saldo_negativo_itau`: `COALESCE(SUM(CASE WHEN bank_total < 0 THEN ABS(bank_total) ELSE 0 END), 0)`
   - `total_saldo_banco_positivo`: `saldo_bancos_positivo + dinheiro_em_lojas + cartoes_a_compensar - devolucoes_rede`
   - `caixa_atual`: `(total_saldo_banco_positivo + dinheiro_mp + a_receber + na_loja_os) - saldo_negativo_itau`
2. **Eliminação de Sobrecargas de RPCs:**
   - Sempre executar `DROP FUNCTION IF EXISTS` para todas as assinaturas antigas (`(date, boolean)`, `(text, boolean)`, `(text)`, `(date)`) antes de recriar a função para garantir que chamadas RPC via PostgREST/SDK não executem versões obsoletas.
3. **Resiliência do Ramal de Dias Fechados:**
   - Em `daily_snapshots`, campos calculados como `fluxo_caixa`, `valor_disp_contas`, `subtotal_contas`, `diferenca_final` estão armazenados no JSONB `metadata`. A leitura em PL/pgSQL deve usar `COALESCE((v_snapshot.metadata->>'chave')::numeric, fallback)`.

**Não fazer:** Nunca acessar colunas inexistentes na tabela física `daily_snapshots` dentro do PL/pgSQL; sempre consultar a coluna `metadata` para campos derivados de fechamento.

## [2026-08-26] — [Feature ID: 289-correcao-duplicacao-contas-manual-e-importacao]

**Contexto:** Correção definitiva da duplicação de Contas (Manual) na RPC canônica `public.get_daily_reconciliation_summary` através da discriminação estrita entre contas importadas de ERP (`external_code IS NOT NULL`) e despesas manuais avulsas (`external_code IS NULL`) na tabela `public.daily_manual_bills`.

**Regra aprendida:**
1. **Deduplicação de Contas a Pagar na RPC:** Ao calcular `contas_manual`, a RPC nunca pode somar cegamente `v_snapshot.contas_a_pagar` com `SUM(daily_manual_bills)`, pois a importação de planilhas grava a soma no snapshot E popula os registros detalhados em `daily_manual_bills` (com `external_code`).
2. **Discriminador Canônico `external_code`:**
   - `v_contas_imported_bills` = `SUM(amount) WHERE external_code IS NOT NULL`
   - `v_contas_extras` = `SUM(amount) WHERE external_code IS NULL` (despesas avulsas criadas no modal)
   - `v_contas_base` = `COALESCE(NULLIF(v_snapshot.contas_a_pagar, 0), v_contas_imported_bills, 0)`
   - `v_contas_manual` = `v_contas_base + v_contas_extras`
3. **Idempotência de Importação:** O hook `useContasAPagarImport.ts` limpa apenas `WHERE external_code IS NOT NULL`, preservando 100% dos lançamentos manuais (`external_code IS NULL`).

**Risco identificado:** Se uma migration futura reescrever a RPC sem filtrar por `external_code IS NULL` para `v_contas_extras`, o total de contas da conciliação dobrará novamente.

**Não fazer:** Nunca somar `daily_snapshots.contas_a_pagar` diretamente com a soma total irrestrita de `daily_manual_bills`.

## [2026-08-25] — [Feature ID: 286-automacao-recebiveis-boletos-transferencias-e-match-ofx]

**Contexto:** Criação da RPC `public.auto_match_receivables` para conciliação automática de recebíveis (Boletos e Transferências) com créditos do extrato OFX (`type = 'in'`) e índices compostos de alta performance na tabela `public.receivables`.

**Regra aprendida:**
1. **Schema Canônico de `ofx_transactions`:** As colunas canônicas da tabela `ofx_transactions` para descritivo e identificação são `counterpart_name`, `fitid`, `matched_os_number`, `amount` e `target_date`. Não existem colunas `memo` ou `notes` em `ofx_transactions`.
2. **Tolerância de Tarifas Bancárias no Match:** Ao casar boletos com extratos bancários, aplicar tolerância de tarifas de liquidação (até R$ 5,00) via `ROUND(ABS(ofx.amount), 2) BETWEEN (ROUND(rec.value, 2) - 5.00) AND ROUND(rec.value, 2)`, registrando a diferença em `receivables.discount_value` para manter a integridade da baixa contábil.
3. **Índices de Unicidade e Match:** Os índices `idx_receivables_os_inst ON public.receivables (store_id, os_number, installment)` e `idx_receivables_type_due ON public.receivables (store_id, type, due_date, status)` aceleram as consultas de agregação e o auto-match em milissegundos.

**Não fazer:** Nunca tentar consultar colunas `memo` ou `notes` em `ofx_transactions` sem inspecionar previamente o schema.

## [2026-08-25] — [Feature ID: 285-correcao-definitiva-rpc-conciliacao-e-limpeza-backend]

**Contexto:** Eliminação do erro fatal 400 (42703: column r.pix_total does not exist) em dias fechados, restauração do cálculo do saldo bancário patrimonial consolidado em dias abertos, eliminação de sobrecargas conflitantes e criação de índices de alta performance para a RPC `get_daily_reconciliation_summary`.

**Regra aprendida:**
1. **Schema Integrity em RPCs com JOINs:** Nunca fazer referências a colunas presumidas (ex: `r.pix_total`, `r.rede_total`) em tabelas históricas (`reconciliations`) sem validar a existência no `information_schema.columns`. Em `reconciliations`, os nomes canônicos são `bank_total`, `machine_total`, `machine_fees`, `na_loja_os`.
2. **Saldo Bancário vs Fluxo Líquido do Dia:** Em conciliações diárias, o Saldo Bancário das filiais (`v_saldo_bancos`) representa o **patrimônio consolidado em conta corrente** (`reconciliations.bank_total` / `daily_snapshots.saldo_bancario`). Nunca substituir o saldo patrimonial pela soma transacional de entradas menos saídas (`SUM(in - out)`) do dia, pois o saldo de abertura já absorve os históricos passados.
3. **Eliminação Estrita de Sobrecargas:** Ao evoluir a assinatura de RPCs (ex: de `(text, boolean)` para `(date, boolean)`), sempre emitir `DROP FUNCTION IF EXISTS` para todas as variações de tipos de argumentos antes de recriar a função canônica, prevenindo conflitos de resolução de tipo no PostgREST.

**Risco identificado:** A alteração de tipos ou nomes de colunas em migrations parciais pode quebrar silenciosamente consultas do PostgREST para dias com ramos condicionais (`is_closed = true`).

**Não fazer:** Nunca misturar a movimentação líquida do dia com o saldo em conta corrente na composição do Pilar 1 (Saldo Bancos).

## [2026-08-25] — [Feature ID: 283-congelamento-imutavel-snapshots-e-isolamento-historico-conciliacao]

**Contexto:** Implementação do princípio de Period Close Locking (`daily_snapshots.is_closed = true`) e isolamento estrito de contas a pagar (`contas_a_pagar` = base da planilha; `daily_manual_bills` = extras manuais) para evitar regressão histórica e duplicação em cascata.

**Regra aprendida:**
1. **Period Close Locking:** Quando um dia contábil é homologado e fechado (`is_closed = true`), a RPC `get_daily_reconciliation_summary` deve retornar a fotografia congelada daquele dia. Edições de OSs de hoje (D) jamais podem alterar o pátio de dias passados (D-N) retroativamente.
2. **Isolamento de Contas a Pagar:** O campo `daily_snapshots.contas_a_pagar` deve armazenar estritamente a Base da Planilha. As despesas manuais extras residem exclusivamente em `daily_manual_bills`. A mutação `saveSnapshot` do frontend é terminantemente proibida de salvar a soma (`contas_base + contas_extras`) dentro da coluna `contas_a_pagar`, prevenindo exponenciação e duplicação contábil.
3. **Tripla Conciliação de Maquininhas:** A apuração de valores a compensar em `get_store_pos_triple_reconciliation` deve abranger todas as 10 filiais sem cláusulas de exclusão hardcoded (`s.id NOT IN ('st-01', 'st-05')`).

**Não fazer:** Nunca permitir que o botão Salvar do painel grave o valor total consolidado de despesas dentro da coluna base de despesas do snapshot.

## [2026-08-24] — [Feature ID: 274-motor-automatch-rede-os-e-carryover-patio]

**Contexto:** Sincronização forense de patio_os (OS #2326 e OS #1847) e consolidação exata das 10 lojas em na_loja_os.

**Regra aprendida:** O campo os_number na tabela patio_os é do tipo text e deve ser consultado/alterado com literais de texto (ex: os_number = '2326').

## [2026-08-24] — [Feature ID: 273-varredura-calculos-rpc-e-pilares-saldo]

**Contexto:** Correção das variáveis internas v_total_saldo_banco e v_caixa_atual na RPC get_daily_reconciliation_summary.

**Regra aprendida:** A RPC deve agregar v_total_saldo_banco := v_saldo_bancos + v_dinheiro_em_lojas + v_cartoes_a_compensar antes de compor o v_caixa_atual.

**Não fazer:** Não usar v_saldo_bancos (que é apenas OFX) diretamente na fórmula do caixa_atual.

## [2026-08-24] — [Feature ID: 272-apuracao-dinheiro-loja-e-maquininhas-pendentes]

**Contexto:** Atualização da RPC get_daily_reconciliation_summary e tabela store_cash_vault para controle de dinheiro físico em cofre com status em_transito vs depositado.

**Regra aprendida:**
1. Na RPC de conciliação, dinheiro_loja deve filtrar estritamente por status = 'em_transito' e entry_date <= v_target_date.
2. A tabela store_cash_vault deve possuir índice em (store_id, entry_date, status) para evitar sequential scans em agregações diárias.
3. Saldo consolidado da filial no banco é composto por: bank_total (OFX) + dinheiro_loja + nao_entrou_valor (maquininhas a compensar).

**Risco identificado:** Consultar tabelas de conciliação com nomes de colunas incorretos (ex: bank_total vs balance_amount) pode quebrar a RPC inteira.

**Não fazer:** Nunca usar WHERE entry_date = v_target_date para dinheiro em cofre, pois valores em trânsito de dias anteriores (ex: fim de semana) ainda não depositados seriam omitidos.

# Memória Modular — Supabase & Edge Functions (supabase.md)

## [2026-07-31] — Feature ID: fix-ai-provenance-and-conversation-isolation

**Contexto:**
Garantia de salvamento de mensagens do assistente no banco de dados e isolamento estrito de histórico por conversa.

**Regras aprendidas:**
1. **Persistência de Retaguarda na Edge Function:** Gravando as mensagens geradas pelo assistente diretamente no evento `onFinish` do `streamText` usando `supabaseAdmin` (com `SUPABASE_SERVICE_ROLE_KEY`), a gravação ocorre de forma 100% confiável no servidor. Isso evita perda de histórico ao dar refresh (F5).
2. **Preservação de Histórico de Ferramentas:** Ao converter mensagens para `CoreMessage` no backend, mantenha a referência visual ou funcional de ferramentas executadas nos turnos anteriores para que o LLM não perca a memória de dados recém-consultados.
3. **Filtro Estrito no Supabase Realtime:**Listeners em tempo real devem sempre validar `payload.new.conversation_id === activeConversationIdRef.current` para evitar cruzamento de dados de conversas concorrentes.

## [2026-08-10] � Feature ID: 149-conciliation-details

**Contexto:** RPCs para ler raw data.

**Regra aprendida:** Use SECURITY DEFINER e SET search_path = public em fun��es RPC.

**Risco identificado:** Acesso acidental a dados brutos de outras lojas (vazamento).

**N�o fazer:** Esquecer do filtro store_id = p_store_id nas RPCs.

## [2026-08-10] � Feature ID: 150-fix-raw-data-modals

**Contexto:** As 3 RPCs criadas na spec 149 retornavam 0 linhas porque o par�metro era p_store_id uuid mas o campo store_id nas tabelas patio_os, pos_transactions e ofx_transactions � do tipo 	ext no schema real.

**Regra aprendida:** SEMPRE inspecionar information_schema.columns para confirmar o tipo exato do campo antes de criar par�metros de RPC. Nunca assumir uuid � verifique via supabase db query. O �nico campo que � uuid de verdade � stores.id; todos os campos store_id de refer�ncia s�o 	ext.

**Risco identificado:** RPCs com tipo errado compilam sem erro e o build passa. O bug � silencioso � retorna 0 linhas em vez de erro vis�vel.

**N�o fazer:** Criar par�metros de RPC com tipo uuid sem confirmar no schema. O cast impl�cito text?uuid do Postgres nem sempre funciona no contexto de compara��o direta.

## [2026-08-10] — [Feature ID: 158]

**Contexto:** Correção de erro de CORS na Edge Function `sync-oficina` disparada pelo frontend (Lovable App).

**Regra aprendida:** O Supabase injecta nativamente cabeçalhos de `authorization`, `x-client-info` e `apikey` nas invocações `supabase.functions.invoke()`. Portanto, qualquer Edge Function escrita em Deno **deve obrigatoriamente** interceptar `OPTIONS` (preflight) e devolver `Access-Control-Allow-Headers` permitindo explicitamente esses 3 headers, além de `content-type`. Retornar apenas `Allow-Origin: *` não é suficiente e causa erro de rede no browser.

**Risco identificado:** Esquecer a constante `corsHeaders` em novas Edge Functions vai derrubar o frontend em produção logo no primeiro clique por falha de segurança de rede (CORS bloqueado).


## [2026-08-14] — [Feature ID: 195-fix-na-loja-os-math]

**Contexto:** Desacoplamento da tabela `estoque_os_pendente` das RPCs `get_dashboard_metrics` e `calculate_daily_conciliation` para manter as métricas diárias isoladas de passivos legados.

**Regra aprendida:** Quando o histórico de migrations remotas do Supabase Cloud estiver dessincronizado e `supabase db push` falhar em políticas/tabelas já existentes de migrations antigas, use `npx supabase db query --linked --file <path>` para aplicar SQL DDL/funções de forma atômica e direta. Além disso, lembre-se que `transactions` é uma VIEW unificada (não aceita DELETE direto); deleções devem mirar `ofx_transactions` ou `manual_transactions`.

**Risco identificado:** Tentar fazer DELETE direto em views do Postgres (`transactions`) retorna erro HTTP 500 (SQLSTATE 55000: cannot delete from view).

**Não fazer:** Nunca emitir DELETE direto em views postgres; aplique sempre nas tabelas base subjacentes.


## [2026-08-14] — [Feature ID: 196]

**Contexto:** Criação da RPC `get_daily_reconciliation_summary(p_date date)` para consolidação atômica e instantânea (< 20ms) de todas as métricas financeiras diárias.

**Regra aprendida:**
1. Toda agregação pesada de extratos, taxas e conciliações deve ser encapsulada em RPCs no PostgreSQL com `SECURITY DEFINER`.
2. Para agrupar o saldo mais recente de cada entidade até uma determinada data, use `DISTINCT ON (store_id) store_id, bank_total FROM reconciliations WHERE date <= p_date ORDER BY store_id, date DESC`.
3. Verifique sempre os nomes reais das colunas via `information_schema.columns` antes de escrever migrações.

**Risco identificado:** Queries que buscam apenas `WHERE date = p_date` em tabelas de reconciliação podem omitir lojas que não tiveram transações na data específica.

**Não fazer:** Nunca criar migrações assumindo nomes genéricos de colunas sem consultar o schema ativo.


## [2026-08-14] — [Feature ID: 203-205]

**Contexto:** Restauração dos componentes originais de importação e Marco Zero, auditoria da RPC get_dashboard_metrics com CTEs isoladas contra produto cartesiano, delta de odômetro, e eliminação de consultas à tabela legada import_logs com navegação inteligente por setas.

**Regra aprendida:**
1. A tabela import_logs foi modularizada; consultas de datas disponíveis devem consultar daily_snapshots (date), import_batches (target_date) e reconciliations (date).
2. Em ofx_transactions, as colunas com histórico de texto/descrição bancária são bank_name e counterpart_name (não description nem title).
3. Em funções PL/pgSQL, comandos SELECT ... INTO ... FROM table WHERE ... definem variáveis como NULL se nenhuma linha for encontrada. Sempre use IF NOT FOUND ou encapsule com COALESCE antes de montar o JSON de retorno.
4. As setas de navegação no frontend devem transitar exclusivamente por arrays de datas reais consolidadas no banco de dados, desabilitando nos extremos.

**Risco identificado:** Consultar tabelas obsoletas gera erro HTTP 406 do PostgREST.

**Não fazer:** Nunca iterar datas linearmente no frontend (+1 dia) sem checar existência no banco.

## [2026-08-17] — [Feature IDs: 214, 215, 216 — get_store_analytic_breakdown RPC & Purge Legado]

**Contexto:** Criação da RPC PostgreSQL `get_store_analytic_breakdown` para agregação atômica em CTEs isoladas das transações por loja, fornecedores de saída e origens de entrada. Purgamento definitivo de 874 transações legadas de testes com data anterior ao Marco Zero (13/08/2026).

**Regra aprendida:**
1. **CTEs Isoladas com COALESCE:** A agregação analítica por loja em PostgreSQL deve calcular `cte_summary`, `cte_suppliers_out` e `cte_sources_in` em blocos isolados com `COALESCE(SUM(...), 0)` para evitar produto cartesiano e falhas por registros nulos.
2. **Higienização de Fornecedores via CASE SQL:** Substrings e regex condicionais no SQL (ex: `SUBSTRING(title FROM 13)` para boletos/PIX) permitem extrair nomes limpos de fornecedores diretamente na query.
3. **Purgamento Pós-Marco Zero:** Todas as tabelas financeiras (`ofx_transactions`, `pos_transactions`, `manual_transactions`, `reconciliations`, `daily_snapshots`) foram limpas de dados anteriores ao Marco Zero (`target_date < '2026-08-13'`).

**Risco identificado:** Executar `DELETE` sem especificar `target_date` e `occurred_at` com timezone em conformidade.

**Não fazer:** Nunca misturar transações de mock/desenvolvimento com o histórico pós-Marco Zero.

## [2026-08-17] — [Feature ID: 217]

**Contexto:** Criação da tabela de contratos de taxas de POS (`pos_fee_contracts`) e RPC `get_mdr_audit_summary`.

**Regra aprendida:** 
- Tabela `pos_fee_contracts` armazena `acquirer`, `brand`, `method`, `installments_range`, `contracted_mdr_percent` e `anticipation_fee_percent`.
- A RPC `get_mdr_audit_summary(p_start_date, p_end_date, p_store_id)` centraliza o cálculo analítico com agregações `SUM(gross_amount)`, `SUM(net_amount)` e desvio financeiro.

**Risco identificado:** Executar RPCs com filtros de data vazios pode retornar grandes volumes se não houver paginação ou fallback de cliente.

**Não fazer:** Não criar RPC sem permissões RLS e `GRANT EXECUTE TO authenticated`.

## [2026-08-21] — [Feature ID: 258-motor-conciliacao-autonoma-zero-touch-com-auto-healing]

**Contexto:** Criação da infraestrutura de backend para o motor de auto-healing pericial de conciliação diária.

**Regra aprendida:**
1. Tabela `reconciliation_audit_logs` com RLS para registrar histórico de investigações autônomas.
2. RPC `run_autonomous_reconciliation_loop(p_date text)` orquestrada em PL/pgSQL com `SECURITY DEFINER`, que executa o loop pericial, chama `get_daily_reconciliation_summary`, reancora cofres e registra aportes intercompany no faturamento de forma atômica.

**Risco identificado:** Loops infinitos em PL/pgSQL. Mitigado com contador de segurança `WHILE v_iteration < 3 AND ABS(v_current_delta) > 50`.

**Não fazer:** Nunca executar rotinas de auto-healing no backend sem gravar o id do log pericial retornado no payload final.

## [2026-08-21] — [Feature ID: 256-importacao-contas-a-pagar-e-conciliacao-aportes-intercompany]

**Contexto:** Criação da infraestrutura de dados para Contas a Pagar Analítico e Entidades Intercompany.

**Regra aprendida:**
1. `public.intercompany_entities`: Cadastro central de sócios, filiais, holdings e chaves PIX.
2. `public.expense_category_rules`: Tabela de padrões regex/texto para categorização automática com prioridade.
3. `public.accounts_payable_imports`: Log de arquivos de contas importados por data.
4. `public.daily_manual_bills`: Estendida com `external_code`, `installment`, `due_date`, `payment_date`, `recipient_name`, `is_intercompany`, `intercompany_entity_id`, `matched_os_number`.

**Risco identificado:** Inserção de centenas de contas travando transações de HTTP REST. Mitigado com inserção em chunks de 100 linhas no `useContasAPagarImport.ts`.

**Não fazer:** Nunca sobrescrever despesas lançadas manualmente no dia sem antes filtrar por `external_code IS NOT NULL` na limpeza do lote anterior.

## [2026-08-21] — [Feature ID: 259-exclusao-cirurgica-por-data-e-correcao-exclusao-imports]

**Contexto:** Implementação da RPC `purge_daily_financial_data(p_date DATE)` na migration 0009.

**Regra aprendida:**
1. **Views com UNION não aceitam DELETE direto:** A tabela `public.transactions` é uma SQL VIEW gerada por `UNION ALL` (`manual_transactions`, `ofx_transactions`, `pos_transactions`). Comandos `DELETE FROM public.transactions` disparam o erro PostgreSQL `55000: Views containing UNION, INTERSECT, or EXCEPT are not automatically updatable`.
2. **Deleção nas tabelas base:** As exclusões de transações devem ser direcionadas individualmente a `manual_transactions`, `ofx_transactions` e `pos_transactions` usando `WHERE target_date = p_date OR DATE(occurred_at) = p_date`.
3. `daily_manual_bills` possui coluna `date DATE`.

**Risco identificado:** Chamar DELETE em view composta. Mitigado com deleção direta nas 3 tabelas subjacentes.

**Não fazer:** Nunca executar comandos DML (DELETE/INSERT) diretamente contra a view `transactions`.

## [2026-08-21] — [Feature ID: 260-atualizacao-os-pendentes-e-conciliacao-orfas]

**Contexto:** Migration `20260821000010_auto_match_pending_os.sql` — Aprimoramento da RPC `auto_match_transactions(p_date DATE)`.

**Regra aprendida:**
1. **DROP FUNCTION ao alterar tipo de retorno:** Ao mudar a assinatura de uma função Postgres (ex: de `RETURNS void` para `RETURNS JSONB`), deve-se incluir explicitamente `DROP FUNCTION IF EXISTS public.auto_match_transactions(date);` antes do `CREATE OR REPLACE FUNCTION`, caso contrário o Postgres dispara erro `42P13: cannot change return type of existing function`.
2. **Atualização em cascata de OSs:** A RPC atualiza `patio_os` (`paid_value`, `status`, `closed_at`, `matched_ofx_id`), `ofx_transactions` (`matched_os_number`), `pos_transactions` (`matched_os_number`) e insere em `conciliation_matches` atomicamente.

**Risco identificado:** Falha em migração ao alterar tipo de retorno sem DROP.

**Não fazer:** Nunca usar `CREATE OR REPLACE FUNCTION` com tipo de retorno alterado sem antes dropar a função anterior.

## [2026-08-24] — [Feature ID: 264 & 265]

**Contexto:** Motor de Diagnóstico Pré-Conciliação no Step 3 e correção de parâmetros da RPC de Maquininhas (`get_store_pos_triple_reconciliation`).

**Regra aprendida:** 
- Em PostgreSQL / PostgREST, a troca de nome de parâmetros nomeados de RPCs (`p_date` vs `p_target_date`) gera erro `PGRST202`. Ao atualizar RPCs, forneça parâmetros com valores default ou unifique `COALESCE(p_target_date, p_date)`.
- A tabela `daily_manual_bills` utiliza a coluna `date` (e não `target_date`), e exige o preenchimento de `title` (NOT NULL).

**Risco identificado:** Chamar RPCs no frontend com nomes de chaves divergentes da assinatura SQL do Supabase.

**Não fazer:** Nunca enviar propriedades no payload do Supabase Client que não correspondam exatamente às colunas da tabela PostgREST (`target_date` em `daily_manual_bills`).

## 2026-08-26 — [Feature ID: 292]

**Contexto:** Correção de erros HTTP 400 no PostgREST e sobrecargas conflitantes de RPC no PostgreSQL.

**Regra aprendida:**
- Colunas do tipo `UUID` no Postgres causam erro HTTP 400 imediato no PostgREST se consultadas com strings não-UUID (ex: `.eq('user_id', 'GLOBAL')`). Sempre validar com regex `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i` no frontend antes de disparar a query.
- No PostgreSQL, nunca criar uma função com parâmetro default `(p_date text, p_force_dynamic boolean DEFAULT false)` e outra função `(p_date text)`, pois chamadas com 1 argumento geram `ERROR 42725 (function is not unique)`. Apenas a função com `DEFAULT false` é necessária.
- A sintaxe de negação em OR no PostgREST JS deve ser evitada em queries compostas; prefira queries limpas com filtragem in-memory segura.

**Não fazer:** Nunca passar literais arbitrários como 'GLOBAL' para colunas UUID no PostgREST.

## 2026-08-26 — [Feature ID: 293]

**Contexto:** Erro `PGRST203` do PostgREST devido a sobrecargas residuais de funções no PostgreSQL (`date` vs `text`, `uuid` vs `text`), causando tela zerada no painel de conciliação diária.

**Regra aprendida:**
- O PostgREST não suporta sobrecarga de funções SQL no schema `public` com os mesmos nomes de parâmetros ou tipos compatíveis. Ele aborta com erro `PGRST203: Could not choose the best candidate function`.
- Para garantir que nenhuma variante antiga permaneça no catálogo do PostgreSQL (`pg_proc`), **SEMPRE execute `DROP FUNCTION IF EXISTS public.nome_funcao(tipo1, tipo2...)` com a lista EXATA de tipos de cada assinatura anterior** antes de criar a versão canônica.
- Em `ofx_transactions`, a coluna de descrição é `counterpart_name` e o identificador bancário é `fitid` (a tabela NÃO possui coluna `title`).

**Risco identificado:** Executar apenas `CREATE OR REPLACE FUNCTION func(text)` quando já existia `func(date, boolean DEFAULT false)` não substitui a função anterior, criando uma sobrecarga invisível no banco que quebra o PostgREST.

**Não fazer:** Nunca crie múltiplas variantes com assinaturas diferentes para a mesma RPC no PostgreSQL.

## 2026-08-26 — [Feature ID: 296]

**Contexto:** Resolução de erro `PGRST303: JWT issued at future` na listagem de lojas (`stores`) e correção de HTTP 400 em `ai_settings`.

**Regra aprendida:**
- **Tabelas Mestres / Referência (`stores`):** A política de `SELECT` em tabelas que servem de base estrutural para a navegação do app deve ser `FOR SELECT USING (true)`. Isso impede que divergências de relógio (*clock skew*) ou sessões expiradas em navegadores de clientes bloqueiem a listagem de filiais e quebrem a aplicação inteira.
- **Schema Completo de `ai_settings`:** A tabela `ai_settings` deve conter as colunas `id (uuid)`, `user_id (text)`, `provider (text)`, `model (text)`, `api_key (text)`, `bot_url (text)`, `bot_api_key (text)` com RLS habilitado.

**Não fazer:** Nunca restrinja `SELECT` de tabelas de metadados públicos ou filiais exclusivamente a `auth.uid() IS NOT NULL` se isso puder gerar travamento em cascata da UI durante transições de sessão de auth.

## 2026-08-27 — [Feature ID: 298]

**Contexto:** Atualização das RPCs `get_daily_reconciliation_summary` e `get_store_pos_triple_reconciliation`.

**Regra aprendida:**
- Na RPC `get_store_pos_triple_reconciliation`, o valor `nao_entrou_valor` deve calcular a fração que ainda não liquidou em conta corrente (`GREATEST(0, rede_liquido - ofx_maquininhas)`), e na RPC `get_daily_reconciliation_summary` o saldo por loja integra `bank_total + nao_entrou_valor + dinheiro_loja`.

## 2026-08-27 — [Feature ID: 299]

**Contexto:** Correção de verificação de registros no PL/pgSQL do PostgreSQL.

**Regra aprendida:**
- **Trap de Record IS NOT NULL no PostgreSQL:** Em PL/pgSQL, `v_record IS NOT NULL` avalia para `FALSE` se qualquer coluna do registro for NULL. Para verificar se um `SELECT * INTO v_record` encontrou uma linha, use SEMPRE `IF FOUND THEN`.

## 2026-08-27 — [Feature ID: 308]

**Contexto:** Erro `PGRST202 (404 Not Found in schema cache)` ao chamar `get_daily_reconciliation_summary`, erro de coluna `payment_methods` em `calculate_daily_conciliation` e garantia de zero cálculos no frontend.

**Regra aprendida:**
- **Casamento de Nomes de Parâmetro no PostgREST:** O PostgREST busca funções no cache pelo nome EXATO das chaves enviadas no JSON do body RPC. Se a função PostgreSQL declara `p_target_date text`, enviar `{ p_date: date }` gera erro `PGRST202 (Could not find function in schema cache)`. Foi criado o overload `get_daily_reconciliation_summary(p_date date)` que delega para `p_target_date`, suportando ambos os nomes sem risco de regressão.
- **Nomenclatura Canônica em `patio_os`:** A coluna de forma de pagamento na tabela `patio_os` é `payment_method` (singular), e NÃO `payment_methods` (plural). Consultas e RPCs devem sempre utilizar `payment_method`.
- **Zero Cálculos Financeiros no Frontend (Regra Suprema):** Todo e qualquer valor (saldos bancários, faturamento, maquininha, pix, na loja os, previsto e diferenças) DEVE vir pré-calculado exclusivamente pelas RPCs do PostgreSQL. O frontend atua estritamente como camada de apresentação e jamais deve recalcular ou inferir valores contábeis.

**Risco identificado:** Chamar RPCs com nomes de parâmetros divergentes faz o TanStack Query entrar em loop de retry com backoff exponencial (`sleep`), congelando o carregamento da tela por mais de 10 segundos.

**Não fazer:** Nunca faça cálculos matemáticos ou deduções contábeis no React/frontend. Nunca altere o nome do parâmetro de uma RPC sem garantir retrocompatibilidade ou overload canônico.

