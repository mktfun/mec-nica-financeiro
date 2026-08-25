## Análise Crítica — [Contrarian]

> **Alvo:** Sistema de conciliação financeira multi-loja (rede de oficinas)
> **Round:** 1 — Posição Inicial Isolada
> **Data:** 2026-08-24

---

### Premissas Falsas Identificadas

#### 1. "A chave `(store_id, net_amount_cents, entry_date)` garante unicidade em `pos_transactions`"

**FALSA.** A proposta assume que uma combinação de loja + valor + data é naturalmente única para transações de maquininha. Isso é factualmente errado:

- Uma loja que processa dois pagamentos de **R$ 150,00 no mesmo dia** (ex: dois carros diferentes pagando o mesmo serviço de revisão básica) terá dois registros com `(store_id, entry_date, net_amount_cents = 15000)` — **idênticos pela chave proposta**.
- A constraint vai rejeitar a segunda transação legítima com `unique_violation`, silenciando dados reais de faturamento.
- Pior: se o `ON CONFLICT DO NOTHING` for adotado, o sistema registra silenciosamente menos receita do que o real. Ninguém percebe até a auditoria — e só percebe porque o dinheiro "sobrou" no banco.

**Evidência no código:** A migration 000004 não mostra nenhuma coluna de identificador natural (ex: `authorization_code`, `nsu`, `terminal_id`) em `pos_transactions`. A chave proposta é puramente posicional e colidirá em operação real de uma rede de oficinas com volume significativo.

---

#### 2. "O guard clause `.ilike('description', '%OS #<numero>%')` é suficiente para idempotência no vault"

**FALSA E JÁ QUEBRADA.** O código em `useImportProcessor.ts` L149–L165 faz:

```typescript
const { data: existingVault } = await supabase
  .from('store_cash_vault')
  .select('id, status')
  .eq('store_id', storeId)
  .ilike('description', `%OS #${cashOs.os_number}%`)
  .limit(1);
```

A proposta de correção adiciona `UNIQUE CONSTRAINT em (store_id, os_number_ref)` + coluna `os_number_ref` dedicada. **Mas o código TypeScript ainda usa `.ilike()` na `description`** — a constraint do banco nunca seria acionada pelo fluxo de importação atual, porque o INSERT acontece apenas quando `existingVault.length === 0`. A proteção está no JavaScript, não no banco. A constraint seria redundante para o caminho feliz e irrelevante para o caminho perigoso (inserção direta).

---

#### 3. "ON CONFLICT DO UPDATE em `patio_os` resolve a race condition de reimportação"

**FALSA.** A proposta assume que reimportar é idempotente. Veja o que acontece na prática:

```
Importação Dia 1: OS #1234 → total_value=500, paid_value=300, status=pago_parcial
Importação Dia 2: planilha antiga (re-upload acidental) → total_value=500, paid_value=0, status=em_aberto
```

O `ON CONFLICT DO UPDATE` vai **sobrescrever** `paid_value` de 300 → 0 e `status` de `pago_parcial` → `em_aberto`. O dinheiro "desaparece" no registro.

**Evidência no código:** `useImportProcessor.ts` L94–L133 tem lógica de `delta_paid` e `history_log` que tenta mitigar isso — mas só no caminho TypeScript. Se o `ON CONFLICT DO UPDATE` no banco for implementado sem cláusulas de guarda (`WHERE excluded.paid_value > patio_os.paid_value`), o banco sobrescreve cegamente.

---

#### 4. "Soft-delete no vault resolve o problema de registros 'depositado' sumindo do cálculo"

**FALSA POR DEFINIÇÃO.** O bug original é que após a baixa (`status=depositado`), a RPC filtra apenas `em_transito` e o valor some. A proposta de soft-delete **não muda nada nessa equação**: registros `depositado` continuam sendo excluídos do SUM. Migration 000010, L161–L165:

```sql
WHERE entry_date <= v_target_date
  AND status IN ('em_transito', 'pending');
