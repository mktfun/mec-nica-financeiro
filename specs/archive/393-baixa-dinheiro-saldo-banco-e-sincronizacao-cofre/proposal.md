# Proposal: Spec 393 — Sincronização de Baixa de Dinheiro no Saldo Bancário e Correção Canônica do Dinheiro no Cofre

## 1. Problema

Ao realizar a baixa de dinheiros em trânsito/pendentes no cofre das filiais (ex: R$ 3.000,00 em Santo André e R$ 220,00 em Jorge Beretta), o sistema apresentou duas graves anomalias contábeis e de interface:

1. **Evaporação de Caixa ao Dar Baixa (Saldo Banco Não Atualiza):**
   - A RPC `dar_baixa_dinheiro` apenas marcava `status = 'depositado'` na tabela `store_cash_vault`.
   - O saldo bancário da filial em `reconciliations.bank_total` permaneceu inalterado (Santo André em R$ 3.324,97 em vez de R$ 6.324,97; Jorge Beretta em R$ 55.400,75 em vez de R$ 55.620,75).
   - O dinheiro sumiu do cofre e não entrou no banco, gerando uma redução artificial de R$ 3.220,00 no patrimônio da holding e aumentando a divergência contábil da conciliação.
2. **Dinheiro no Cofre Inconsistente e Errado:**
   - No card principal da conciliação (`SALDO BANCOS + DINHEIRO`), o sub-chip "Dinheiro no Cofre" exibia apenas `+ R$ 380,00` (somente Mauá).
   - Ao abrir o modal "Raio-X de Saldos Bancários & Dinheiro por Filial", a tabela exibia `R$ 880,00` (Mauá R$ 380,00 + Jabaquara R$ 500,00).
   - Causa raiz: A RPC `get_daily_reconciliation_summary` consultava `store_cash_vault` com filtro estrito `WHERE entry_date = v_target_date::date` e SEM filtrar status `em_transito`. Como a OS de Jabaquara entrou em 08/09 e permaneceu pendente em trânsito no dia 10/09, a RPC a ignorou no total do dia.
3. **Divergência entre o Valor do Hero Card e o Rodapé do Raio-X:**
   - O Hero Card exibia `R$ 188.903,12` (somando bancos positivos brutos sem abater o cheque especial e com o dinheiro do cofre desatualizado).
   - O rodapé do Raio-X exibia como Líquido Holding `R$ 178.949,44` (Bancos Líquidos R$ 135.706,55 + Dinheiro R$ 880,00 + Maquininhas R$ 42.362,89).

---

## 2. Solução Proposta (Foco em Reuso e Correção)

1. **Correção da RPC `dar_baixa_dinheiro` (Database):**
   - [MODIFY] Reutilizar a RPC `dar_baixa_dinheiro` em `supabase/migrations/`.
   - Ao confirmar o depósito (`status = 'depositado'`), atualizar atomicamente:
     a) `reconciliations.bank_total`: Somar o montante depositado na filial na data do depósito (`bank_total = bank_total + p_amount_to_deposit`).
     b) `daily_snapshots`: Recalcular e persistir `saldo_bancario`, `dinheiro_lojas`, `caixa_atual` e `diferenca_final`.
   - Executar backfill corretivo para as baixas já realizadas em 10/09 (Santo André +R$ 3.000,00 e Jorge Beretta +R$ 220,00).

2. **Correção da Consulta de Dinheiro no Cofre na RPC `get_daily_reconciliation_summary` (Database):**
   - [MODIFY] Alterar a CTE `vault_agg` e a seleção de `v_dinheiro_lojas` na RPC:
     - Considerar todas as entradas acumuladas até a data (`entry_date <= v_target_date::date`).
     - Filtrar estritamente por status ativo: `status IN ('em_transito', 'pending') OR (status = 'depositado' AND deposited_at::date > v_target_date::date)`.
     - Isso garante coerência temporal: dinheiro não baixado continua no cofre; dinheiro baixado antes ou na data passa a ser saldo bancário.

