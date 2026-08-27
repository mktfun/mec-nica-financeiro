# Proposal: Segregação do Saldo Negativo (Cheque Especial) e Dedução Explícita no Caixa Atual (301)

## Problema
Atualmente, no card principal de Saldo Bancos + Dinheiro, os saldos de contas bancárias com limite/cheque especial negativo (ex: Planalto -R$ 14.130,23 e Santo André -R$ 7.909,97) são somados algebricamente com as contas positivas. Isso reduz o total exibido de bancos para R$ 60.575,77 em vez de mostrar o saldo bruto real das contas ativas (R$ 82.615,97) e destacar separadamente a dívida/negativo de R$ 22.040,20.

O usuário determinou a regra canônica:
> "o nosso card de bancos deixa do jeito que ta so que o negativo vc nao subtrai blz? vc deixa ele assim so que nao aparece se tier negativo, so deixa um cardzinho no card de saldos pra se tiver saldo negativo, soma tudo no saldo ofx so que deiixa clcaro que so é negativo que ta somando ali so deixa somado ali e no final no caixa atual faz todos os saldos la - o negativo sacou?"

## Solução Proposta
1. **Segregação Contábil no Backend (RPC get_daily_reconciliation_summary):**
   - `saldo_bancos_positivo`: Soma estrita de todas as contas correntes com saldo >= 0 (ex: R$ 82.615,97).
   - `saldo_negativo_itau`: Soma do valor absoluto das contas devedoras/cheque especial (ex: R$ 22.040,20).
   - `caixa_atual`: (saldo_bancos_positivo + dinheiro_em_lojas + cartoes_a_compensar + dinheiro_mp + a_receber + na_loja_os) - saldo_negativo_itau.
2. **Card de Saldo Bancos + Dinheiro (ResumoDiaPanel.tsx):**
   - O valor de destaque exibe o Saldo Bruto de Bancos Positivos + Dinheiro em Lojas + Rede a Compensar.
   - Quando houver contas com saldo negativo (`saldo_negativo_itau > 0`), renderiza um sub-card / pill dedicado em vermelho:
     - **`(-) Saldo Negativo (Cheque Especial): R$ XX.XXX,XX`** com badge explicativo de que a dedução ocorrerá no Caixa Atual.
3. **Card do Caixa Atual (ResumoDiaPanel.tsx):**
   - Exibe o subtexto transparente demonstrando a fórmula:
     `Ativos (R$ ...) - Negativo (R$ 22.040,20) = Caixa Atual (R$ ...)`.
4. **Modal Raio-X de Saldos (SaldoBancosDetailModal.tsx):**
   - Header exibindo separadamente: **Saldos Positivos (8 contas)** e **Saldos Negativos (2 contas)**.

## Contratos de Dados
- RPC `get_daily_reconciliation_summary(p_date)` retorna:
  - `saldo_bancos_positivo: numeric`
  - `saldo_negativo_itau: numeric`
  - `total_saldo_banco_positivo: numeric`
  - `caixa_atual: numeric`

## Features Existentes Impactadas
- `src/components/conciliacao/ResumoDiaPanel.tsx`
- `src/components/conciliacao/SaldoBancosDetailModal.tsx`
- `supabase/migrations/20260827000001_bulletproof_snapshots_and_closing.sql`

## Risco Principal
- Garantir que a dedução do saldo negativo ocorra **exatamente uma vez** no Caixa Atual para não duplicar deduções nem superestimar o patrimônio.
