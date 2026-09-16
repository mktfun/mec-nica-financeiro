# Design: Correção da Incongruência no Modo Edição do Fechamento e Salto Indevido do Caixa (404)

## Arquitetura e Fluxo de Dados

```
Banco (Supabase)
  pos_transactions (apenas settlement_status IN ('nao_entrou', 'a_compensar') -> R$ 4.028,34)
  store_cash_vault (apenas status IN ('em_transito', 'pending') -> R$ 3.380,00)
  reconciliations (OFX Positivo: R$ 161.348,56, Cheque Esp: -R$ 32.957,73)
       │
       ▼
RPC get_daily_reconciliation_summary
       │
       ▼
useBackendConciliacao.ts (useDailyReconciliationSummary)
       │
       ▼
ResumoDiaPanel.tsx
  ├─ derivedBankTotals (Total Positivo = 161.348,56 + 3.380,00 + 4.028,34 = 168.756,90)
  ├─ faturamentoTotalComAjustes = 82.523,16 + 1.000,00 = 83.523,16 (IDENTICAL in Edit & Normal)
  ├─ caixaAtualCalculado = 168.756,90 - 32.957,73 + 42.460,00 + 6.929,67 + 75.385,62 = 260.574,46 (IDENTICAL in Edit & Normal)
  ├─ fluxoCaixaCalculado = 260.574,46 - 203.240,02 = +57.334,44 (IDENTICAL in Edit & Normal)
  ├─ valorDispContasCalculado = 83.523,16 - 57.334,44 = 26.188,72 (IDENTICAL in Edit & Normal)
  ├─ subtotalContasCalculado = 28.141,54 + 4.067,70 = 32.209,24 (IDENTICAL in Edit & Normal)
  └─ diferencaFinalCalculada = 26.188,72 - 32.209,24 = -6.020,52 (IDENTICAL in Edit & Normal)
```

---

## Mutações em Arquivos Existentes [MODIFY]

### 1. `src/components/conciliacao/ResumoDiaPanel.tsx`
- **Ajustar `derivedBankTotals`:**
  - Extrair `maquininhas` por filial somando apenas `nao_entrou_valor` (quando positivo) ou recorrendo a `summary?.cartoes_a_compensar` saneado.
  - Extrair `dinheiro` por filial somando apenas entradas de cofre não depositadas.
  - Eliminar fallbacks que puxavam o faturamento bruto total de cartões da adquirente.
- **Unificar `faturamentoLiquidoDia` e `faturamentoTotalComAjustes`:**
  - Priorizar `metadata.faturamento_oi_base` e a diferença do odômetro (`odometro_hoje - odometro_anterior`) tanto em `isEditing` quanto em `!isEditing`.
  - NUNCA usar `summary?.faturamento_periodo` corrompido pela subtração indevida da RPC.
- **Unificar `caixaAtualCalculado`:**
  - Remover a bifurcação `isEditing ? <calc> : summary?.caixa_atual`.
  - Aplicar a fórmula fiduciária canônica universalmente. Como a fórmula agora é limpa e não duplica cartão nem dinheiro depositado, ela produz exatamente **R$ 260.574,46** em ambos os modos.
- **Garantir Delta Zero ao Entrar/Sair do Modo Edição:**
  - `isEditing = true` apenas habilita os inputs para o usuário digitar. Se nenhum valor for alterado, todos os resultados de Caixa Atual, Faturamento, Fluxo de Caixa e Diferença permanecem milimetricamente idênticos.

### 2. `src/hooks/useBackendConciliacao.ts`
- Validar mapeamento de `nao_entrou_valor` para garantir que `s.nao_entrou_valor` não venha como `undefined` no array de filiais.

### 3. `supabase/migrations/20260915000050_fix_rpc_summary_card_settlement_and_vault_status.sql` [NEW]
- Atualização cirúrgica na RPC `get_daily_reconciliation_summary` para:
  1. Filtrar `settlement_status IN ('nao_entrou', 'a_compensar')` em `v_cartoes_a_compensar`.
  2. Filtrar `status IN ('em_transito', 'pending')` em `v_dinheiro_lojas`.
  3. Preencher `nao_entrou_valor` no array `stores` para cada filial.
  4. Eliminar a subtração indevida de faturamento anterior quando o snapshot já contém o faturamento diário consolidado.

---

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)

### Cenário 1: Transição de Modo de Edição em 14/09/2026
- **Estado Inicial:** Modo Normal (`!isEditing`) aberto na data `14/09/2026`.
- **Ação:** Usuário clica no botão `Editar Fechamento`.
- **Resultado Esperado:**
  - Caixa Atual permanece em **R$ 260.574,46**.
  - Faturamento do Dia permanece em **R$ 82.523,16** (+ Ajustes R$ 1.000,00).
  - Fluxo de Caixa permanece em **+R$ 57.334,44**.
  - Diferença Final permanece idêntica à do modo normal (zero salto).

### Cenário 2: Alteração Reativa de Inputs no Modo Edição
- **Estado Inicial:** Modo Edição ativo com Dinheiro MP = 42.460,00.
- **Ação:** Usuário altera Dinheiro MP para 43.460,00 (+1.000,00).
- **Resultado Esperado:**
  - Caixa Atual reage imediatamente para R$ 261.574,46 (+1.000,00).
  - Fluxo de Caixa reage para +R$ 58.334,44 (+1.000,00).
  - Valor Disp. Contas e Diferença Final reagem proporcionalmente sem gerar distorções espúrias.
