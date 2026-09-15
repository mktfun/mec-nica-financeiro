# Spec 402 — Proposal: Eliminação do "Frankenstein" Matemático (Reatividade Total do Caixa, Pátio e Dinheiro no Cofre)

## 1. Problema e Diagnóstico Forense com Provas

O sistema encontra-se em um estado "Frankenstein" de cálculo híbrido onde a tela possui dois comportamentos mutuamente excludentes que colidem:
1. **Cards do Topo (Ativos):** Atualizam de forma semi-dinâmica (ex: ao atualizar ordens de serviço, o card "NA LOJA OS" atualizou para R$ 75.385,62).
2. **Esteira de Consolidação & Fluxo Contábil (Meio e Direita):** Permanece 100% congelada nos valores estáticos gravados no snapshot anterior (`daily_snapshots`), ignorando as alterações feitas nos cards do topo.
3. **Dinheiro no Cofre Preso em R$ 7.020,00:** O banco de dados (`store_cash_vault`) já registrou com sucesso R$ 3.640,00 de baixas (Dom Pedro, Planalto, Rei do Módulo) com status `depositado`. O saldo real em trânsito no cofre é **R$ 3.380,00**. Porém, o chip do card lê `daily_snapshots.metadata.dinheiro_lojas`, que nunca é decrementado quando a baixa acontece.

### As Três Provas Irrefutáveis do Bug

#### Prova A: O Curto-Circuito em `ResumoDiaPanel.tsx` (Linhas 267–285)
```typescript
// Código atual defeituoso:
const caixaAtualCalculado = isEditing 
  ? (saldoBancosValor + dinheiroMpValor + aReceberValor + naLojaValor - saldoNegativoItau)
  : (summary?.caixa_atual ?? (saldoBancosValor + dinheiroMpValor + aReceberValor + naLojaValor - saldoNegativoItau));

const fluxoCaixaCalculado = isEditing 
  ? (caixaAtualCalculado - caixaAnteriorGlobal)
  : (summary?.fluxo_caixa ?? (caixaAtualCalculado - caixaAnteriorGlobal));
```
- **Fato comprovado:** Quando o usuário está em modo de visualização (`isEditing === false`), o sistema **descarta** a soma canônica dos 5 pilares e injeta o `summary?.caixa_atual` e `summary?.fluxo_caixa` congelados do snapshot.
- **Consequência direta:** O usuário atualiza "Carros em Pátio" para R$ 75.385,62, o card do topo atualiza, mas o Caixa Atual fica imóvel em R$ 259.201,20, o Fluxo de Caixa fica imóvel em +R$ 55.961,18 e a Diferença Final fica congelada em -R$ 527,26. Ao clicar em "Editar Fechamento", os números saltam magicamente porque a fórmula muda para o ramo ternário dinâmico.

#### Prova B: Dessincronização do Dinheiro no Cofre (`store_cash_vault` vs `daily_snapshots.metadata`)
- Na tabela `store_cash_vault`:
  - Mauá (R$ 380,00) `em_transito`
  - Jabaquara (R$ 500,00) `em_transito`
  - Piraporinha (R$ 2.500,00) `em_transito`
  - **Soma Real em Aberto: R$ 3.380,00**
  - Baixas já executadas e gravadas como `depositado`: R$ 1.080 + R$ 1.860 + R$ 700 = R$ 3.640,00.
- No snapshot (`daily_snapshots.metadata.dinheiro_lojas`): **R$ 7.020,00** (valor pré-baixas congelado).
- A RPC `dar_baixa_dinheiro` e o modal `BaixaDinheiroModal.tsx` atualizam o status na tabela `store_cash_vault`, mas **não sincronizam** o `metadata.dinheiro_lojas` no snapshot diário, fazendo o card continuar exibindo `+ R$ 7.020,00` ad infinitum.

#### Prova C: Conflito Dual entre RPC `get_daily_reconciliation_summary` e Hook `useBackendConciliacao`
- A RPC SQL possui uma trava: `IF v_snapshot_found AND v_snapshot.is_closed AND NOT p_force_dynamic THEN v_caixa_atual := v_snapshot.caixa_atual;`.
- Já o hook `useBackendConciliacao.ts` recalcula `faturamento_periodo`, `valor_disp_contas` e `diferenca_final` dinamicamente por cima do summary, mas mantém `caixa_atual` e `fluxo_caixa` congelados da RPC.

