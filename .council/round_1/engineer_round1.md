## Análise de Implementação — [Engineer]

> **Contexto:** Sistema de conciliação financeira multi-loja (rede de oficinas).
> Três bugs críticos com proposta de correção. Análise baseada na leitura dos 5 arquivos especificados.

---

### O que é fácil de implementar AGORA

| Item | Descrição | Esforço |
|---|---|---|
| **UNIQUE em `patio_os(store_id, os_number)`** | Tabela já usa upsert manual por Map em memória. Constraint é back-stop perfeito. `CREATE UNIQUE INDEX CONCURRENTLY` — não tranca tabela em produção. | **XS** — 1 migration, 10 min |
| **ON CONFLICT DO UPDATE em `patio_os`** | O loop `toInsert / toUpdate` atual já resolve a lógica; o UNIQUE permite simplificar para um único `upsert` com `onConflict`. Muda ~15 linhas do TS. | **S** — 30 min |
| **Coluna `os_number_ref` em `store_cash_vault`** | `ALTER TABLE ... ADD COLUMN IF NOT EXISTS os_number_ref TEXT` é DDL rápido e não-bloqueante em Postgres moderno (sem NOT NULL sem default). Coluna nullable inicialmente, sem risco. | **XS** — 5 min |
| **UNIQUE em `store_cash_vault(store_id, os_number_ref)`** | NULLs não violam UNIQUE em Postgres. Seguro criar direto após adicionar coluna e popular retroativamente. | **S** — 15 min |
| **Substituir guard `.ilike` por lookup na nova coluna** | Trocar linhas 149–154 de `useImportProcessor.ts`: `.eq('os_number_ref', cashOs.os_number)` em vez do ILIKE frágil. Uma linha muda no TS, resultado imediato. | **XS** — 5 min |
| **Deduplicação de `pos_transactions` na RPC** | Ambas as RPCs (migration 000004 e 000010) não fazem DISTINCT antes do SUM de `rede_liquido`. Adicionar `SELECT DISTINCT ON (store_id, entry_date, net_amount_cents)` no CTE já deduplica sem migration de schema. | **S** — 20 min, só SQL |

---

### Riscos de Regressão

#### Bug 1 — Dinheiro / `store_cash_vault`

| Risco | Detalhe | Mitigação |
|---|---|---|
| **Registros históricos sem `os_number_ref`** | A coluna nova estará NULL para todos os rows existentes. O novo guard `.eq('os_number_ref', ...)` não encontrará esses registros → nova importação re-insere duplicata | Fazer `UPDATE store_cash_vault SET os_number_ref = regexp_replace(description, '.*OS #(\d+).*', '\1')` retroativamente na própria migration, antes do UNIQUE INDEX |
| **`status=depositado` some do dashboard** | Já acontece. A vault_store CTE em ambas as RPCs filtra `status = 'em_transito'` — isso é correto para o saldo financeiro. O bug real é que a UI não tem tela de auditoria para ver `depositado`. | Manter filtro `em_transito` na RPC; criar view/aba auditoria separada |
| **Campos que NUNCA devem ser sobrescritos no ON CONFLICT** | `created_at`, `deposited_at`, `deposited_by`, `status` (se já for `depositado`/`cancelado`) | `DO UPDATE SET amount = EXCLUDED.amount WHERE store_cash_vault.status = 'em_transito'` |

#### Bug 2 — POS / Rede

| Risco | Detalhe | Mitigação |
|---|---|---|
| **UNIQUE CONSTRAINT fraco em `pos_transactions`** | `(store_id, entry_date, net_amount_cents)` pode rejeitar transações legítimas de mesmo valor na mesma data para a mesma loja | Adicionar `transaction_type` e `gross_amount_cents` à chave composta. Ou usar `dedup_hash` como modelo (já existe em `transactions`) |
| **SUM sem DISTINCT na RPC** | A função `get_store_pos_triple_reconciliation` é chamada como black box — risco de amplificação silenciosa | Ler o código dessa função antes de mexer nas RPCs |

#### Bug 3 — Reimportação Geral

| Risco | Detalhe | Mitigação |
|---|---|---|
| **Race condition real em `patio_os`** | O código faz SELECT + INSERT em dois statements separados (L46–136). Sem UNIQUE + ON CONFLICT, dois imports simultâneos passam pela janela entre SELECT e INSERT | UNIQUE CONSTRAINT + upsert resolve atomicamente |
| **`history_log` sobrescrito no ON CONFLICT** | Se o payload não incluir o histórico acumulado, o `history_log` seria perdido | Usar `patio_os.history_log || EXCLUDED.history_log` ou manter a lógica de build no TS e passar histórico consolidado no payload |

#### Risco Transversal: Travamento de Tabela (Lock)

