# Proposal: Correção da Diferença no Fechamento por Loja e Pendências OFX (332)

## Problema
No fechamento da conciliação por loja (`/conciliacao/st-01?date=2026-09-01`), o card da filial Dom Pedro (`st-01`) exibia:
- **Saldo Total:** R$ 29.372,27
- **Maquininha:** R$ 4.710,20
- **PIX:** R$ 3.000,00
- **Na Loja OS:** R$ 13.373,80
- **Previsto:** R$ 7.710,20
- **Diferença:** `-R$ 9.484,70` (marcado incorretamente como `DIVERGÊNCIA`)

### Causa Raiz Identificada:
1. **Fórmula Invertida na RPC Backend (`get_daily_reconciliation_summary`)**: A migration `20260901000008` calculava a diferença por loja como `rede_liquido - ofx_maquininhas`.
2. **Contaminação Temporal de Lote no OFX**: O extrato bancário importado continha o lote de cartão de 31/08 (R$ 9.484,70) e o lote de 01/09 (R$ 4.710,20). A soma no extrato (`ofx_maquininhas = R$ 14.194,90`) superou as vendas do dia (`rede_liquido = R$ 4.710,20`), gerando uma falsa divergência de `-R$ 9.484,70`.
3. **Desalinhamento Conceitual**: A "Diferença da Filial" não é a variação de liquidação de cartão (que é tratada no Ativo `A Compensar`), mas sim a soma de **pendências não conciliadas no extrato OFX da filial** (créditos órfãos sem OS e débitos sem conta a pagar associada). Quando todos os lançamentos estão identificados (100% conciliado), a diferença deve ser **R$ 0,00 (Conciliado / Verde)**.

---

## Solução Proposta (Foco em Reuso e Correção)
1. **Reutilizar e Atualizar a RPC `get_daily_reconciliation_summary` (`[MODIFY]` via migration SQL)**:
   - Calcular a Diferença Canônica da Filial baseada na CTE de pendências reais do extrato OFX:
     $$\text{Diferença por Loja} = \sum (\text{Entradas OFX Órfãs}) - \sum (\text{Saídas OFX Sem Justificativa/Conta})$$
   - Se todas as transações da filial estiverem identificadas ou categorizadas, a diferença é `0.00` e o status é `'approved'`.
   - Isolar `nao_entrou_valor` como Ativo a Compensar: `GREATEST(0, rede_liquido - ofx_maquininhas)`.
2. **Ajustar Frontend (`StoreCardModulo1.tsx` e `conciliacao.$lojaId.tsx`) (`[MODIFY]`)**:
   - Corrigir o erro tipográfico `"Diferena"` para `"Diferença"`.
   - Exibir `DIVERGÊNCIA` somente se `Math.abs(diferenca) > 0.05` ou houver pendências não resolvidas no extrato.
   - Manter Dark UI (Zinc-950), numerais tabulares e badges semânticos.

---

## Investigação e Análise de Reuso (Relatório dos Subagentes)
- **Tabelas / RPCs Existentes Encontradas:**
  - Identificada a RPC `get_daily_reconciliation_summary` em `supabase/migrations/` e tabelas `ofx_transactions`, `pos_transactions`, `patio_os`, `store_cash_vault`. Será reutilizada e atualizada via `CREATE OR REPLACE FUNCTION`.
  - Nenhuma nova tabela será criada.
- **Componentes / Hooks Existentes Encontrados:**
  - `StoreCardModulo1.tsx`, `ConciliacaoLojasView.tsx`, `ResumoDiaPanel.tsx` e `useDailyReconciliationSummary` já atendem a estrutura visual e serão apenas ajustados (`[MODIFY]`).

---

## Contratos de Dados & SQL (Supabase)

### Migration: `supabase/migrations/20260901000009_fix_store_difference_and_ofx_pendencias.sql`
- `CREATE OR REPLACE FUNCTION public.get_daily_reconciliation_summary(p_date text, p_force_dynamic boolean DEFAULT false)`
  - CTE `ofx_unreconciled_agg`: Agrupa entradas/saídas por `store_id` que não possuem vínculo com OS, contas a pagar ou lotes de adquirentes.
  - CTE `store_calc`:
    ```sql
    'diferenca', COALESCE(unrec.total_pendencias, 0),
    'status', CASE WHEN ABS(COALESCE(unrec.total_pendencias, 0)) <= 0.05 THEN 'approved' ELSE 'divergent' END,
    'status_compensacao', CASE 
      WHEN rd.rede_liquido > 0 AND COALESCE(o.ofx_maquininhas, 0) >= rd.rede_liquido THEN 'entrou'
      WHEN rd.rede_liquido > 0 AND COALESCE(o.ofx_maquininhas, 0) > 0 THEN 'parcial'
      WHEN rd.rede_liquido > 0 THEN 'a_compensar'
      ELSE 'sem_movimento'
    END
    ```

---

## API & Componentes (Frontend)
- `src/components/conciliacao/StoreCardModulo1.tsx`:
  - `[MODIFY]` Corrigir typo de texto `"Diferena"` -> `"Diferença"`.
  - `[MODIFY]` Garantir que a diferença zero renderize em verde esmeralda com badge `ENTROU` / `CONCILIADO`.
- `src/routes/conciliacao.$lojaId.tsx`:
  - `[MODIFY]` Equalizar o cabeçalho de 6 métricas para exibir os mesmos valores e formatação do card da loja.
- `src/hooks/useBackendConciliacao.ts`:
  - `[EXTEND]` Enriquecer a interface `StoreReconciliationSummary` e `StoreCardData` com `saldo_banco_ofx`, `dinheiro_loja` e `cartoes_a_compensar`.

---

## Risco Principal e Mitigação
- **Risco Principal:** Alterar a apuração da diferença da filial e impactar acidentalmente a `diferenca_final` do consolidado da holding ou snapshots históricos já homologados.
- **Mitigação:** 
  1. Preservar estritamente o Ramal 1 de leitura direta de `daily_snapshots` quando `is_closed = true`.
  2. O cálculo da holding continua sendo a soma contábil estrita dos 5 Pilares menos Subtotal de Contas, sem acoplamento indevido com a conferência interna de maquininhas.
