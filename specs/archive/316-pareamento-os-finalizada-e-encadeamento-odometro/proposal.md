# Proposal: Pareamento de Quitações em OSs Finalizadas e Encadeamento Canônico de Odômetro (316)

## 1. Problema

### A. Transações OFX Pendentes de OSs já Finalizadas
- **Sintoma:** Transações de entrada bancária legítimas (PIX/Transferências de clientes) ficam órfãs em "Pendentes para Vincular" porque a Ordem de Serviço foi baixada no ERP como "finalizada" ou quitada antes da conciliação bancária.
- **Causa Raiz:**
  1. A RPC PostgreSQL `auto_match_transactions` filtrava estritamente `status IN ('em_aberto', 'pago_parcial')`. Lançamentos que quitavam OSs finalizadas no dia eram sumariamente ignorados.
  2. A RPC não realizava parsing textual no extrato (ex.: `counterpart_name`, `fitid` ou `memo` contendo `"OS 18456"` ou `"OS#2401"`).
  3. No modal de vínculo manual (`Step1UnregisteredPayments.tsx`), a query bloqueava a busca de OSs finalizadas (`.neq('status', 'finalizada')`), impedindo o operador de associar o PIX à respectiva OS.

### B. Encadeamento do Faturamento Anterior (Odômetro OI)
- **Sintoma:** Ao importar o dia 31/08/2026, o sistema não recuperava o Odômetro Anterior de 28/08/2026 (**R$ 920.496,64**) corretamente, gerando deltas distorcidos.
- **Causa Raiz:**
  1. No Ramal 2 da RPC `get_daily_reconciliation_summary` (dia dinâmico/aberto), a chave `'faturamento_anterior'` não era devolvida no objeto JSONB.
  2. A consulta lia `daily_snapshots.faturamento` que continha o faturamento total com aportes (R$ 346.270,12) em vez do odômetro acumulado contínuo (`metadata.odometro_hoje = 920496.64`).

---

## 2. Solução Proposta

### 1. Motor Aprimorado de Auto-Matching no PostgreSQL (`auto_match_transactions`) [MODIFY]
- **Passo 1 (Match Textual por Número de OS):** Varre `counterpart_name`, `fitid` e `bank_name` procurando por números de OS cadastrados em `patio_os`.
- **Passo 2 (Match por Saldo em Aberto):** Casa entradas com o saldo devedor de OSs em aberto da mesma loja.
- **Passo 3 (Match de Quitação em OSs Finalizadas):** Casa entradas bancárias com OSs finalizadas na data ou nos últimos 7 dias que tenham valor compatível (`pix_transfer_value` ou `total_value`), marcando `matched_os_number` no OFX sem alterar o saldo do pátio `na_loja_os`.

### 2. Vínculo Flexível no Modal de Pendências (`Step1UnregisteredPayments.tsx`) [MODIFY]
- Permitir ao operador buscar e vincular qualquer OS da loja (aberta ou finalizada).
- Ordenar no topo e destacar com badge `Sugestão (Valor Compatível)` as OSs cujo valor coincida com o PIX.
- Ao vincular em 1 clique: atualizar `ofx_transactions.matched_os_number`, `transactions.os_number` e registrar em `conciliation_matches`.

### 3. Encadeamento Canônico de Odômetro (28/08 -> 31/08) [MODIFY]
- **No Banco (`get_daily_reconciliation_summary`):** Priorizar `COALESCE((metadata->>'odometro_hoje')::numeric, faturamento)` para `v_faturamento_anterior` e retornar explicitamente `'faturamento_anterior'` no JSONB do Ramal 2.
- **No Wizard (`CentralImportWizard.tsx` e `Step4FinalAuditAndClose.tsx`):**
  - No Step 3 (Valores Manuais): Pré-exibir o Odômetro Anterior (**R$ 920.496,64**) e calcular em tempo real o Delta de Faturamento do dia:
    $$\Delta \text{ Faturamento} = \text{Odômetro Hoje} - 920.496,64$$

---

## 3. Contratos de Dados & Migrations
- Migration: `supabase/migrations/20260831000002_fix_automatch_and_odometro_encadeamento.sql`
  - `CREATE OR REPLACE FUNCTION public.auto_match_transactions(p_date date)`
  - `CREATE OR REPLACE FUNCTION public.get_daily_reconciliation_summary(p_date text, p_force_dynamic boolean)`
  - `CREATE OR REPLACE FUNCTION public.calculate_daily_conciliation(p_date date)`

---

## 4. Risco Principal e Mitigação
- **Risco:** Vincular uma OS finalizada reinserir saldo devedor no Pátio OS.
- **Mitigação:** A RPC de auto-match e o modal de vínculo só alteram `paid_value` e `status` se a OS estiver com saldo em aberto (`open_balance > 0`). Se a OS já estiver finalizada, apenas vincula os ponteiros (`matched_ofx_id` e `matched_os_number`), garantindo que o saldo `na_loja_os` permaneça 100% inalterado.
