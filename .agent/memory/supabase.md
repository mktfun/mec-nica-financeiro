## [2026-09-02] — [Feature ID: 358-motor-conciliacao-lojas-ofx-e-equalizacao-0209]

**Contexto:** Correção de regressão na RPC `get_daily_reconciliation_summary` via migration `20260902000024_equalize_canonical_0209.sql`, restaurando o contrato completo do Split Dual de filiais (`entradas_conciliadas`, `dif_entradas`, `contas_conciliadas`, `dif_saidas`, `nao_entrou_valor`, `status_compensacao`), inserção dos 3 ajustes DRE de faturamento corporativo (R$ 24.454,96) em `daily_revenue_adjustments` e equalização pericial do snapshot de 02/09/2026 (-R$ 11,14 / approved).

**Regra aprendida:**
1. **Contrato Canônico Obrigatório de Filiais na RPC (`v_stores_detail`):**
   - Ao gerar o JSON de lojas, a RPC NUNCA deve omitir as propriedades agregadas `entradas_conciliadas` (`ofx_maquininhas + pix_total + entradas_justificadas`), `dif_entradas` (`ofx_entradas_total - entradas_conciliadas`), `contas_conciliadas` (`contas_loja_total + saidas_justificadas`) e `dif_saidas` (`ofx_saidas_total - contas_conciliadas`). A omissão dessas chaves causava `0,00` nos cards de todas as 10 lojas.
2. **Reserva Imutável de Sobrescrita de Pátio (`veiculosPatioValor`):**
   - No `CentralImportWizard.tsx`, quando o pátio do dia é apurado via relatórios de OS ou edição manual por loja (`veiculosPatioValor > 0`), JAMAIS sobrescrever com query global de `patio_os`, pois ressuscita OSs zumbis e inflaciona o pátio para centenas de milhares de reais.

---

## [2026-09-02] — [Feature ID: 355-cleanup-patio-os-zombies-e-blindagem-rpc]

**Contexto:** Expurgo definitivo de registros espúrios/zumbis em `patio_os` (ex: datas anômalas < 2026-07-01, anos como 2020 e OSs artificiais com sufixo "Faturamento") e blindagem defensiva da RPC `get_pending_patio_os_for_ocr` via migration `20260902000022_cleanup_patio_os_zombies.sql`.

**Regra aprendida:**
1. **SSOT do Pátio e Sanitização de Nomes (`patio_os`):**
   - Registros de métricas de faturamento contábil NUNCA devem ser inseridos como ordens de serviço em `patio_os`.
   - A RPC `get_pending_patio_os_for_ocr` possui cláusula permanente `AND p.os_number NOT ILIKE '%faturamento%'` e janela operacional estrita de 60 dias da data base (`p.opened_at >= (p_target_date - INTERVAL '60 days')`), prevenindo que OSs esquecidas de meses/anos anteriores poluam a tela do operador.

---

## [2026-09-01] — [Feature ID: 335-justificativa-saidas-ofx-e-equalizacao-matematica-cards]

**Contexto:** Refinamento da RPC `get_daily_reconciliation_summary` em `supabase/migrations/20260901000012_fix_store_split_linear_subtraction_and_expenses.sql` para garantir subtração linear estrita nas lojas e blindar o cálculo de `contas_loja_total` contra dupla contagem de despesas extras.

**Regra aprendida:**
1. **Linearidade na Decomposição de Filiais:**
   - A RPC calcula `entradas_conciliadas := (oe.ofx_entradas_total - oe.entradas_orfas)` e `contas_conciliadas := (sofx.ofx_saidas_total - sofx.saidas_orfas)`.
   - O retorno garante que `diferenca_entradas = ofx_entradas_total - entradas_conciliadas` e `diferenca_saidas = ofx_saidas_total - contas_conciliadas`.
2. **SSOT de Despesas na CTE `bills_store_agg`:**
   - Despesas extras criadas via `resolve_orphan_saida_ofx` residem em `daily_manual_bills` com `contabilizar_no_subtotal = true`.
   - `contas_loja_total` consome `COALESCE(bst.contas_loja_total, 0)`, sem somar novamente `sofx.saidas_justificadas`, prevenindo duplicação de despesas.