| Operação | Lock Nível | Seguro em Produção? |
|---|---|---|
| `ALTER TABLE ADD COLUMN` nullable | ShareLock breve (ms) | ✅ Sim |
| `CREATE INDEX` simples | ShareLock bloqueante (tabela inteira) | ❌ Não usar |
| `CREATE UNIQUE INDEX CONCURRENTLY` | Nenhum lock exclusivo | ✅ Usar sempre |
| `ALTER TABLE ADD CONSTRAINT USING INDEX` | Lock breve pós-index | ✅ Combinado com CONCURRENTLY |

> **ATENÇÃO CRÍTICA:** `CREATE UNIQUE INDEX CONCURRENTLY` **não pode rodar dentro de uma transaction block**.
> Migrations Supabase via `supabase db push` rodam em bloco de transação por padrão — isso fará o CONCURRENTLY falhar silenciosamente ou com erro.
> **Solução:** separar essa DDL em uma migration dedicada com `-- no transaction` ou via Supabase Dashboard diretamente.

---

### Quick Wins (80% valor com 20% esforço)

Ordenados por ROI (valor entregue / risco de regressão):

1. **[XS, ZERO risco] Trocar `.ilike` por `.eq('os_number_ref', ...)` no TS (L149–154 de `useImportProcessor.ts`)**
   - Resolve idempotência do dinheiro sem nenhuma migration de schema
   - Pré-requisito: coluna `os_number_ref` já existir

2. **[XS, baixo risco] `ADD COLUMN IF NOT EXISTS os_number_ref TEXT` + UPDATE retroativo**
   - Migration de 3 linhas. UPDATE retro-fit via `regexp_replace` garante que rows existentes sejam reconhecidos no próximo import
   - Nenhum código de app quebra (coluna nullable)

3. **[S, baixo risco] `CREATE UNIQUE INDEX CONCURRENTLY` em `patio_os(store_id, os_number)` (migration isolada)**
   - Back-stop atômico que elimina race condition do Bug 3
   - Não muda nenhum código TS — apenas adiciona proteção no banco

4. **[S, baixo risco] Deduplicar SUM na RPC com `DISTINCT ON` ou subquery**
   - Sem migration de schema. Só reescrever o CTE de `pos_transactions` dentro da RPC existente
   - Juros corretos a partir do próximo fechamento, sem re-importar dados

5. **[M, risco moderado] `CREATE UNIQUE INDEX CONCURRENTLY` em `store_cash_vault(store_id, os_number_ref)` (migration isolada)**
   - Depende dos itens 1 e 2 estarem prontos e o UPDATE retroativo ter sido executado
   - Habilita ON CONFLICT como garantia definitiva

6. **[M, risco moderado] Simplificar `savePatioOsAndReceivables` para usar upsert nativo Supabase**
   - Após UNIQUE estar no banco, trocar `toInsert/toUpdate` loop por `.upsert(..., { onConflict: 'store_id,os_number' })`
   - **Campos que NUNCA devem ser sobrescritos:** `created_at`, `history_log` (deve ser mergeado)
   - **Campos que DEVEM ser atualizados:** `total_value`, `paid_value`, `status`, `raw_status`, `credit_value`, `debit_value`, `pix_transfer_value`, `cash_value`, `closed_at`, `last_payment_date`, `updated_at`

---

### Análise: UNIQUE CONSTRAINT no banco vs. guard clause no TS

| Critério | Guard Clause TS | UNIQUE CONSTRAINT DB |
|---|---|---|
| **Proteção cross-session** | ❌ Não protege | ✅ Protege sempre |
| **Race condition** | ❌ Janela entre SELECT e INSERT | ✅ Atômico |
| **Risco de regressão** | Baixo (lógica já existe) | Baixo (ADD CONCURRENTLY) |
| **Dependência de deployment** | Precisa deploy do frontend | Só migration |
| **Auditabilidade** | Invisível no banco | Constraint visível e testável |

**Veredicto:** UNIQUE CONSTRAINT no banco é estritamente superior. O guard clause TS pode coexistir como otimização (evita round-trips desnecessários ao banco), mas nunca como única proteção.

---

### Recomendação Final

**Veredicto:** GO — com **sequência obrigatória de execução**

**Confiança:** 0.87

**Justificativa:** A proposta de correção é tecnicamente sólida e os bugs identificados são reais e verificáveis no código. A maior armadilha de implementação é a **ordem das operações**: (1) adicionar `os_number_ref` nullable, (2) popular retroativamente via UPDATE (sem isso o UNIQUE INDEX não resolve nada para rows históricos), (3) criar UNIQUE INDEX CONCURRENTLY em **migration separada e sem transaction block** — esse é o ponto crítico que falha silenciosamente se feito dentro de bloco transacional padrão do Supabase CLI. O risco de regressão mais sério não é técnico: é o UNIQUE CONSTRAINT em `pos_transactions` com chave `(store_id, entry_date, net_amount_cents)` que pode rejeitar transações legítimas de mesmo valor na mesma data para a mesma loja — esse constraint específico precisa de redesign antes de ir para produção. Os demais itens são seguros para deploy imediato com janela de manutenção mínima (< 5 min de indisponibilidade, zero para os CONCURRENTLY).
