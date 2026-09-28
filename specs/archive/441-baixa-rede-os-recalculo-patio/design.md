# Design Técnico — Spec 441: Baixa Rede × OS e Recálculo Atômico do Pátio

## 1. Arquitetura de Fluxo de Dados Ponta a Ponta

```
[UI: StoreCartaoMaquininhaView]
             │  (Seleciona transação Rede de R$ 3.794,28)
             ▼
[UI: ManualMatchOsModal]
             │  (Seleciona OS #1120 com saldo R$ 6.583,80)
             ▼
[Hook: useManualMatch.linkTransactionToOs]
             │  (RPC: link_manual_rede_to_os)
             ▼
[PostgreSQL: link_manual_rede_to_os] ── Transação Atômica (FOR UPDATE em POS e OS)
             ├─ 1. Aplica baixa em patio_os:
             │     paid_value = LEAST(total_value, paid_value + gross_amount)
             │     status = CASE WHEN paid_value >= (total_value - 0.05) THEN 'finalizada' ELSE 'pago_parcial' END
             │     last_payment_date = target_date
             │     match_status = 'MATCHED'
             ├─ 2. Marca pos_transactions.matched_os_number = '1120'
             ├─ 3. Registra em conciliation_matches
             ├─ 4. Executa recompute_patio_for_date_and_store(v_target_date, v_store_id):
             │     a) Calcula soma de saldos abertos da filial na data:
             │        SUM(GREATEST(0, total_value - paid_value)) WHERE status aberta/parcial
             │     b) Atualiza reconciliations.na_loja_os para a filial/data
             │     c) Calcula somatório de todas as filiais
             │     d) Se existir daily_snapshots para a data:
             │        Atualiza total_patio e metadata.stores
             │        Registra trilha em metadata.audit_log se dia fechado
             └─ 5. Retorna JSONB discriminado com antes/depois
             ▼
[Frontend: Invalidação de Queries TanStack]
             ├─ Invalida: ['daily-reconciliation-summary'], ['daily_snapshots']
             ├─ Invalida: ['reconciliations'], ['store-ordens-servico', storeId, date]
             ├─ Invalida: ['patio-os-detail-modal', date], ['backend-dashboard']
             └─ Exibe Toast com impacto real no pátio
```

---

## 2. Contratos e Interfaces TypeScript Reais

### Interface do Retorno da RPC no Frontend:
```typescript
export interface ManualLinkRedeResult {
  success: boolean;
  message: string;
  pos_id: string;
  os_id: string;
  os_number: string;
  store_id: string;
  paid_before: number;
  paid_after: number;
  os_balance_before: number;
  os_balance_after: number;
  store_patio_before: number;
  store_patio_after: number;
  global_patio_before: number;
  global_patio_after: number;
  accounting_effect: 'baixa_aplicada' | 'vinculo_informativo_sem_baixa' | 'ja_pago';
}
```

### Assinatura SQL da Função de Recálculo Canônico:
```sql
CREATE OR REPLACE FUNCTION public.recompute_patio_for_date_and_store(
    p_date DATE,
    p_store_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;
```

---

## 3. Cenários Obrigatórios

### Happy Path (Cenário Nominal da OS #1120):
1. **Estado Inicial:**
   - OS #1120 na filial `st-03`: total R$ 6.583,80, pago R$ 0,00, saldo R$ 6.583,80.
   - Pátio da filial `st-03`: R$ 6.953,70.
   - Total Pátio da holding: R$ 73.338,54.
2. **Ação:**
   - Vínculo manual da transação Rede Visa de R$ 3.794,28 de 25/09.
3. **Resultado:**
   - OS #1120: `paid_value = 3.794,28`, `saldo = 2.789,52`, `status = 'pago_parcial'`.
   - `reconciliations.na_loja_os` para `st-03` em 28/09 atualiza para **R$ 3.159,42** (`6.953,70 − 3.794,28`).
   - `daily_snapshots.total_patio` em 28/09 atualiza para **R$ 69.544,26** (`73.338,54 − 3.794,28`).
   - `get_daily_reconciliation_summary` reflete os valores consolidados exatos.

