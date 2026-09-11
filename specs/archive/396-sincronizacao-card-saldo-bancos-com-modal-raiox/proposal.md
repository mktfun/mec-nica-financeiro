# Proposal — Spec 396: Sincronização Canônica do Card "Saldo Bancos + Dinheiro" com o Modal Raio-X

## Problema
Ao abrir a tela de Conciliação Diária (ex: 10/09/2026), o card principal de patrimônio **"SALDO BANCOS + DINHEIRO"** exibe **`R$ 0,00`** e seu sub-chip **"EXTRATO OFX (POSITIVO)"** também exibe **`R$ 0,00`**, sem exibir os chips de Dinheiro no Cofre, Maquininhas a Compensar ou Cheque Especial.
Contudo, ao clicar em **"Ver Lojas ↗"**, o modal **"Raio-X de Saldos Bancários & Dinheiro por Filial"** abre perfeitamente populado, exibindo:
- **BANCOS POSITIVOS (OFX):** R$ 149.272,57
- **(-) CHEQUE ESPECIAL (REAL):** - R$ 10.453,68
- **DINHEIRO NO COFRE:** + R$ 880,00
- **A COMPENSAR (REDE):** + R$ 4.642,10
- **TOTAL SALDO BANCO:** R$ 154.794,67

### Causa Raiz
1. **Divergência de SSOT entre Card e Modal:**
   - O modal `SaldoBancosDetailModal.tsx` calcula seus totais diretamente a partir da lista de lojas (`effectiveStores`), somando de forma resiliente cada coluna (`saldoOfxPuro`, `dinheiroLoja`, `maquininhaNaoEntrou`).
   - O card em `ResumoDiaPanel.tsx` consumia propriedades escalares pré-calculadas do objeto `summary` (`summary?.total_saldo_banco`, `summary?.saldo_bancos_ofx_positivo`), utilizando o operador de coalescência nula `??`. Se qualquer uma dessas propriedades viesse como `0` ou nula no snapshot salvo/RPC, `0 ?? fallback` avaliava para `0`, zerando o card e ocultando os sub-chips (`hasCofre`, `hasMaq`, `hasNeg` ficavam falsos).
2. **Omissão de Agregação por Filial no Hook `useDailyReconciliationSummary` (`useBackendConciliacao.ts`):**
   - O hook enriquecia as lojas (`enrichedStores`) com dinheiro em trânsito e maquininhas pendentes, mas calculava `baseBancoPositivo = Number(rawSummary.saldo_bancos_positivo ?? 0)`. Se a RPC ou snapshot retornasse `0`, o hook não recalculava a base bancária positiva a partir das lojas de `enrichedStores`, propagando `0` para o card do painel.

---

## Solução Proposta (Foco em Reuso e Consistência Estrita)

1. **Enriquecimento Canônico no Hook `useDailyReconciliationSummary` (`src/hooks/useBackendConciliacao.ts`):**
   - Calcular `baseBancoPositivo` e `baseBancoNegativo` diretamente a partir da soma dos saldos de `enrichedStores`:
     - $\text{baseBancoPositivo} = \sum_{s} \max(0, s.\text{saldo\_banco\_ofx})$ (R$ 149.272,57)
     - $\text{baseBancoNegativo} = \sum_{s} \max(0, -s.\text{saldo\_banco\_ofx})$ (R$ 10.453,68)
   - Atualizar `total_saldo_banco_positivo = baseBancoPositivo + finalDinheiroLojas + finalCartoesACompensar` (R$ 154.794,67).
   - Injetar `saldo_bancos_ofx_positivo: baseBancoPositivo` e `saldo_bancos_positivo: baseBancoPositivo` no retorno do hook.

2. **Cálculo Derivado Resiliente no Card `ResumoDiaPanel.tsx` (`src/components/conciliacao/ResumoDiaPanel.tsx`):**
   - Criar um hook/memo `derivedBankTotals` que extrai os totais consolidados exatamente com a mesma regra matemática de `SaldoBancosDetailModal.tsx` a partir de `summary?.stores || storesData`.
   - Substituir a leitura frágil `summary?.total_saldo_banco ?? ...` por:
     - Valor Principal do Card: `derivedBankTotals.totalPositivoConsolidado || summary?.total_saldo_banco_positivo || 0` (R$ 154.794,67).
     - Sub-chip Extrato OFX (Positivo): `derivedBankTotals.ofxPositivo || summary?.saldo_bancos_ofx_positivo || 0` (R$ 149.272,57).
     - Sub-chip Dinheiro no Cofre: `derivedBankTotals.dinheiro || summary?.dinheiro_em_lojas || 0` (+ R$ 880,00).
     - Sub-chip Maquininhas (D+1): `derivedBankTotals.maquininhas || summary?.cartoes_a_compensar || 0` (+ R$ 4.642,10).
     - Sub-chip Cheque Especial: `derivedBankTotals.ofxNegativo || summary?.saldo_negativo_itau || 0` (- R$ 10.453,68).
   - Eliminar o anti-pattern de operadores `??` onde `0` impedia o fallback de valor real.

---

## Skills Especializadas Aplicadas
- `frontend-design-pro`: Conformidade com tokens Dark UI (Zinc-950), superfícies por luminância e garantia de animação suave com `AnimatedNumber`.
- `backend-patterns`: Normalização defensiva de dados derivados em hooks de dados do React Query sem mutação destrutiva.

---

## Arquivos Afetados

### [Arquivos Existentes Modificados / Reutilizados]
1. `src/hooks/useBackendConciliacao.ts` [MODIFY]: Adicionar agregação resiliente de `baseBancoPositivo` e `baseBancoNegativo` a partir de `enrichedStores`.
2. `src/components/conciliacao/ResumoDiaPanel.tsx` [MODIFY]: Alinhar o card "SALDO BANCOS + DINHEIRO" e seus 4 sub-chips com os totais derivados de lojas.

### [Arquivos Novos]
- Nenhum arquivo novo necessário (100% de reuso de componentes e hooks existentes).

---

## Plano de Rollback
- Reverter as alterações nos dois arquivos via `git checkout src/hooks/useBackendConciliacao.ts src/components/conciliacao/ResumoDiaPanel.tsx`. Nenhuma tabela física de banco de dados ou migration é alterada.

---

## Risco Principal e Mitigação
- **Risco:** Incompatibilidade temporária caso `stores` venha vazio durante o primeiro ciclo de renderização (loading state).
- **Mitigação:** `derivedBankTotals` implementa fallbacks encadeados: se `stores` estiver vazio, usa os valores escalares do `summary`; se ambos estiverem vazios durante o loading, exibe skeleton/loading sem travar a interface.
