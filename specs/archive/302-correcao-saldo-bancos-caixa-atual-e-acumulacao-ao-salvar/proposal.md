# Proposal: Correcao do Saldo Bancos, Caixa Atual e Acumulacao ao Salvar (302)

## Problema

Foram identificados **2 bugs criticos e independentes** no painel de conciliacao do dia 27/08:

### Bug A - saldo_bancario no snapshot gravado com valor errado (inflado)

**Sintoma:** O Card "Saldo Bancos + Dinheiro" exibe R$ 153.700,60 em vez do correto R$ 91.617,38
(OFX positivo R$ 82.615,97 + Cofre R$ 1.770,00 + Rede R$ 7.231,41).

**Causa raiz:**
O handleSave grava `saldo_bancario: saldoBancosValor`. Quando o dia ja esta fechado (is_closed=true),
o `summary.total_saldo_banco_positivo` retornado pelo Ramal 1 da RPC nao recalcula positivos/negativos
dos OFXs - le do snapshot. O saldo gravado no snapshot foi inflado (R$ 122.658,99 vs correto R$ 91.617,38).
Cada clique em Salvar re-le o snapshot com valor inflado e grava de volta (loop de acumulacao).

**Evidencias:**
- OFX positivo (8 contas): R$ 82.615,97 ? fonte da verdade
- Snapshot saldo_bancario: R$ 122.658,99 ? errado, inflado +R$ 31.041,61
- UI mostra: R$ 153.700,60 ? inflado ainda mais (inclui dinheiro_mp provavelmente)

### Bug B - caixaAtualCalculado no frontend nao deduz o saldo negativo (cheque especial)

**Sintoma:** Caixa Atual salvo = R$ 216.837,37. Correto = R$ 163.755,56. Diferenca: +R$ 53.081,81.

**Causa raiz (linha 152-154 de ResumoDiaPanel.tsx):**
```
caixaAtualCalculado = saldoBancosValor + dinheiroMpValor + aReceberValor + naLojaValor
```
SEM deduzir `-saldoNegativoItau` (R$ 22.040,20). A formula correta foi implementada na RPC (Spec 301)
mas o frontend que e usado no handleSave ainda usa a formula antiga.

## Valores Corretos para 27/08 (auditados dos OFXs reais)

| Campo | ERRADO (atual) | CORRETO |
|---|---|---|
| OFX Positivo (8 contas) | n/a | R$ 82.615,97 |
| Cheque Especial (2 contas) | n/a | R$ 22.040,20 |
| Cofre | n/a | R$ 1.770,00 |
| A Compensar (Rede) | n/a | R$ 7.231,41 |
| total_saldo_banco_positivo (Card Bancos) | R$ 153.700,60 | R$ 91.617,38 |
| Dinheiro MP | R$ 20.225,00 | R$ 20.225,00 (OK) |
| A Receber | R$ 8.349,67 | R$ 8.349,67 (OK) |
| Patio OS | R$ 65.603,71 | R$ 65.603,71 (OK) |
| **Caixa Atual** | **R$ 216.837,37** | **R$ 163.755,56** |
| Caixa Anterior (26/08) | R$ 151.642,60 | R$ 151.642,60 (OK) |

## Solucao Proposta

### Fix 1 - RPC Ramal 1: recalcular positivos/negativos dos reconciliations, nao do snapshot

No Ramal 1 da funcao `get_daily_reconciliation_summary`, ao inves de usar `v_snapshot.saldo_bancario`
como base para `saldo_bancos_positivo`, recalcular da tabela `reconciliations` (DISTINCT ON store_id, date <= target_date).
O `caixa_atual` continua vindo do snapshot como autoridade final do fechamento.

### Fix 2 - Frontend: caixaAtualCalculado deduz negativo

Em `ResumoDiaPanel.tsx` linha 152-154:
```typescript
// ANTES (errado):
const caixaAtualCalculado = isEditing 
  ? (saldoBancosValor + dinheiroMpValor + aReceberValor + naLojaValor)
  : (summary?.caixa_atual ?? ...);

// DEPOIS (correto):
const caixaAtualCalculado = isEditing 
  ? (saldoBancosValor + dinheiroMpValor + aReceberValor + naLojaValor - saldoNegativoItau)
  : (summary?.caixa_atual ?? (saldoBancosValor + dinheiroMpValor + aReceberValor + naLojaValor - saldoNegativoItau));
```

### Fix 3 - handleSave: gravar saldo_bancario como OFX liquido (nao inflado)

Gravar `saldo_bancario: summary?.saldo_bancos_ofx ?? saldoBancosValor` para nao misturar cofre/rede
dentro do saldo_bancario e evitar dupla contagem no Ramal 1.

### Fix 4 - Hotfix de dados: corrigir snapshot de 27/08 no banco

UPDATE `daily_snapshots` SET correto para 27/08 com os valores auditados.

## Contratos de Dados

- **daily_snapshots**: saldo_bancario, caixa_atual, metadata
- **reconciliations**: bank_total (leitura para Ramal 1 atualizado)
- **RPC**: get_daily_reconciliation_summary - Ramal 1 atualizado

## Features Existentes Impactadas

- Spec 301 (diretamente - Ramal 1 precisava recalcular positivos/negativos)
- Fechamento historico 26/08 (nao pode ser alterado - caixa_atual = 151642.60 CORRETO)

## Risco Principal

Alterar o Ramal 1 pode mudar valores de dias historicos. Mitigacao: testar 26/08 antes e depois
para garantir que o fechamento historico nao muda.
