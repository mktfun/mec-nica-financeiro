# Spec 439 — Blindagem do RPC auto_match_daily_transactions, Saneamento e Reconciliação Completa

## Problema

Ao planejar o reprocessamento da conciliação para o dia 24/09 (e dias subsequentes), uma auditoria forense no PostgreSQL revelou que a RPC `auto_match_daily_transactions` contém cláusulas permissivas legadas que corrompem a conciliação no banco de dados:

1. **Fase 2B e 2C da RPC no banco:** Realiza casamento automático entre depósitos OFX e OSs avaliando **única e exclusivamente o valor** (`ABS(COALESCE(pix_transfer_value, 0) - v_ofx_record.amount) <= 0.05` ou por `total_value` / `total_value - paid_value`), **sem checar nome do cliente, CPF ou CNPJ**.
2. **Transferências entre Lojas (Intercompany) sequestradas por OSs:** A Fase 0C não filtra todas as empresas do grupo (`MP AUTO MECANICA`, `MP JABAQUARA`, etc.). Com isso, em 24/09:
   - `RECEBIMENTOS MP AUTO MECANICA POPULAR LTDA.` (R$ 1.510,00) foi indevidamente atrelada à **OS #619** (cliente: `ADEILTON NIVALDO SILVA DOS SANTOS`, que tinha `total_value = 1510.00` e `pix_transfer_value = 0`).
   - `RECEBIMENTOS MP JABAQUARA SERVICOS AUTOMOTIVOS LTDA` (R$ 1.000,00) foi indevidamente atrelada à **OS #1894** (cliente: `MECANICA POPULAR JABAQUARA`).
3. Se a conciliação for reexecutada hoje sem a correção da RPC no PostgreSQL, o banco executará novamente esses matches cegos e re-vinculará transferências intercompany e de terceiros a OSs aleatórias.

---

## Solução Proposta

### 1. [BANCO/RPC] Blindar `auto_match_daily_transactions` e `auto_match_receivables` no PostgreSQL
- **`auto_match_daily_transactions`:**
  - **Eliminar casamentos cegos por valor (Fases 2B e 2C):** Remover as buscas que casavam OSs sem validar a identidade do cliente.
  - **Fase 2 (PIX x OS Estrito):**
    - Exigência 1: `COALESCE(pix_transfer_value, 0) > 0` e `ABS(pix_transfer_value - amount) <= 0.05`.
    - Exigência 2 (Filtro Negativo): Desconsiderar adquirentes (`REDE`, `CIELO`, `STONE`, `PAGSEGURO`, etc.) e entidades intercompany (`MP AUTO MECANICA`, `MP JABAQUARA`, `EMPORIO`, `HOLDING`, etc.).
    - Exigência 3 (Identidade): Casar apenas se houver número de OS no descritivo bancário OU correspondência de documento/tokens fortes entre `counterpart_name` e `client_name`.
  - **Fase 0C (Intercompany):** Adicionar todas as razões sociais do grupo (`%MP AUTO MECANICA%`, `%MP JABAQUARA%`, `%MECANICA POPULAR%`) com `matched_os_number = null`.
- **`auto_match_receivables`:**
  - Bloquear adquirentes e transferências intercompany de casarem com boletos/recebíveis.
  - Para títulos do tipo `Boleto`, exigir indício bancário de cobrança/boleto ou número de OS explícito, impedindo que PIX avulsos ou transferências entre lojas dêem baixa em carteira de recebíveis.

### 2. [BANCO/DATA] Saneamento Forense de Vínculos Inválidos de 24/09
- Executar script SQL de saneamento no banco:
  - Resetar `matched_os_number = null` nas transações de R$ 1.510 (Mecânica Popular) e R$ 1.000 (Jabaquara) em `ofx_transactions`.
  - Proteger a entrada de R$ 5.000 da HD Centro Automotivo (`matched_os_number = null`).
  - Remover os registros correspondentes incorretos em `conciliation_matches`.
  - Restaurar o status das OSs #619 e #1894 em `patio_os`.

### 3. [BACKEND/PIPELINE] Execução Controlada da Conciliação Completa
- Executar em sequência atômica para `2026-09-24`:
  1. `auto_match_daily_transactions('2026-09-24')` blindado.
  2. `auto_match_receivables('2026-09-24')` para boletos/recebíveis.
  3. `auto_match_saidas('2026-09-24')` para contas a pagar x saídas bancárias.
  4. Auditoria dos resultados apurados por loja.

---

## Skills Especializadas Aplicadas

- `database` — DDL migration de RPC PostgreSQL, idempotência, segurança fiduciária.
- `backend-patterns` — Pipeline determinístico de conciliação diária.

---

## Contratos de Dados

- **RPC modificada:** `public.auto_match_daily_transactions(p_date text)`
- **Tabelas atualizadas:**
  - `ofx_transactions`: limpeza de `matched_os_number` indevidos.
  - `conciliation_matches`: remoção de pares inválidos.
  - `patio_os`: restauração de `match_status` das OSs liberadas.

---

## Arquivos Afetados

### Arquivos Modificados / Criados
| Arquivo | Ação |
|---|---|
| `supabase/migrations/20260924160000_strict_auto_match_daily_transactions.sql` | Novo (Migration da RPC blindada) |
| Script temporário de saneamento via SQL MCP | Execução única no Supabase |

---

## Plano de Rollback

Se a nova versão da RPC apresentar comportamento anômalo:
1. Reaplicar a migration anterior `20260901000015_auto_match_finalized_os_and_corporate_routing.sql`.
2. Como os dados em `ofx_transactions` originais não são destruídos (apenas os ponteiros `matched_os_number` são corrigidos), não há risco de perda de transações bancárias.

---

## Risco Principal

**Risco:** A RPC mais rígida deixar de casar automaticamente algum PIX legítimo cujo nome de cliente esteja ligeiramente abreviado no extrato.
**Mitigação:** Isso é o comportamento contábil correto e desejado: PIX com dúvida de identidade deve cair como **Pendente** para validação manual do operador em 1 clique, e **NUNCA** casar com a OS errada ou com transferências intercompany.