---

## [2026-09-01] — [Feature ID: 334-transparencia-entradas-ofx-empilhamento-cards-rpc]

**Contexto:** Ajuste das CTEs de agregação de filiais na RPC `get_daily_reconciliation_summary` (`20260901000011_fix_canonical_store_ofx_entries_and_split.sql`) calculando `ofx_entradas_total` a partir de 100% dos créditos OFX e somando justificativas ao previsto.

**Regra aprendida:**
1. **Extrato OFX Imutável:**
   - Créditos bancários reais nunca são expurgados do total de extrato. Transações justificadas compõem a base prevista da filial.

---

## [2026-09-01] — [Feature ID: 279-correcao-fechamento-por-filial-e-detalhamento-lojas]

**Contexto:** Atualização da RPC `get_daily_reconciliation_summary` para calcular e retornar as métricas de Saldo Total, Maquininha (Rede Líquido), PIX, Na Loja OS, Previsto e Diferença por Loja para as 10 filiais através de CTEs pré-agrupadas e padronização de `store_id` como `TEXT`.

**Regra aprendida:**
1. **Padronização de Chaves de Lojas (`store_id` como `TEXT`):**
   - 9 lojas usam IDs curtos (`st-01` a `st-09`) e Mauá usa UUID nativo (`3a3dd7ce...`). NUNCA faça cast para `UUID` (`store_id::uuid`), pois causará erro PostgreSQL 22P02. Todas as CTEs e joins devem tratar `store_id` como `TEXT`.
2. **CTEs Pré-Agrupadas por Loja:**
   - Para evitar produto cartesiano e garantir 100% de integridade com as 10 filiais, os agrupamentos de `pos_transactions`, `ofx_transactions`, `patio_os` e `store_cash_vault` DEVEM ser calculados em CTEs isoladas com `GROUP BY store_id` antes do `LEFT JOIN` com `stores`.
3. **Cálculo da Diferença por Loja:**
   - $\text{Previsto Loja}_i = \text{Rede Líquido}_i + \text{PIX}_i$.
   - $\text{Realizado Loja}_i = \text{OFX Maquininhas}_i + \text{PIX}_i$.
   - $\text{Diferença Loja}_i = \text{Realizado Loja}_i - \text{Previsto Loja}_i = \text{OFX Maquininhas}_i - \text{Rede Líquido}_i$.

**Risco identificado / Anti-pattern:**
- NUNCA fazer `LEFT JOIN` direto entre múltiplas tabelas transacionais brutas sem pré-agrupamento em CTEs, pois multiplica os valores das transações ($N \times M$).

## [2026-09-01] — [Feature ID: 315-correcao-rpc-conciliacao-e-blindagem-snapshots]

**Contexto:** Correção crítica da RPC `get_daily_reconciliation_summary` para garantir a inclusão de `'stores'` (detalhamento das 10 filiais) no Ramal 1 (`is_closed = true`), correção da lógica de odômetro delta evitando vazamento de faturamento acumulado, e blindagem da RPC `close_daily_snapshot` com `RAISE EXCEPTION` caso o detalhamento por filial esteja corrompido.

**Regra aprendida:**
1. **Obrigatoriedade de `'stores'` em Dias Fechados (Ramal 1):**
   - Ao ler um snapshot fechado, a RPC `get_daily_reconciliation_summary` DEVE sempre incluir a chave `'stores'` no JSON com os dados congelados de cada filial a partir de `reconciliations(date <= v_target_date)`. O frontend depende dessa chave para renderizar o "Fechamento por Filial".
2. **Cálculo de Odômetro Estável:**
   - Se `v_faturamento_oi_base >= v_faturamento_anterior` e `v_faturamento_anterior > 0`, a receita do período é `v_faturamento_oi_base - v_faturamento_anterior` (se forem iguais, resulta em R$ 0,00 e NUNCA no valor total acumulado).
