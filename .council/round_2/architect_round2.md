## Análise Arquitetural — Round 2 (Refutação) — [Architect]

> **Data:** 2026-08-24 | **Round:** 2 — Refutação Obrigatória
> **Regra cumprida:** citação nominal de 4 agentes com AGREE/REBUT/REFINE explícito

---

### Reações aos Claims do Round 1

---

#### [Engineer] — Claim 1: "UNIQUE CONSTRAINT no banco é estritamente superior ao guard clause TS"

**→ AGREE (com ampliação arquitetural)**

O Engineer está correto na hierarquia de proteção: constraint no banco é o único mecanismo verdadeiramente atômico e transversal a todas as escritas (UI, Edge Functions, scripts de manutenção, RPCs diretas). O guard clause TypeScript é defesa de aplicação — contornável por qualquer path que não passe pelo hook `useProcessImportedData()`.

Do ponto de vista arquitetural, o padrão correto é **Defense in Depth em camadas**:

```
Camada 1 (Banco)      → UNIQUE CONSTRAINT — proteção absoluta, inviolável
Camada 2 (RPC/SQL)    → ON CONFLICT DO UPDATE com predicados WHERE
Camada 3 (TypeScript) → guard clause como otimização (evita round-trip)
```

Remover a camada 1 e confiar apenas na camada 3 é um anti-padrão clássico de **dívida técnica estrutural**: funciona enquanto há um único ponto de escrita, quebra silenciosamente quando o sistema cresce.

---

#### [Engineer] — Claim 2: "`CREATE UNIQUE INDEX CONCURRENTLY` não pode rodar dentro de transaction block — Migrations Supabase via `supabase db push` falharão"

**→ AGREE (crítico, mas CONTORNÁVEL com padrão já documentado)**

O Engineer identificou um problema operacional real. `CREATE UNIQUE INDEX CONCURRENTLY` é fundamentalmente incompatível com blocos de transação porque exige múltiplos passes na tabela. O Supabase CLI envolve cada migration em `BEGIN/COMMIT` por padrão.

**A solução existe e é madura:** o Supabase suporta migrations com `-- no transaction` no cabeçalho da migration. A DDL de criação de índice deve ser isolada em uma migration exclusiva com esse marcador:

```sql
-- migration: 20260824000011_unique_indexes_no_tx.sql
-- no transaction

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_patio_os_store_os
  ON patio_os (store_id, os_number);

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_vault_store_os_ref
  ON store_cash_vault (store_id, os_number_ref)
  WHERE os_number_ref IS NOT NULL;
```

**Avaliação arquitetural:** Esse não é um bloqueador de design — é um requisito de execução operacional. A proposta original não especificou essa separação de migration, o que representa uma **lacuna de spec, não uma falha arquitetural**. A correção tem custo zero de redesign.

---

#### [Contrarian] — Claim 1: "A migration VAI FALHAR em produção porque a proposta não inclui etapa de dedup de dados históricos antes das constraints"

**→ AGREE — esse é o ponto mais sólido do NO-GO**

O Contrarian acerta aqui. Adicionar um `UNIQUE INDEX` em tabela que já contém duplicatas **falha com erro imediato**, independentemente de `CONCURRENTLY`. A ordem correta de operações é:

```
1. DIAGNOSTICAR  → queries de contagem de duplicatas (os KPIs do Analyst servem)
2. DEDUPLICAR    → DELETE/MERGE dos registros duplicados históricos
3. CRIAR INDEX   → somente após dados limpos
4. ALTERAR CÓDIGO → ativar novos paths com ON CONFLICT
```

A proposta original omite os passos 1 e 2 no documento de spec. Isso não é falha da ideia — é falha da especificação de execução. **A correção é adicionar uma migration de limpeza prévia**, não abandonar as constraints.

Do ponto de vista arquitetural, o padrão correto para migrations destrutivas em sistemas em produção é sempre: **expand → migrate → contract**. A proposta atual foi direto para o "contract" sem o "migrate".

---

#### [Contrarian] — Claim 2: "`ON CONFLICT DO UPDATE` em `patio_os` pode sobrescrever `paid_value` com valor menor (planilha antiga)"

**→ REFINE — o problema é real, mas a solução está documentada no próprio Engineer**

O Contrarian descreve um bug legítimo de semântica de upsert. Entretanto, o Engineer já propôs a mitigação correta no Round 1:

```sql
DO UPDATE SET
  paid_value = GREATEST(EXCLUDED.paid_value, patio_os.paid_value),
  status = CASE
    WHEN EXCLUDED.paid_value < patio_os.paid_value THEN patio_os.status
    ELSE EXCLUDED.status
  END
WHERE patio_os.status NOT IN ('cancelado')
```

O problema não é o `ON CONFLICT DO UPDATE` em si — é um `ON CONFLICT DO UPDATE` **sem predicados de guarda**. Isso é um erro de implementação do `ON CONFLICT`, não uma falha da abordagem arquitetural. A solução com `GREATEST()` e `CASE` é padrão SQL92 e resolve sem complexidade adicional.