### Edge Case 1: Dia Fechado (`is_closed = true`):
- Se a data do vínculo já possuir um snapshot fechado, a RPC atualiza `total_patio` e o array `metadata.stores`, inserindo um log de auditoria no metadata com timestamp, usuário e justificativa contábil ("Vínculo manual POS Rede x OS #1120"). O `saldo_bancario` e os registros OFX não são alterados.

### Edge Case 2: Pátio Zerado (`saldo = 0`):
- Se a baixa quitar integralmente a última OS aberta da filial, `na_loja_os` deve assumir estritamente `0.00`.
- O frontend e a RPC não devem tratar `0` como ausência (eliminar fallback tipo `livePatio > 0 ? livePatio : snapPatio`). Zero é um número fiduciário válido.

### Edge Case 3: Vínculo Puramente Informativo (OS Já Paga ou Finalizada):
- Se a OS já se encontrava finalizada ou com `paid_value >= total_value`, a RPC vincula a POS para fins de conciliação de fita, mas **não altera `paid_value`** e retorna `accounting_effect = 'vinculo_informativo_sem_baixa'`. O pátio permanece inalterado.

### Edge Case 4: Desvinculação (`unlink_manual_os_match`):
- Ao desvincular a POS da OS, a RPC subtrai de `paid_value` o valor bruto da transação vinculada (sem deixar negativo), restaura o status (`pago_parcial` ou `em_aberto`), e reexecuta `recompute_patio_for_date_and_store` para recompor os R$ 3.794,28 no pátio da filial e da holding.

---

## 4. Critérios de Aceitação Verificáveis

1. **Equação Matemática Exata da OS #1120:**
   - Consulta SQL confirma: `total_value (6.583,80) - paid_value (3.794,28) = saldo (2.789,52)`.
2. **Sincronismo de Pátio da Loja `st-03`:**
   - `reconciliations.na_loja_os` para `st-03` em 28/09 é exatamente **R$ 3.159,42**.
3. **Sincronismo de Pátio Global:**
   - `daily_snapshots.total_patio` em 28/09 é exatamente **R$ 69.544,26**.
4. **Idempotência e Segurança:**
   - Chamar o vínculo duas vezes com o mesmo `pos_id` e `os_number` não duplica o pagamento nem reduz o pátio duas vezes.
5. **Zero Quebra no OFX:**
   - A compensação bancária (`settlement_status = 'a_compensar'`) permanece intacta.
6. **Build de Produção:**
   - `npm run build` passa com código 0 e zero erros de tipagem.

---

## 5. Verificação Dirigida (SCAN → INFER → VERIFY → FIX)

### Teste 1: Auditoria Pré-Fix e Validação dos Deltas
- **SCAN:** Consultar `patio_os`, `reconciliations` e `daily_snapshots` para `st-03` e 2026-09-28.
- **INFER:** O pátio do snapshot (73.338,54) menos o live atual (69.544,26) é exatamente 3.794,28.
- **VERIFY:** Executar a rotina `recompute_patio_for_date_and_store` e confirmar que o novo snapshot passa a ser 69.544,26 e `na_loja_os` passa a ser 3.159,42.
- **FIX:** Aplicar a migração e sincronizar.

### Teste 2: Ciclo de Desvinculação e Revinculação
- **SCAN:** Desvincular a POS `e85b4bac-db66-407c-a840-08c7718fdebf` da OS #1120 via `unlink_manual_os_match`.
- **VERIFY:** Confirmar que `paid_value` volta a 0.00, `na_loja_os` volta a 6.953,70 e `total_patio` volta a 73.338,54.
- **RE-VERIFY:** Revincular e verificar se retorna exatamente a 2.789,52 de saldo e 69.544,26 de pátio global.

---

## 6. Blast Radius e Dependências

- `src/components/conciliacao/StoreCartaoMaquininhaView.tsx`
- `src/components/conciliacao/ManualMatchOsModal.tsx`
- `src/hooks/useManualMatch.ts`
- `src/components/conciliacao/StoreOrdensServicoView.tsx`
- `src/components/conciliacao/PatioOsDetailModal.tsx`
- `src/components/conciliacao/ResumoDiaPanel.tsx`
- `supabase/migrations/20260831000007_create_link_manual_pix_and_rede_rpcs.sql` (substituída por migration nova posterior)
- `supabase/migrations/20260922000004_equalize_summary_rpc_centralized_saidas.sql`