3. **Guarda Impeditiva no `close_daily_snapshot`:**
   - A RPC de fechamento valida se `stores` possui as 10 lojas antes de gravar em `daily_snapshots`. Se estiver vazio havendo saldo bancário consolidado, a transação aborta com `RAISE EXCEPTION`.

**Risco identificado / Anti-pattern:**
- NUNCA fechar um snapshot ou retornar um payload de conciliação omitindo o array `'stores'`, pois isso provoca efeito cascata zerando as 10 lojas no frontend e sobrescrevendo `reconciliations` com zero.

## [2026-08-31] — [Feature ID: 328-equalizacao-definitiva-5-pilares-conciliacao-3108]

**Contexto:** Saneamento pontual de dados históricos (baixa de OS paga em cartão na tabela `patio_os`, seeding de aporte de sócios em `daily_revenue_adjustments` e despesas extras em `daily_manual_bills`) e garantia de genericidade estrita na RPC `get_daily_reconciliation_summary` para operar em qualquer data do calendário sem ramais hardcoded.

**Regra aprendida:**
1. **Genericidade da RPC `get_daily_reconciliation_summary`:**
   - A RPC deve computar todos os agregadores a partir do parâmetro `p_date`.
   - Se `v_snapshot.is_closed = true` e não forçado dynamic, preserva o `v_snapshot.caixa_atual` cadastrado do snapshot e reconstrói os componentes a partir das tabelas daquele dia específico (`reconciliations`, `ofx_transactions`, `daily_manual_bills`).
2. **Compatibilidade de Nomes de Propriedades no JSONB:**
   - O payload JSONB retornado inclui: `total_saldo_banco_positivo`, `total_saldo_banco_negativo`, `total_saldo_banco`, `saldo_bancos_ofx`, `saldo_bancos_ofx_positivo`, `saldo_bancos_ofx_negativo`, `total_ativos_positivos`, `faturamento_total`, `valor_disp_contas`, `subtotal_contas`, `diferenca_final`.

## [2026-08-31] — [Feature ID: 322-conciliacao-saidas-ofx-contas-e-justificativa-despesas-orfas]

**Contexto:** Criação das RPCs atômicas `public.resolve_orphan_saida_ofx` e `public.close_daily_snapshot` com extensão da coluna `is_extra` em `daily_manual_bills`.

**Regra aprendida:**
1. **RPC `resolve_orphan_saida_ofx`:**
   - Recebe `p_ofx_id`, `p_category`, `p_justification`, `p_contabilizar_no_subtotal`, `p_store_id`, `p_amount`, `p_target_date`, `p_bill_id`.
   - Executa row-locking em `ofx_transactions` e resolve atômico em 3 modos: `linked_existing`, `created_extra_bill` ou `justified_only`.
2. **RPC `close_daily_snapshot`:**
   - Executa `get_daily_reconciliation_summary(p_date, true)` dinâmico e faz upsert em `daily_snapshots` com `is_closed = true`, persistindo os 5 pilares canônicos no snapshot.

## [2026-08-31] — [Feature ID: 321-motor-automatch-ia-e-unificacao-vinculo-pix-rede-wizard]

**Contexto:** Criação das RPCs atômicas `public.link_manual_pix_to_os`, `public.link_manual_rede_to_os` e `public.unlink_manual_os_match` com isolamento estrito por `store_id` e row-locking (`FOR UPDATE`), permitindo que a conciliação manual de PIX e vendas da Rede atualize OSs sem inflar o faturamento ou causar colisão entre filiais.

**Regra aprendida:**
1. **RPCs Atômicas de Vínculo:**
   - `link_manual_pix_to_os`: Executa o matching entre OFX e OS, atualiza `ofx_transactions.matched_os_number`, `patio_os.matched_ofx_id` e baixa o saldo se a OS estiver em aberto.
   - `link_manual_rede_to_os`: Executa o matching entre maquininha e OS, atualiza `pos_transactions.matched_os_number` e insere o par em `conciliation_matches`.
   - `unlink_manual_os_match`: Desfaz com segurança qualquer amarração manual restaurando o status da OS para `'UNMATCHED'`.

