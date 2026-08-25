## Análise Arquitetural — [Architect]

> **Round 1 — Posição Inicial Isolada**
> Data: 2026-08-24 | Sistema: Conciliação Financeira Multi-Loja (Rede de Oficinas)

---

### Avaliação da Proposta

#### Contexto Arquitetural Observado

Após leitura integral de `useImportProcessor.ts`, das duas migrations e dos dois design specs, o sistema se organiza em três camadas:

1. **Camada de Ingestão (TypeScript/cliente):** `savePatioOsAndReceivables` em `useImportProcessor.ts` — responsável por idempotência de OSs, escrita no cofre e auto-match de recebíveis. Toda a lógica de guarda anti-duplicata vive aqui, em memória, por sessão.
2. **Camada de Persistência (PostgreSQL/Supabase):** Tabelas `patio_os`, `store_cash_vault`, `pos_transactions`, `receivables` — sem constraints estruturais de unicidade nas colunas de negócio críticas.
3. **Camada de Cálculo/Reconciliação (RPCs PL/pgSQL):** `get_daily_reconciliation_summary` + `get_store_pos_triple_reconciliation` — agrega valores via SUM; a correção de juros e deduplicação ainda não está materializada nestas migrations lidas.

O **problema central** é que a camada 1 faz trabalho que deveria ser responsabilidade da camada 2. A base de dados não impõe as invariantes de negócio; ela apenas confia que o cliente sempre se comportará corretamente — o que é estruturalmente insustentável.

---

### Pontos Fortes Arquiteturais

1. **Separação de concerns presente:** O padrão de ter RPCs calculistas desacopladas do cliente React é correto. A RPC `get_daily_reconciliation_summary` é o único ponto de verdade para o fechamento diário — isso é uma decisão arquitetural sólida.

2. **Soft-delete no `store_cash_vault` está conceitualmente correto:** O domínio financeiro exige imutabilidade de auditoria. Registros de dinheiro em trânsito jamais devem ser deletados fisicamente — a transição de estado (`em_transito → depositado`) é o padrão correto para esse domínio (análogo a ledgers contábeis append-only).

3. **Coluna dedicada `os_number_ref` é arquiteturalmente superior ao parse de `description`:** A proposta de substituir o guard `.ilike('description', '%OS #<numero>%')` por uma coluna estruturada `os_number_ref` é a decisão certa. Colunas de texto livre não devem ser chaves de idempotência — são dados de apresentação, não de identificação.

4. **UNIQUE CONSTRAINT em `patio_os(store_id, os_number)` resolve a race condition estruturalmente:** Mover o guard do JavaScript para o banco é a única correção duradoura. O `ON CONFLICT DO UPDATE` (upsert atômico) elimina a janela de corrida entre o `SELECT existingMap` e o `INSERT` na linha 136.

5. **Intenção de deduplicação em `pos_transactions` antes do SUM é correta:** Agregar com `SUM` sem deduplicar é um bug de semântica de dados — a proposta de calcular sobre registros DISTINCT/deduplicados antes de agregar é o caminho certo.

---

### Riscos Estruturais e Dívida Técnica

#### RISCO CRÍTICO 1 — Chave Natural Incorreta para `pos_transactions`

A UNIQUE CONSTRAINT proposta `(store_id, entry_date, net_amount_cents)` é **semanticamente fraca** para este domínio.

- **Problema:** Duas transações distintas de cartão de crédito, na mesma loja, na mesma data, com o mesmo valor líquido são perfeitamente possíveis (ex: dois clientes pagando R$ 150,00 em dias de alto volume). Esta constraint geraria **falsos positivos** — descartaria transações legítimas como se fossem duplicatas.
- **Solução correta:** A chave natural para `pos_transactions` deve incluir um identificador externo provido pela operadora (número de lote, NSU, código de autorização), ou minimamente `(store_id, entry_date, gross_amount_cents, brand, installments)`. Se a fonte de dados não fornece NSU, a constraint deve ser `(store_id, external_batch_id)` quando disponível, ou documentada explicitamente como "melhor esforço".
- **Dívida técnica:** Se a constraint incorreta for aplicada, ela silenciosamente descartará transações reais, gerando subcontagem — um bug pior que o de duplicata, pois não é visível.

#### RISCO CRÍTICO 2 — `ON CONFLICT DO UPDATE` em `patio_os` pode sobrescrever dados corretos

