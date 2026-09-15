# Spec 401 — Proposal: Correção "Dar Baixa" de Dinheiro no Cofre (Dupla Efetivação e Erro Silenciado)

## Problema
Ao clicar em **"Dar Baixa"** no modal Raio-X de Saldos Bancários (`SaldoBancosDetailModal`), a operação aparenta funcionar (toast de sucesso aparece), mas:
1. **O saldo do cofre não diminui** na interface (chip "Dinheiro no Cofre" continua R$ 7.020,00)
2. **O saldo bancário pode inflar 2x** ou não mudar, dependendo da corrida de condições
3. **Erros da RPC são engolidos silenciosamente** — a RPC retorna `{success: false}` mas o frontend ignora e continua

### Causa-Raiz (Análise Forense)

**Bug 1 — Dupla Efetivação Bancária:**
A RPC `dar_baixa_dinheiro` (migração `20260910000046`, linhas 107-118) já faz:
```sql
UPDATE reconciliations SET bank_total = bank_total + v_amount_deposited WHERE store_id = v_target_store AND date = v_dep_date;
UPDATE daily_snapshots SET saldo_bancario = saldo_bancario + v_amount_deposited WHERE date = v_dep_date;
```
Mas o frontend `BaixaDinheiroModal.tsx` (linhas 164-211) **repete o mesmo update manualmente** via supabase client, creditando o valor 2x no `bank_total` e no `saldo_bancario`.

**Bug 2 — Erro Silenciado da RPC:**
A chamada `await supabase.rpc('dar_baixa_dinheiro', {...})` retorna `{data: {success: false, error: 'Registro de cofre nao encontrado'}, error: null}`. O Supabase client não joga exception porque `error` (HTTP) é null. O frontend não verifica `data.success` e assume sucesso, procedendo para a efetivação manual que infla o saldo sem ter mudado o status do cofre.

**Bug 3 — Snapshot Metadata Não Sincronizado pela RPC:**
A RPC atualiza `daily_snapshots.saldo_bancario` mas **NÃO** atualiza `metadata.dinheiro_lojas` / `metadata.dinheiro_em_lojas`. Quando o hook `useBackendConciliacao` recalcula, ele lê os vaults `em_transito` diretamente, mas o chip do ResumoDiaPanel pode ler do snapshot metadata congelado.

**Bug 4 — Badge Hardcoded:**
`SaldoBancosDetailModal.tsx` linha 304: `<Badge variant="success">R$ 154.794,67</Badge>` — valor estático fixo.

## Solução Proposta

### Estratégia: Eliminar a Dupla Efetivação + Validar Retorno da RPC

1. **Remover toda a efetivação manual do frontend** (linhas 164-211 do BaixaDinheiroModal.tsx) — a RPC já faz tudo atomicamente no PostgreSQL
2. **Verificar `data.success`** após cada chamada RPC e abortar com toast.error se falho
3. **Atualizar a RPC** para também sincronizar `metadata.dinheiro_lojas` no snapshot
4. **Remover badge hardcoded** no SaldoBancosDetailModal

### Skills Especializadas Aplicadas
- `database` (validação de RPC e migração SQL)
- `backend-patterns` (tratamento de erros de RPC no frontend)

## Contratos de Dados

### Tabela `store_cash_vault`
- `status`: `em_transito` → `depositado` (mutação da RPC `dar_baixa_dinheiro`)
- `deposited_at`: timestamp do depósito

### RPC `dar_baixa_dinheiro` (existente, a ser atualizada)
- Adicionar: Recalcular e atualizar `metadata.dinheiro_lojas` no `daily_snapshots` após a baixa

### Retorno da RPC
```json
{ "success": true, "updated_count": 1, "vault_id": "...", "amount_deposited": 1080, "status": "depositado" }
{ "success": false, "error": "Registro de cofre nao encontrado" }
```

## Arquivos Afetados

### [Arquivos Existentes Modificados]
1. **`src/components/conciliacao/BaixaDinheiroModal.tsx`** — Remover linhas 164-211 (efetivação manual duplicada), adicionar verificação de `data.success`
2. **`src/components/conciliacao/SaldoBancosDetailModal.tsx`** — Remover badge hardcoded linha 304
3. **`supabase/migrations/YYYYMMDDNNNNNN_fix_dar_baixa_dinheiro_metadata_sync.sql`** — [NOVA] Atualizar RPC para sincronizar `metadata.dinheiro_lojas` no snapshot

### [Arquivos Novos]
- Nenhum (apenas migração SQL nova)

## Plano de Rollback
1. Reverter as 2 edições de código (BaixaDinheiroModal, SaldoBancosDetailModal)
2. A RPC anterior continua funcional (adicionar sync é aditivo, não destrutivo)
3. Nenhuma alteração de schema — apenas lógica de RPC

## Risco Principal
- **Risco:** Se a RPC estiver em uma versão diferente no banco (a migração pode não ter rodado), o frontend ficará sem efetivação. **Mitigação:** Verificar via SQL se a migração rodou antes do deploy.
- **Risco:** Baixas que já foram creditadas 2x nos dias anteriores. **Mitigação:** Auditoria manual dos valores de `reconciliations.bank_total` para stores que receberam "Dar Baixa" — corrigir via backfill se necessário.
