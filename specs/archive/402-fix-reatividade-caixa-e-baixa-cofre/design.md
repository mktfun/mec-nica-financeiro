# Spec 402 — Design: Arquitetura Reativa Unificada e Sincronização do Cofre

## 1. Arquitetura e Fluxo de Dados

```
[store_cash_vault]  [patio_os]  [reconciliations]  [pos_transactions]  [ofx_transactions]
        │                │              │                  │                   │
        └────────────────┴──────────────┼──────────────────┴───────────────────┘
                                        ▼
                     useBackendConciliacao() Hook (Enriquecimento)
                                        │
                      Soma dos 5 Pilares Canônicos Reativos:
                      1. total_saldo_banco_positivo (Bancos + Cofre Real + A Compensar Real)
                      2. dinheiro_mp
                      3. a_receber
                      4. na_loja_os (Pátio Real Atual)
                      (-) saldo_negativo_itau (Cheque Especial Real)
                                        │
                                        ▼
                      Cálculo Dinâmico Unificado (Sem Bifurcação isEditing):
                      caixaAtual = Ativos - Cheque Especial
                      fluxoCaixa = caixaAtual - caixaAnterior
                      valorDispContas = faturamentoTotal - fluxoCaixa
                      diferencaFinal = valorDispContas - subtotalContas
                                        │
                                        ▼
                              [ResumoDiaPanel.tsx]
                      Cards do Topo & Esteira Contábil 100% Sincronizados
```

---

## 2. Mutações Detalhadas em Arquivos Existentes [MODIFY]

### 1. `src/hooks/useBackendConciliacao.ts`
- **Problema atual:** Linhas 347-370 computam `finalValorDisp` e `finalDiferenca`, mas utilizam `rawSummary.fluxo_caixa` (congelado) em vez de derivar `caixa_atual` e `fluxo_caixa` dos 5 pilares enriquecidos.
- **Mudança:**
  ```typescript
  // 1. Caixa Atual e Fluxo de Caixa Reativos
  const finalNaLojaOs = Number(totalVaultStores > 0 ? (rawSummary.na_loja_os ?? 0) : (rawSummary.na_loja_os ?? 0));
  const finalCaixaAtual = Number((finalTotalSaldoBancoPositivo + Number(rawSummary.dinheiro_mp || 0) + Number(rawSummary.a_receber || 0) + Number(rawSummary.na_loja_os || 0) - baseBancoNegativo).toFixed(2));
  const finalCaixaAnterior = Number(rawSummary.caixa_anterior || 0);
  const finalFluxoCaixa = Number((finalCaixaAtual - finalCaixaAnterior).toFixed(2));
  
  // 2. Faturamento e Diferença Reativos
  const finalValorDisp = Number((finalFatPeriodo - finalFluxoCaixa).toFixed(2));
  const finalDiferenca = Number((finalValorDisp - finalSubtotalContas).toFixed(2));
  ```
  Isso garante que qualquer mudança no pátio de OS ou no saldo bancário recalcula instantaneamente o Caixa Atual, o Fluxo e a Diferença.

### 2. `src/components/conciliacao/ResumoDiaPanel.tsx`
- **Problema atual:** Linhas 267–275 bifurcam entre `isEditing ? dinamico : summary?.caixa_atual`.
- **Mudança:**
  ```typescript
  // Matemática Consolidada — CANÔNICA E 100% REATIVA:
  // Caixa Atual SEMPRE calculado pelos pilares:
  const caixaAtualCalculado = Math.round(((saldoBancosValor + dinheiroMpValor + aReceberValor + naLojaValor - saldoNegativoItau) + Number.EPSILON) * 100) / 100;
  
  // Fluxo de Caixa SEMPRE derivado:
  const fluxoCaixaCalculado = Math.round(((caixaAtualCalculado - caixaAnteriorGlobal) + Number.EPSILON) * 100) / 100;
  
  // Valor Disponível e Diferença Final SEMPRE reativos:
  const valorDispContasCalculado = Math.round(((faturamentoTotalComAjustes - fluxoCaixaCalculado) + Number.EPSILON) * 100) / 100;
  const diferencaFinalCalculada = Math.round(((valorDispContasCalculado - subtotalContasCalculado) + Number.EPSILON) * 100) / 100;
  ```
  Elimina a disparidade entre o modo normal e o modo de edição.

### 3. `src/components/conciliacao/BaixaDinheiroModal.tsx`
- **Problema atual:** Linhas 147-152 não verificam o retorno da RPC (`data.success`), e linhas 164-211 executam um update manual duplicado no banco e snapshot que concorre com a RPC.
- **Mudança:**
  - Validar `rpcData?.success` e abortar com erro se falhar.
  - Remover updates manuais redundantes de `reconciliations.bank_total` (a RPC já executa).
  - Atualizar `daily_snapshots.metadata.dinheiro_lojas` para refletir o saldo restante pós-baixa (R$ 3.380,00).

---

## 3. Cenários de Verificação (SCAN → INFER → VERIFY → FIX)

### Cenário 1: Reatividade Imediata de Carros em Pátio
- **Estado Inicial:** Pátio em R$ 75.385,62.
- **Ação:** Usuário altera ou remove uma OS do pátio diminuindo R$ 1.000,00 (pátio vai para R$ 74.385,62).
- **Comportamento Esperado:**
  1. Card "NA LOJA OS" atualiza para R$ 74.385,62.
  2. "CAIXA ATUAL" decrementa instantaneamente em R$ 1.000,00.
  3. "FLUXO DE CAIXA" decrementa em R$ 1.000,00.
  4. "VALOR DISP. CONTAS" aumenta em R$ 1.000,00.
  5. "DIFERENÇA FINAL" ajusta em R$ 1.000,00.
  - **Zero congelamento de tela.**

### Cenário 2: Reatividade e Sincronização do Dinheiro no Cofre
- **Estado Inicial:** Registros no cofre em trânsito somam R$ 3.380,00.
- **Ação:** O chip "DINHEIRO NO COFRE" no card de Saldo Bancos exibe R$ 3.380,00.
- **Ação 2:** Ao dar baixa de R$ 2.500,00 de Piraporinha, o status vai para `depositado`, o chip atualiza instantaneamente para R$ 880,00 (R$ 380 Mauá + R$ 500 Jabaquara) e o saldo bancário da filial correspondente é incrementado.

---

## 4. Critérios de Aceitação Verificáveis
1. O Caixa Atual exibido na tela é matematicamente igual a:
   $$\text{Saldo Bancos Positivo} + \text{Dinheiro MP} + \text{A Receber} + \text{Pátio OS} - \text{Cheque Especial}$$
2. A Diferença Final é matematicamente igual a:
   $$\text{Valor Disponível} - \text{Total de Contas a Cobrir}$$
3. Entrar e sair do modo "Editar Fechamento" não causa nenhum salto nos valores se nenhum input for alterado.
4. O valor exibido no chip "Dinheiro no Cofre" corresponde à soma real dos registros pendentes na tabela `store_cash_vault`.
