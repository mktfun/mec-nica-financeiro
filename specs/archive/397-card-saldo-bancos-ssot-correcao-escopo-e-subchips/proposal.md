# Proposal: Correção Definitiva do Card "Saldo Bancos + Dinheiro" — SSOT com Modal Raio-X (397)

## Problema

O card "SALDO BANCOS + DINHEIRO" no dashboard de conciliação exibe **R$ 135.706,55** (valor líquido NET do OFX, ou seja, positivos - cheque especial), enquanto o modal Raio-X (clicando "Ver Lojas ↗") exibe corretamente os valores segregados:

| Métrica             | Modal (CORRETO)  | Card (ERRADO)   |
|---------------------|------------------|-----------------|
| OFX Positivo        | R$ 146.160,23    | R$ 0,00 (chip)  |
| Cheque Especial     | -R$ 10.453,68    | não aparece      |
| Dinheiro no Cofre   | +R$ 880,00       | não aparece      |
| A Compensar (Rede)  | +R$ 4.642,10     | não aparece      |
| **TOTAL**           | **R$ 151.682,33**| **R$ 135.706,55**|

### Causas Raiz (3 bugs interligados)

**Bug 1 — Variável `posData` fora de escopo (useBackendConciliacao.ts:289)**
A declaração `const { data: posData }` está dentro de um bloco `try` (linha 265), mas é referenciada fora dele (linhas 289 e 308). Em JavaScript, `const` é block-scoped ao `try`, o que significa que `posData` é `undefined` fora do try, fazendo o ternário `posData ? posSum : Number(s.nao_entrou_valor ?? 0)` cair sempre no fallback `s.nao_entrou_valor`, que é `0` na RPC. **Resultado:** nenhuma loja tem `nao_entrou_valor` enriquecido → `maquininhas = 0` no `derivedBankTotals` → sub-chip "A Compensar" não aparece.

**Bug 2 — `derivedBankTotals` dá 0 no primeiro render**
O memo depende de `summary` e `storesData`. Se `summary` ainda não carregou (null/undefined), o memo calcula 0 para tudo. A renderização então usa o fallback chain (linhas 667-669 e 240-242) que cai em `summary?.total_saldo_banco_positivo` (R$ 189.403,12 — inflado) ou `total_saldo_banco` (R$ 135.706,55 — líquido). Como `total_saldo_banco_positivo` é 189k e não passa no sanity-check, cai em `total_saldo_banco = 135.706,55`.

**Bug 3 — RPC retorna `cartoes_a_compensar: 42.362,89` (inflado)**
O campo `cartoes_a_compensar` da RPC contém R$ 42.362,89 em vez dos reais ~R$ 4.170,90 (POS pendentes). Isso polui o campo `total_saldo_banco_positivo` (R$ 189.403,12 = 146.160,23 + 880 + 42.362,89).

## Solução Proposta

### [MODIFY] `src/hooks/useBackendConciliacao.ts` — Corrigir escopo de posData
- Declarar `let posDataResult: any[] | null = null;` **antes** do `try` block
- Dentro do try, atribuir `posDataResult = posData;` após a query
- Substituir todas as referências `posData` fora do try por `posDataResult`
- Isso garante que o enriquecimento de `nao_entrou_valor` funcione corretamente

### [MODIFY] `src/components/conciliacao/ResumoDiaPanel.tsx` — Limpar fallback chain
- Remover fallback chain confuso do valor principal do card
- Se `derivedBankTotals.totalPositivoConsolidado > 0`, usar diretamente
- Se for 0 E `summary?.stores` existir, recalcular inline com a mesma lógica
- Nunca cair em `total_saldo_banco` da RPC (é NET, não serve para o card)

## Risco Principal
Se a consulta `pos_transactions` falhar, `posDataResult` será `null` e o ternário usará `s.nao_entrou_valor` da RPC (que é 0). Mitigação: usar `extraPosEntries.length > 0` como flag.
