# Spec 440 — Rede × OS: Isolamento Temporal por Data e Matcher Canônico

## Problema Observado

Na conciliação de 24/09/2026, a tela de "Vendas em Cartão" (`StoreCartaoMaquininhaView`) exibe lançamentos que não pertencem ao movimento operacional do dia e deixa sem vínculo automático uma venda Visa de **R$ 2.286,00 bruto**, apesar de o modal manual sugerir a **OS #40394** (cliente Claudio Santos Antunes) com parcela exata de R$ 2.286,00.

Analisando a transação:
- **Bruto da venda:** R$ 2.286,00 (pago pelo cliente no cartão).
- **Taxa MDR/Desconto:** R$ 209,85.
- **Líquido a receber:** R$ 2.076,15.

No entanto, o modal manual (`ManualMatchOsModal.tsx:290`) rotula o montante bruto de R$ 2.286,00 incorretamente como **"Valor Líquido"**. Além disso, há três rotas divergentes no código tentando casar Rede com OS, cada uma adotando critérios conflitantes de datas, valores (bruto vs líquido) e efeitos colaterais no banco de dados.

## Diagnóstico Fundamentado no Repositório Local

1. **Vazamento e contaminação de datas na ingestão:**
   - Em `src/lib/parsers/redeParser.ts:243-262`, `rowDate` é extraído da linha, mas em `src/components/importacoes/CentralImportWizard.tsx:1489-1507`, a transação é inserida com:
     ```typescript
     const effectivePosDate = item.date ? String(item.date).split('T')[0] : targetDate;
     ...
     occurred_at: item.date || `${targetDate}T12:00:00Z`,
     target_date: targetDate, // <-- FORÇA a data do wizard em vez de effectivePosDate!
     ```
   - Quando um arquivo da Rede contendo vendas de 22/09, 23/09 e 24/09 é importado no wizard do dia 24/09, **todas as vendas recebem `target_date = 2026-09-24`**.
   - Na UI (`StoreCartaoMaquininhaView.tsx:55`), a query usa:
     ```typescript
     .or(`target_date.eq.${date},occurred_at.gte.${date}T00:00:00,occurred_at.lte.${date}T23:59:59`)
     ```
     Basta que um dos campos aponte para 24/09 para que vendas de 22/09 ou 23/09 apareçam na tela de 24/09, inflando indevidamente o movimento.

2. **Divergência entre três matchers no código:**
   - **Matcher 1 (Central Import / RPC):** Chama `auto_match_daily_transactions` (`supabase/migrations/20260914000034_fix_rede_ofx_settlement_and_summary.sql:128-148`). Ele compara `net_amount` com `credit_value`, usa `total_value` bruto/líquido indiscriminadamente como fallback e, ao vincular, atualiza `patio_os.paid_value = LEAST(total_value, paid_value + v_pos_record.net_amount)`. Somar o **líquido** (R$ 2.076,15) à OS de R$ 2.286,00 deixa um saldo artificial em aberto de R$ 209,85 (exatamente a taxa MDR).
   - **Matcher 2 (Fase Manual / Review):** Chama `match_stage2_rede_os` (`Fase2RedeVsOsReview.tsx:80` e `supabase/migrations/20260903000030...sql:264`). Ao encontrar uma OS, atualiza `settlement_status = 'entrou'`, o que é uma violação contábil: a venda foi feita em cartão, mas o dinheiro ainda não entrou na conta bancária (isso só ocorre em D+1 ou D+30 via OFX).
   - **Matcher 3 (In-Memory Engine):** `src/lib/matchers/autoMatchingEngine.ts:251-280` adota uma janela de tolerância D-3 e utiliza `.find()`, pegando o primeiro registro sem garantir unicidade estrita contra colisões.

3. **Causa do não-match automático da OS #40394:**
   - `useManualMatch.ts:100-141` busca candidatos em `patio_os` E em `estoque_os_pendente`. As RPCs automáticas consultam **exclusivamente `patio_os`**. Se a OS estiver em `estoque_os_pendente`, ou se estiver marcada com status divergente, ela só aparece como sugestão no modal manual.
   - Além disso, se a RPC atual tentou casar `net_amount` (R$ 2.076,15) contra a OS cadastrada com R$ 2.286,00, a diferença de R$ 209,85 excedeu a tolerância de R$ 0,05, impedindo o match automático.

4. **Separação de papéis: Bruto vs Líquido:**
   - **Bruto (`gross_amount`):** Valor total pago pelo cliente pelo serviço/peça da OS. É este valor que deve ser confrontado com a parcela de cartão (`credit_value`, `debit_value`) da OS.
   - **Taxa MDR (`fee_amount`):** Despesa financeira/operacional retida pela adquirente Rede.
   - **Líquido (`net_amount`):** Montante a ser depositado no banco. Serve estritamente para a liquidação bancária contra o extrato OFX (`settlement_status`).

## Resultado Proposto

1. **Blindagem temporal na ingestão:**
   - No `CentralImportWizard.tsx`, persistir `pos_transactions.target_date = effectivePosDate` (a data real em que a transação ocorreu). O identificador do lote de importação permanece rastreado via `import_batch_id`.
   - Vendas com data anterior (ex.: 22 ou 23/09) contidas em arquivo importado em 24/09 são gravadas em suas respectivas datas operacionais.