## [2026-08-31] — [Feature ID: 320-persistencia-contas-manual-e-gestao-de-despesas]

**Contexto:** Criação da RPC `public.update_manual_bill` e atualização da RPC `public.get_daily_reconciliation_summary` para respeitar a precedência do ajuste manual de contas em `daily_snapshots.metadata->>'contas_manual_override'`.

**Regra aprendida:**
1. **Precedência do Contas Manual:**
   - A RPC verifica se há `metadata->>'contas_manual_override'`. Se presente, utiliza o valor ajustado pelo operador sem reverter para o somatório bruto da planilha (`daily_manual_bills`).

## [2026-08-31] — [Feature ID: 319-correcao-caixa-atual-fluxo-e-rpc-conciliacao]

**Contexto:** Atualização das RPCs `public.get_daily_reconciliation_summary`, `public.get_dashboard_metrics` e `public.calculate_daily_conciliation` para calcular o Caixa Atual determinística e dinamicamente nos 5 pilares: `(v_total_saldo_banco_positivo + v_dinheiro_mp + v_a_receber + v_na_loja_os) - v_saldo_negativo_itau`.

**Regra aprendida:**
1. **Recálculo do Caixa Atual em Snapshots Fechados:**
   - No Ramal 1 (dia fechado) da RPC `get_daily_reconciliation_summary`, `v_caixa_atual` não deve ser extraído de `v_snapshot.caixa_atual` se os ativos foram recalculados dinamicamente; deve ser computado pela equação canônica.
2. **Reuso DRY na RPC `get_dashboard_metrics`:**
   - Para evitar duplicidade de regras de negócio, `get_dashboard_metrics` invoca internamente `get_daily_reconciliation_summary(p_date::text, false)` e mapeia os campos normalizados.

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

## [2026-08-31] — [Feature ID: 327] Compensação Intra-Loja e Agregação Canônica na RPC get_daily_reconciliation_summary

**Contexto:** Migration `20260831000010_align_5_pillars_and_intra_store_offset.sql` para apuração correta de saldos patrimoniais com segregação de passivo/cheque especial no PostgreSQL.

**Regra aprendida:**
1. **Compensação Intra-Loja no SQL:**
   ```sql
   store_consolidated_balance := raw_bank_total + vault_val + nao_entrou_val;
   saldo_devedor_real := CASE WHEN store_consolidated_balance < 0 THEN ABS(store_consolidated_balance) ELSE 0 END;
   saldo_positivo_real := CASE WHEN store_consolidated_balance > 0 THEN store_consolidated_balance ELSE 0 END;
   ```
   Isso garante que o Cheque Especial holding seja a soma estrita do saldo devedor residual das filiais com déficit (`v_total_saldo_banco_negativo`), evitando dupla penalização em contas amortizadas por vendas da Rede.
2. **Schema em `ofx_transactions` vs `daily_manual_bills`:** A tabela `ofx_transactions` usa `manual_category`, `manual_justification` e `matched_bill_id` (NÃO possui a coluna `match_status`, que existe em `daily_manual_bills`).
3. **Agregação de Contas a Pagar:** Quando `daily_manual_bills` possui registros (`v_total_bills > 0`), ela é a fonte primária de verdade analítica, integrando base (`external_code IS NOT NULL`) e extras (`is_extra = true`).

**Não fazer:** Nunca misturar colunas inexistentes (`match_status` em `ofx_transactions`) nas queries da RPC.



## [2026-09-01] — [Feature ID: 314-auditoria-saldo-deduplicacao-ofx-rede]