O código atual (linhas 94–132 de `useImportProcessor.ts`) implementa lógica inteligente de `history_log` — só faz update se houver mudança real, e registra o delta. Se o `ON CONFLICT DO UPDATE` do banco for implementado de forma ingênua (substituindo todos os campos), ele **destrói o `history_log`** e a lógica de `last_payment_date`.

- **Risco específico:** Uma reimportação com dados parciais (planilha incompleta) executando `ON CONFLICT DO UPDATE SET paid_value = EXCLUDED.paid_value` pode **retroceder** `paid_value` de um OS que já teve pagamento registrado.
- **Solução:** O `ON CONFLICT DO UPDATE` deve usar `GREATEST()` para campos cumulativos (`paid_value`) e `COALESCE()` para campos não-nulos. Ou melhor: manter a lógica de update inteligente no cliente, usando a constraint apenas para `INSERT` com `ON CONFLICT DO NOTHING` e tratando updates separadamente via `id`.

#### RISCO ESTRUTURAL 3 — Soft-delete resolve o problema, mas expõe novo acoplamento temporal

O filtro `WHERE status = 'em_transito'` na vault_store CTE (migration 000004, linha 283; migration 000010, linha 275) **funciona corretamente** com soft-delete — registros `depositado` somem do cálculo do cofre, o que é o comportamento desejado (o dinheiro já entrou no OFX bancário).

Porém, há um **gap de dupla-contagem transitória**: entre o momento em que o usuário dá baixa (`status → depositado`) e o OFX do banco ser importado com aquela entrada, o patrimônio total aparece **reduzido** (saiu do cofre mas ainda não entrou no OFX). Isso não é erro da proposta — é latência inerente ao domínio — mas não está documentado nas specs como comportamento esperado, gerando potencial confusão de usuário.

#### RISCO ESTRUTURAL 4 — RPC de juros: deduplicação pré-SUM tem edge case com ajustes parciais

Se a deduplicação for implementada como `SELECT DISTINCT ON (store_id, entry_date, net_amount_cents)`, ela resolve o bug de duplicata de importação, mas **colapsa** casos onde uma mesma combinação `(loja, data, valor)` representa dois lotes distintos de maquininha. O cálculo de juros (`rede_taxas`) deve ser deduplicado por `id` de transação, não por combinação de valores.

#### RISCO DE DÍVIDA TÉCNICA — Hardcoded values nas RPCs

As migrations contêm **valores hardcoded** que são um alarme estrutural:

```sql
-- migration 000004, linhas 144-145:
IF v_target_date = '2026-08-24'::date THEN
    v_caixa_anterior := 150600.29;
```

Isso não é um bug de curto prazo — é dívida técnica imediata. Para um sistema financeiro de múltiplas lojas, valores de saldo inicial devem estar em tabela de configuração (`daily_snapshots` ou similar), não em código de função. Qualquer auditoria futura ou migração de data base vai exigir alteração de código SQL, não de dados.

#### RISCO DE DÍVIDA TÉCNICA — `manual_transactions` sem constraint de idempotência

As linhas 348–350 de `useImportProcessor.ts` fazem `supabase.from('manual_transactions').insert(txToInsert)` sem nenhum guard de idempotência. Uma reimportação da mesma planilha cria N cópias de todas as transações de extrato. A proposta corrige `patio_os` e `store_cash_vault` mas deixa `manual_transactions` vulnerável.

---

### Recomendação Final

**Veredicto:** `NEEDS-REWORK`

**Confiança:** 0.78

**Justificativa:** A direção arquitetural da proposta é correta — mover as invariantes de negócio para o banco de dados via UNIQUE CONSTRAINTs, adotar soft-delete auditável e colunas dedicadas ao invés de parse de texto livre são decisões que reduzem dívida técnica estrutural de forma significativa. O problema não é a direção, é a granularidade: a chave natural escolhida para `pos_transactions` é semanticamente incorreta para o domínio e pode introduzir perda silenciosa de dados legítimos; o `ON CONFLICT DO UPDATE` em `patio_os` precisa de semântica de merge cuidadosa para não retroceder estados; e os valores hardcoded nas RPCs precisam ser externalizados antes que o sistema seja considerado arquiteturalmente sólido. Com ajustes pontuais nesses três itens — chave composta correta para POS, merge defensivo no upsert de OS, e externalização dos saldos iniciais — a proposta fica **pronta para GO**.