2. **Consulta canônica na tela de cartão:**
   - Em `StoreCartaoMaquininhaView.tsx`, substituir a cláusula `.or(...)` ambígua por filtro estrito em `target_date = date`. Vendas anteriores pertencem aos seus respectivos dias e não contaminam a visualização de 24/09.
3. **RPC canônica única no PostgreSQL:**
   - Unificar a lógica de casamento em uma versão saneada de `auto_match_daily_transactions` e fazer `match_stage2_rede_os` delegar ou reutilizar as mesmas regras.
   - Critérios estritos e cumulativos:
     - Mesma loja (`store_id`).
     - Transação positiva (`gross_amount > 0` e `transaction_type = 'venda'`).
     - Data da transação compatível com a data da OS.
     - Comparação exata de `gross_amount` com a parcela de cartão da OS (`credit_value`, `debit_value`, `credit_debit_value`) com tolerância de até R$ 0,05.
     - Unicidade obrigatória: se houver mais de uma OS com o mesmo valor na mesma loja e data, suspender como `COLISAO` e deixar pendente para escolha humana.
     - **Idempotência e integridade:** Não alterar `settlement_status` ao vincular a OS (continua `a_compensar` até encontrar o crédito no OFX). Se a OS ainda não teve baixa registrada, atualizar `paid_value` com base no `gross_amount` (não no líquido).
4. **Alinhamento do Modal Manual e UI:**
   - Em `ManualMatchOsModal.tsx`, exibir de forma discriminada: **Valor Bruto**, **Taxa MDR** e **Valor Líquido** com os valores e rótulos exatos.
   - Aplicar tokens semânticos de `DESIGN.md` (substituir classes arbitrárias como `bg-zinc-950 border-zinc-800` por `bg-background border-border`).
5. **Auditoria forense antes de sanear a base de 24/09:**
   - Inspecionar via consultas de leitura os dados de 22 a 24/09, confrontar com a planilha oficial da Rede assim que disponibilizada e corrigir pontualmente os vínculos e datas afetados, sem `DELETE` em massa.

## Skills Consultadas

- `sdd-proposal`: Planejamento determinístico e conformidade de guardrails.
- `database`: Padrões PostgreSQL, DDL idempotente, locks transacionais e RPCs.
- `backend-patterns`: Mutações cirúrgicas, isolamento de fluxo e tolerância numérica.
- `frontend-design-pro`: Padrões de design system Zinc-950, tokens semânticos e eliminação de AI Slop.

## Contratos de Dados e Arquivos Afetados

### Arquivos Existentes Reutilizados / Modificados:
1. [src/components/importacoes/CentralImportWizard.tsx](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/src/components/importacoes/CentralImportWizard.tsx): Correção de `target_date = effectivePosDate` para transações POS na ingestão.
2. [src/components/conciliacao/StoreCartaoMaquininhaView.tsx](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/src/components/conciliacao/StoreCartaoMaquininhaView.tsx): Ajuste de filtro para `target_date.eq.${date}` e enriquecimento de dados da linha.
3. [src/components/conciliacao/ManualMatchOsModal.tsx](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/src/components/conciliacao/ManualMatchOsModal.tsx): Correção dos rótulos (Bruto, MDR, Líquido) e tokens de UI do design system.
4. [src/components/importacoes/manual/Fase2RedeVsOsReview.tsx](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/src/components/importacoes/manual/Fase2RedeVsOsReview.tsx): Alinhamento para que a revisão manual não force `settlement_status = 'entrou'`.
5. [src/lib/matchers/autoMatchingEngine.ts](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/src/lib/matchers/autoMatchingEngine.ts): Alinhamento do simulador em memória com a regra estrita de bruto e unicidade.

### Arquivos Novos:
1. `supabase/migrations/20260928000001_canonical_rede_os_matcher_and_date_isolation.sql`: Nova migration contendo a definição canônica da RPC `auto_match_daily_transactions` e alinhamento de `match_stage2_rede_os`.
2. `specs/440-rede-os-isolamento-data-matcher-canonico/proposal.md`: Este documento.
3. `specs/440-rede-os-isolamento-data-matcher-canonico/design.md`: Especificação técnica de fluxos, interfaces e cenários.
4. `specs/440-rede-os-isolamento-data-matcher-canonico/spec-plan.md`: Plano atômico de execução.

## Risco Principal e Rollback

- **Risco Principal:** Reatribuir a data da venda (`target_date`) de registros históricos já inseridos pode alterar os totais de relatórios fechados de dias anteriores ou afetar o cálculo de faturamento já consolidado.
- **Mitigação:** Não realizar UPDATEs em lote cego. A correção de dados históricos será feita apenas após conferência visual com a planilha oficial da Rede, registrando os IDs alterados.
- **Plano de Rollback:**
  1. No banco de dados: Criar script de reversão restaurando a versão anterior da RPC através da migration `20260914000034_fix_rede_ofx_settlement_and_summary.sql`.
  2. No frontend: Reverter os arquivos modificados via checkout pontual no Git (`git checkout -- src/...`).
  3. Nos dados: Qualquer correção de registros será precedida por exportação em arquivo JSON/SQL de backup em `.tmp/` contendo os IDs e campos originais.