**Contexto:** Eliminação definitiva de trigger legada destrutiva (update_reconciliation_bank_total) que corrompia 
econciliations.bank_total substituindo o saldo patrimonial <LEDGERBAL> pela soma SUM(in - out). Atualização dinâmica da RPC get_store_pos_triple_reconciliation (remoção de hardcodes de filiais e cálculo determinístico de 
ao_entrou_valor) e unificação 1:1 da RPC get_dashboard_metrics com a regra canônica dos 5 Pilares e dedução do Cheque Especial.

**Regra aprendida:**
1. **Nunca usar triggers em 	ransactions para recalcular 
econciliations.bank_total:** O saldo bancário é patrimonial e decorre do extrato OFX (<LEDGERBAL>). Triggers que fazem SUM(in - out) distorcem o saldo real ao ignorar o saldo inicial da conta.
2. **Cálculo Canônico de Cartões a Compensar na RPC:** 
ao_entrou_valor = GREATEST(0, COALESCE(r.rede_liquido, 0) - COALESCE(o.ofx_maquininhas, 0)) apura exatamente o valor pendente de liquidação sem dupla contagem (se o crédito já entrou no extrato OFX, abate da pendência).
3. **SSOT Absoluto:** Tanto get_daily_reconciliation_summary quanto get_dashboard_metrics compartilham 100% da mesma lógica contábil no banco de dados.

**Risco identificado / Anti-pattern:** Recalcular saldos ou faturamentos no frontend. Todo cálculo pertence exclusivamente ao banco via RPCs SQL seguras.

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


## [2026-09-01] - [Feature ID: 330]
Contexto: Correcao de regressao na RPC get_daily_reconciliation_summary onde um JOIN de UUID com texto provocou panico estrutural.
Regra aprendida: JOINs de UUID com TEXT falham e silenciam operacoes no supabase. Usar CAST ou ::text. O Frontend nao pode usar fallback || 0 cegamente para saldos. Renderize N/D.
Nao fazer: Nunca permita que excecoes estruturais sejam traduzidas em status contabeis falsos (ex: R$ 0,00).


## [2026-09-01] — [Feature ID: 331-fix-nulls-and-revert-diferenca]
**Contexto:** Restauração do cálculo de Diferença por Filial e correção de R$ 0,00 na métrica de Maquininha causada por `transaction_type` nulo.
**Regra aprendida:**
1. **Diferença Canônica (Previsto - Realizado):** A fórmula exigida pelo usuário para "Diferença" no Dashboard é `(Rede Líquido + PIX_previsto) - (OFX Maquininhas + PIX_realizado)`, que se simplifica para `Rede Líquido - OFX Maquininhas`. Nunca use "órfãos do OFX" como base de divergência geral sem aprovação expressa.
2. **Blindagem de Nulos em CTEs:** Colunas que não são `NOT NULL` (como `transaction_type` adicionada via migration tardia) avaliam expressões como `NULL != 'devolucao'` como `NULL`. Isso faz com que blocos `CASE WHEN` caiam no `ELSE` e zerem agregações de faturamento/maquininha. SEMPRE envolva colunas suscetíveis a nulo com `COALESCE(coluna, '') != 'valor'`.
**Risco identificado / Anti-pattern:** Usar operadores de comparação (`!=`, `=`) diretamente em colunas sem `NOT NULL` em scripts de agregação `SUM()`, pois isso contamina silenciosamente a matemática com valores `NULL`.

## [2026-09-01] — [Feature ID: 332-fix-store-difference-and-ofx-pendencias]
**Contexto:** Migration `20260901000009` corrigindo a apuração da diferença por filial na RPC `get_daily_reconciliation_summary`.
**Regra aprendida:**
1. **CTE `ofx_unreconciled_agg`:** Agrega entradas órfãs (créditos sem OS, sem categoria manual e sem adquirentes) e saídas órfãs (débitos sem conta vinculada e sem categoria). A diferença por loja passa a ser `COALESCE(unrec.total_pendencias, 0)`.
2. **Campos de Snapshot em Ramal 1:** `daily_snapshots` não possui as colunas `caixa_anterior`, `fluxo_caixa`, `faturamento_anterior`, `faturamento_periodo` ou `valor_disp_contas`. Tais propriedades devem ser lidas estritamente de `(v_snapshot.metadata->>'nome_campo')::numeric`.
**Risco identificado / Anti-pattern:** Tentar acessar colunas inexistentes diretamente no record `v_snapshot` do PL/pgSQL, o que gera erro de runtime `42703 (has no field caixa_anterior)` no PostgREST.