```

O registro `depositado` **continua invisível para o SUM**. A proposta resolve apenas a auditoria visual — não o bug de cálculo conforme narrado.

---

### Edge Cases Fatais

#### EC-1: Migration UNIQUE em tabela com dados já duplicados → FALHA EM PRODUÇÃO

```sql
-- Estado atual em produção (pos_transactions):
(store_id='loja-1', entry_date='2026-08-20', net_amount_cents=15000)  -- linha 1 (original)
(store_id='loja-1', entry_date='2026-08-20', net_amount_cents=15000)  -- linha 2 (duplicata existente)
```

Ao executar:
```sql
ALTER TABLE pos_transactions
ADD CONSTRAINT uq_pos_tx UNIQUE (store_id, entry_date, net_amount_cents);
```

O PostgreSQL retorna:
```
ERROR:  could not create unique index "uq_pos_tx"
DETAIL:  Key (store_id, entry_date, net_amount_cents)=(loja-1, 2026-08-20, 15000) is duplicated.
```

**A migration falha. O deploy trava.** Ninguém na proposta menciona o passo obrigatório de **deduplicar os dados antes** de adicionar a constraint. O mesmo risco existe para `patio_os` e `store_cash_vault`.

---

#### EC-2: Auto-Match cria dados corrompidos que a migration não limpa

`useImportProcessor.ts` L228–L242:

```typescript
const matchedOs = openStoreOs.find(o => {
  const saldo = Number(o.total_value || 0) - Number(o.paid_value || 0);
  return (Math.abs(Number(o.total_value || 0) - recVal) <= 0.05)
      || (Math.abs(saldo - recVal) <= 0.05);
});
```

- **Falsos positivos em escala:** Com 50 OSs abertas e múltiplos recebíveis do mesmo valor, `Array.find()` fecha a **primeira OS que encontrar** — sem critério de data, loja de origem, ou confirmação humana.
- **Dados corrompidos não são limpos pelas migrations:** As OSs fechadas erroneamente já existem no banco antes das migrations. As constraints novas não corrigem isso.
- **Sem reversão:** Reimportar a planilha pode disparar `ON CONFLICT DO UPDATE` e sobrescrever novamente.

---

#### EC-3: Vault cresce infinito sem estratégia de limpeza

300 dias/ano × 10 lojas × 5 OSs com dinheiro/dia = **15.000 registros/ano**. Em 5 anos: 75.000 registros.

A RPC executa `SUM(amount) WHERE entry_date <= v_target_date AND status = 'em_transito'` — range scan crescente, sem particionamento temporal, sem TTL, sem job de arquivamento mencionado em nenhuma spec.

---

#### EC-4: Edge Functions ignoram todos os guards TypeScript

O sistema tem RPC `delete_import_batch` e lógica de backend que escreve diretamente no banco. Qualquer Edge Function que insira em `store_cash_vault` sem `os_number_ref`, ou em `pos_transactions` sem respeitar a nova constraint, rompe silenciosamente a proteção proposta. O `.ilike()` guard no TypeScript protege apenas o hook `useProcessImportedData()`.

---

#### EC-5: `manual_transactions` acumula sem idempotência

`useImportProcessor.ts` L325 (comentário explícito no código):

```typescript
// Removida a trava de idempotência por os_number para permitir transações de deltas
```

Cada reimportação que gerar `delta_paid > 0` cria **novos registros em `manual_transactions`**. O extrato acumula entradas duplicadas. Nenhuma das specs 280/281 menciona ou propõe correção para isso.

---

### O que a proposta NÃO resolve

1. **Dados corrompidos pré-existentes:** Nenhuma migration de limpeza/deduplicação retroativa. As constraints são para dados futuros; o lixo histórico permanece.

2. **`manual_transactions` sem idempotência:** Explicitamente removida. Fora do escopo das correções.

3. **Auto-match falso positivo:** Contamina `patio_os` e `store_cash_vault` de forma irreversível sem auditoria humana.

4. **Divergência entre as duas versões da RPC:** Migration 000010 usa `status IN ('em_transito', 'pending')` — o status `'pending'` não existe no `CHECK constraint` da tabela (aceita apenas `'em_transito'`, `'depositado'`, `'cancelado'`). Dead code que mascara inconsistência futura.

5. **Valores hard-coded em SQL de produção:** Migration 000004, L144–L150:
   ```sql
   IF v_target_date = '2026-08-24'::date THEN
       v_caixa_anterior := 150600.29;
       v_faturamento_anterior := 746804.77;
   ```
   Valores financeiros reais hard-coded em SQL. Corrigir exige novo deploy de migration.

6. **Ausência de transação atômica no fluxo de importação:** `savePatioOsAndReceivables` executa múltiplas operações sequenciais sem envelope de transação. Falha de rede após `patio_os.insert` e antes de `store_cash_vault.insert` deixa o banco em estado parcialmente atualizado, sem rollback.

---

### Riscos Ocultos

| # | Risco | Probabilidade | Impacto |
|---|-------|:---:|:---:|
| R1 | Migration falha em produção por dados duplicados pré-existentes | **ALTA** | CRÍTICO — deploy bloqueado |
| R2 | UNIQUE em `pos_transactions` rejeita transações legítimas de mesmo valor no mesmo dia | **ALTA** | CRÍTICO — perda de receita registrada |
| R3 | `ON CONFLICT DO UPDATE` em `patio_os` apaga `paid_value` em reimportação de planilha antiga | **MÉDIA** | CRÍTICO — dinheiro "some" do sistema |
| R4 | Auto-match fecha OSs erradas de forma irreversível | **MÉDIA** | ALTO — distorção do pátio e do fluxo de caixa |
| R5 | `manual_transactions` acumula duplicatas sem controle | **ALTA** | MÉDIO — extrato poluído, somas incorretas |
| R6 | `status = 'pending'` na RPC referencia valor não permitido pela CHECK constraint | **BAIXA** | BAIXO — dead code agora, inconsistência futura |
| R7 | Valores hard-coded `150600.29` e `746804.77` em SQL de produção | **CERTA** | MÉDIO — impossibilidade de correção sem deploy |
| R8 | Sem transação atômica na importação → estado parcial em falha de rede | **MÉDIA** | ALTO — inconsistência sem detecção |
| R9 | Vault cresce indefinidamente sem arquivamento → degradação de performance da RPC | **CERTA** (longo prazo) | MÉDIO — lento, mas inevitável |
| R10 | Edge Functions escrevem direto no banco sem passar pelos guards TypeScript | **ALTA** | ALTO — todas as correções de aplicação são contornadas |

---

### Recomendação Final

**Veredicto:** ❌ NO-GO

**Confiança:** 0.85

**Justificativa:** A proposta corrige os sintomas mais visíveis (bug do ilike, duplicatas de POS, race condition de patio_os), mas falha em três dimensões críticas. Primeiro, **a migration vai falhar em produção** porque não há etapa de deduplicação prévia dos dados históricos — e qualquer banco que sofreu o bug a ser corrigido já tem os dados duplicados que a constraint vai rejeitar. Segundo, **a chave UNIQUE escolhida para `pos_transactions` é semanticamente incorreta** para o domínio: transações de maquininha não são naturalmente únicas por valor+data+loja, e a proposta vai rejeitar transações legítimas ou silenciar dados reais. Terceiro, **o sistema tem pelo menos dois vetores de corrupção ativos que não são endereçados** — o auto-match sem controle de falsos positivos e `manual_transactions` com idempotência explicitamente removida. O rework mínimo necessário é: (a) migration de limpeza de duplicatas antes das constraints, (b) substituição da chave de `pos_transactions` por um identificador natural do relatório da Rede (NSU, código de autorização ou hash do lote), (c) guarda no `ON CONFLICT DO UPDATE` de `patio_os` para nunca regredir `paid_value`, e (d) restauração de idempotência em `manual_transactions`.