**O claim do Contrarian deveria ser "ON CONFLICT sem guardrails vai falhar" — não "ON CONFLICT é errado".**

---

#### [Contrarian] — Claim 3: "Soft-delete NO vault NÃO resolve o bug de cálculo — registros `depositado` continuam invisíveis no SUM da RPC"

**→ AGREE — é um bug real de design, mas está fora do escopo dos 3 bugs declarados**

O Contrarian está tecnicamente correto: a RPC filtra `status IN ('em_transito', 'pending')` e registros `depositado` somem do cálculo. O soft-delete resolve apenas rastreabilidade (auditoria), não o SUM financeiro.

**Porém, do ponto de vista arquitetural, isso é o comportamento CORRETO para saldo em caixa:** dinheiro depositado no banco não deve contar no saldo de "dinheiro em loja". O bug real, como o Engineer apontou, é que a UI não mostra uma tela de auditoria de transferências — o dinheiro não "some", ele muda de categoria.

O Contrarian interpreta como bug de cálculo o que é na verdade um bug de **apresentação e rastreabilidade**. A semântica do saldo está correta; a visibilidade da transição está ausente.

---

#### [Analyst] — Claim: "ROI de 77:1 a 376:1 — breakeven no primeiro mês"

**→ REFINE — o ROI é real, mas condicionado ao sucesso do deployment**

O Analyst apresenta números sólidos e metodologicamente corretos. O ponto de refutação é que o ROI pressupõe deployment bem-sucedido. Se a migration falhar em produção (probabilidade de 35% estimada pelo próprio Analyst), o custo de recuperação (rollback + diagnóstico + replanejamento) pode adicionar 4–16h de engenharia ao custo base, mas **não invalida o ROI do projeto** — apenas adia o breakeven em 2–4 semanas.

Do ponto de vista arquitetural, o ROI é um argumento **para** priorizar a correção, não um argumento de que a proposta pode ser executada sem as correções de processo identificadas pelo Contrarian e pelo Engineer.

---

### O NO-GO do Contrarian é justificado ou exagerado?

**Parcialmente justificado, mas o veredicto final é exagerado.**

O Contrarian identifica problemas reais:
- ✅ Migration sem dedup prévia → REAL e CRÍTICO (mas solucionável em 1 migration extra)
- ✅ Chave UNIQUE em `pos_transactions` semanticamente frágil → REAL e CRÍTICO (mas o Engineer também identificou isso)
- ✅ Auto-match com falsos positivos → REAL, mas pré-existente (não é criado pela proposta)
- ✅ `manual_transactions` sem idempotência → REAL, mas explicitamente fora do escopo declarado

O NO-GO seria correto se a proposta fosse executada **como está escrita**. Mas o débito do Contrarian é tratar lacunas de especificação como falhas arquiteturais irrecuperáveis. A estrutura da solução (UNIQUE CONSTRAINTS + ON CONFLICT + deduplicação de SUM) é **arquiteturalmente sólida** — o que está faltando são os passos de execução segura.

**A diferença arquitetural entre NO-GO e NEEDS-REWORK é:** a fundação precisa ser demolida, ou apenas concretada antes de construir? Neste caso, a fundação é sólida. O concreto (migration de limpeza + guardas no ON CONFLICT + separação de migration CONCURRENTLY) ainda não foi colocado.

---

### Revisão do Meu Veredicto

No Round 1, meu veredicto foi **NEEDS-REWORK** com confiança 0.82.

Após ler os três agentes:

1. O Engineer **confirma** que os problemas técnicos são contornáveis com padrões documentados.
2. O Analyst **confirma** que o ROI justifica o esforço adicional de rework.
3. O Contrarian **eleva** a certeza de que o rework é necessário antes do GO — especialmente a migration de dedup e os predicados no ON CONFLICT.

**A fundação arquitetural permanece sólida. O rework identificado é de processo de execução, não de redesign.**

---

### Recomendação Final (Revisada)

**Veredicto:** NEEDS-REWORK

**Confiança:** 0.88 ↑ (de 0.82)

**Justificativa:** O debate do Round 1 consolidou o quadro: a proposta tem **arquitetura correta e execução incompleta**. Os três bugs identificados são reais, as correções propostas são estruturalmente válidas, e o ROI justifica amplamente o investimento. O rework necessário está bem delimitado em quatro itens não-negociáveis: **(1)** adicionar migration de diagnóstico e deduplicação de dados históricos como passo 0, antes de qualquer UNIQUE INDEX; **(2)** isolar todos os `CREATE UNIQUE INDEX CONCURRENTLY` em migration com `-- no transaction`; **(3)** adicionar predicados `GREATEST()` e `WHERE` no `ON CONFLICT DO UPDATE` de `patio_os` para nunca regredir `paid_value`; **(4)** redesenhar a chave de `pos_transactions` para incluir um identificador natural da rede (NSU/hash) em vez de usar valor+data como surrogate de unicidade. Esses quatro itens têm custo de 4–8h adicionais de engenharia — dentro da margem do ROI de 77:1 — e transformam um NEEDS-REWORK em GO com alta confiança.