## [2026-09-01] — [Feature ID: 340]
**Contexto:** Ampliação do motor de auto-match no backend para cobrir OSs já finalizadas e auto-tagging de movimentações corporativas.
**Regra aprendida:**
1. **Auto-Match com OSs Finalizadas:** No ERP das oficinas mecânicas, clientes frequentemente pagam no mesmo dia em que o carro é entregue e a OS é marcada como `finalizada` na planilha do pátio. A RPC `auto_match_daily_transactions` deve casar tanto OSs com saldo em aberto quanto OSs finalizadas confrontando `pix_transfer_value` e `credit_value`/`debit_value`.
2. **Auto-Tagging Corporativo:** Transações de capital de giro (`EMPREST`), seguros (`ITAU SEGUROS`), transferências corporativas de óleo (`EMPORIO DO OLEO`) e rendimentos bancários (`APLIC`/`RESG`) devem ser pré-marcadas como movimentações não operacionais, direcionadas exclusivamente ao Step 2 de justificativas.
**Risco identificado / Anti-pattern:** Limitar o auto-matching estritamente a OSs com status `'em_aberto'`, deixando dezenas de transações de PIX e Cartão de clientes orfãs no Step 1.

## [2026-09-01] — [Feature ID: 341]
**Contexto:** Nova RPC atômica `create_and_link_manual_os` (Migration 16) para cadastro instantâneo de OS e baixa de pagamentos com garantia das formas de liquidação.
**Regra aprendida:**
1. **Atomicidade e Incremento de Saldos:** Ao criar uma nova OS on-the-fly a partir de um pagamento avulso, a RPC deve inserir o registro em `patio_os`, atribuir o valor à coluna específica (`pix_transfer_value`, `credit_value` ou `debit_value`), somar em `paid_value` e calcular `status = CASE WHEN paid_value >= (total_value - 0.05) THEN 'finalizada' ELSE 'pago_parcial' END`.
2. **Idempotência por Filial:** Se o número da OS já existir na filial, a RPC reaproveita o registro em vez de duplicar, preservando a integridade das 10 lojas.
**Risco identificado / Anti-pattern:** Inserir a OS via mutation direta de frontend sem atualizar `matched_os_number` no extrato bancário ou maquininha e sem registrar em `conciliation_matches`.

## [2026-09-02] — [Feature ID: 349]
**Contexto:** Blindagem contra erro de Check Constraint `daily_manual_bills_amount_check` e Foreign Keys na tabela `daily_manual_bills`.
**Regra aprendida:**
1. **Check Constraint `amount > 0` em `daily_manual_bills`:** A tabela `daily_manual_bills` rejeita categoricamente registros com `amount <= 0` ou nulos. Parsers e hooks de importação de Contas a Pagar (`BuscaContasAPagar.xls`) DEVEM filtrar estritamente `if (!amount || amount <= 0 || isNaN(amount)) continue;` antes de submeter lotes ao Supabase.
2. **Sanitização de Foreign Keys (`store_id` e `intercompany_entity_id`):** O campo `store_id` referencia `stores(id)`. Se for `'master'` ou não pertencer ao cadastro ativo de `stores`, deve ser passado como `null` para evitar `23503 (violates foreign key constraint)`.
3. **Resiliência em Chunks de Inserção:** Ao salvar em lotes de 100 itens via Supabase Client, caso ocorra qualquer erro imprevisto em um chunk, deve haver fallback linha a linha para persistir todas as contas válidas sem abortar a gravação inteira.
**Risco identificado / Anti-pattern:** Inserir linhas de títulos cancelados ou estornos com valor 0.00 na tabela de contas a pagar, causando abortamento total do chunk de 100 itens.