---

## 2. Solução Proposta

Unificar a arquitetura matemática de forma **canônica, reativa e sem dualidades**:

1. **Unificação da Fórmula no Frontend (`ResumoDiaPanel.tsx`):**
   - Eliminar a bifurcação ternária `isEditing ? dinamico : snapshot`.
   - Tanto em modo de visualização quanto em modo de edição, `caixaAtualCalculado`, `fluxoCaixaCalculado`, `valorDispContasCalculado` e `diferencaFinalCalculada` devem SEMPRE ser computados de forma reativa a partir dos 5 pilares reais (`saldoBancosValor + dinheiroMpValor + aReceberValor + naLojaValor - saldoNegativoItau`).
   - O snapshot fechado preserva o histórico de auditoria (`metadata.snapshot_fechamento`), mas o display da tela recalcula instantaneamente se qualquer pilar for alterado.

2. **Reatividade e Sincronização do Dinheiro no Cofre:**
   - O chip "Dinheiro no Cofre" deve ler dinamicamente a soma dos registros com `status IN ('em_transito', 'pending')` da tabela `store_cash_vault` (que reflete os R$ 3.380,00 reais).
   - Ao executar "Dar Baixa", a mutação deve invalidar as queries `['store-cash-vault-pending']`, `['daily-reconciliation-summary']` e `['backend-conciliacao']`, além de atualizar atomicamente o `metadata.dinheiro_lojas` no `daily_snapshots`.

3. **Alinhamento do Snapshot de 14/09/2026:**
   - Sincronizar o snapshot do dia 14/09 para refletir o saldo real do cofre (R$ 3.380,00), o pátio atualizado (R$ 75.385,62) e recalcular coerentemente o Caixa Atual canônico.

---

## 3. Investigação e Análise de Reuso
- **Reuso de Componentes:** Não criar nenhum modal ou card novo. Manter integralmente `ResumoDiaPanel.tsx`, `SaldoBancosDetailModal.tsx` e `BaixaDinheiroModal.tsx`.
- **Reuso de Hooks:** Ajustar `useBackendConciliacao.ts` e `ResumoDiaPanel.tsx` para não consumirem campos congelados quando os dados dinâmicos dos pilares divergirem.
- **Reuso de RPCs:** A RPC `dar_baixa_dinheiro` já existe e funciona; apenas garantiremos que o frontend e o snapshot reflitam a baixa atomicamente.

---

## 4. Contratos de Dados & Impacto

### Arquivos Existentes a Modificar [MODIFY]
1. `src/components/conciliacao/ResumoDiaPanel.tsx`:
   - Remover bifurcação `isEditing` para Caixa Atual e Fluxo de Caixa.
   - Tornar o cálculo de `caixaAtualCalculado` e `fluxoCaixaCalculado` 100% dinâmico derivado dos 5 pilares.
   - Garantir que o chip "Dinheiro no Cofre" use `summary?.dinheiro_lojas` dinâmico em vez de congelado.
2. `src/hooks/useBackendConciliacao.ts`:
   - Recalcular `caixa_atual` e `fluxo_caixa` no hook a partir dos pilares enriquecidos (`finalTotalSaldoBancoPositivo + dinheiro_mp + a_receber + finalPatio - baseBancoNegativo`).
3. `src/components/conciliacao/BaixaDinheiroModal.tsx`:
   - Checar `data.success` no retorno da RPC `dar_baixa_dinheiro`.
   - Remover updates manuais duplicados de `bank_total` que causam dupla efetivação.

---

## 5. Risco Principal e Mitigação
- **Risco:** Dias históricos fechados mudarem de valor se o extrato mudar.
- **Mitigação:** Se um dia estiver fechado e NÃO houver alteração de pátio/banco hoje, os valores canônicos batem exatamente com o snapshot. Apenas quando o usuário efetivamente altera um pilar (ex: pátio de 77k para 75k) a reatividade atua, mantendo o sistema matematicamente íntegro.