3. **Alinhamento do Hero Card com o Raio-X de Saldos (Frontend):**
   - [MODIFY] Em `ResumoDiaPanel.tsx`:
     - O valor de exibição principal do card `SALDO BANCOS + DINHEIRO` deve refletir o patrimônio líquido disponível exato:
       $$\text{Saldo Bancos Positivo} - \text{Cheque Especial} + \text{Dinheiro no Cofre} + \text{A Compensar}$$
       garantindo equivalência de 100% com o Líquido Consolidado do Raio-X (`totals.total`).
     - O chip "Dinheiro no Cofre" deve ler a soma unificada de `summary.dinheiro_lojas` ou a soma de `stores[].dinheiro_loja`.
   - [MODIFY] Em `BaixaDinheiroModal.tsx` e `SaldoBancosDetailModal.tsx`:
     - Disparar invalidações completas de query (`daily-reconciliation-summary`, `daily_reconciliation_summary`, `daily_snapshots`, `saldo-bancos-modal-summary`, `store-cash-vault-pending`).

---

## 3. Investigação e Análise de Reuso (Relatório de Engenharia)

- **Tabelas / RPCs Existentes Encontradas:**
  - `public.store_cash_vault`: Tabela central de dinheiro no cofre, já possui colunas `status`, `deposited_at`, `deposited_by`, `matched_ofx_id`.
  - `public.dar_baixa_dinheiro`: RPC existente criada na migration `20260831000004`. Será atualizada via `CREATE OR REPLACE FUNCTION` para orquestrar a entrada em `reconciliations.bank_total` e `daily_snapshots`.
  - `public.get_daily_reconciliation_summary`: RPC existente. Ajustar o filtro de `vault_agg` para respeitar acumulação temporal (`<= target_date`) e status fiduciário.
  - `public.reconciliations`: Tabela que armazena `bank_total` por loja e data.
  - `public.daily_snapshots`: Tabela de fechamento patrimonial diário.
- **Componentes / Hooks Existentes Encontrados:**
  - `BaixaDinheiroModal.tsx`: Modal que executa a chamada a `dar_baixa_dinheiro`.
  - `SaldoBancosDetailModal.tsx`: Tabela de Raio-X que exibe o botão "Dar Baixa".
  - `ResumoDiaPanel.tsx`: Painel com o card "SALDO BANCOS + DINHEIRO".
  - `useBackendConciliacao.ts`: Hook que consome a RPC e aplica enriquecimento defensivo.
- **Estruturas Novas:** NENHUMA. Reuso estrito de 100% dos artefatos existentes.

---

## 4. Contratos de Dados & SQL (Supabase)

### Assinatura da RPC `dar_baixa_dinheiro`:
```sql
CREATE OR REPLACE FUNCTION public.dar_baixa_dinheiro(
    p_vault_id UUID DEFAULT NULL,
    p_os_number TEXT DEFAULT NULL,
    p_store_id TEXT DEFAULT NULL,
    p_amount_to_deposit NUMERIC DEFAULT NULL,
    p_deposit_date DATE DEFAULT CURRENT_DATE,
    p_ofx_id UUID DEFAULT NULL,
    p_user_email TEXT DEFAULT NULL
)
RETURNS jsonb
```

---

## 5. API & Componentes (Frontend)

- `src/components/conciliacao/ResumoDiaPanel.tsx`:
  - Card principal exibindo o patrimônio líquido disponível unificado com o Raio-X.
  - Sub-chip "Dinheiro no Cofre" lendo valor reativo real.
- `src/hooks/useBackendConciliacao.ts`:
  - Enriquecimento defensivo considerando dinheiro em trânsito acumulado.

---

## 6. Risco Principal e Mitigação

- **Risco:** Dupla contagem caso o extrato OFX importado já contivesse uma linha com esse depósito bancário.
- **Mitigação:** Ao dar baixa via modal, a filial confirma que o dinheiro em espécie foi levado ao banco. Se houver linha correspondente no extrato OFX, ela pode ser pareada via `matched_ofx_id` sem somar duplamente.
