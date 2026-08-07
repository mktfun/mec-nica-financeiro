# Design: Motor de ConciliaçÁo em Camadas com Subset-Sum Combinatório e Janela Temporal D-1 (conciliacao-layered-matching)

## Arquitetura do Motor de Matching Multicamadas

```
[Transações de Entrada: OFX (Banco), Maquininha (Rede), OSs (Pátio)]
                           │
                           ▼
     ┌──────────────────────────────────────────┐
     │ CAMADA 1: Exact 1:1 Match (D0 / D-1)     │ ──► Pareia 100% (Remover do pool)
     └─────────────────────┬────────────────────┘
                           │ Lançamentos Restantes
                           ▼
     ┌──────────────────────────────────────────┐
     │ CAMADA 2: Subset-Sum Combinatório N:1     │ ──► Pareia Soma Exata 100% (Remover do pool)
     │ (Backtracking N <= 6 itens)              │
     └─────────────────────┬────────────────────┘
                           │ Lançamentos Restantes
                           ▼
     ┌──────────────────────────────────────────┐
     │ CAMADA 3: Busca Temporal Estendida (D-1) │ ──► Pareia com vendas do dia anterior
     └─────────────────────┬────────────────────┘
                           │ Lançamentos Sem Match Exato
                           ▼
     ┌──────────────────────────────────────────┐
     │ CAMADA 4: Painel de Alertas & Exceções   │ ──► Exibe apenas divergências reais por loja
     └──────────────────────────────────────────┘
```

## Algoritmo de Subset-Sum (Busca Combinatória Restrita)

```typescript
/**
 * Encontra um subconjunto de transações cuja soma dos valores líquidos
 * seja exatamente igual ao valor do depósito OFX (com tolerância de R$ 0.02)
 */
function findExactSubsetMatch(
  targetAmount: number,
  candidates: Array<{ id: string; amount: number; title: string }>,
  maxDepth = 5
): Array<{ id: string; amount: number; title: string }> | null {
  const TOLERANCE = 0.02;

  function backtrack(
    startIndex: number,
    currentSum: number,
    currentSubset: Array<{ id: string; amount: number; title: string }>
  ): Array<{ id: string; amount: number; title: string }> | null {
    if (Math.abs(currentSum - targetAmount) <= TOLERANCE) {
      return currentSubset;
    }
    if (currentSum > targetAmount + TOLERANCE || currentSubset.length >= maxDepth) {
      return null;
    }

    for (let i = startIndex; i < candidates.length; i++) {
      const candidate = candidates[i];
      const result = backtrack(
        i + 1,
        currentSum + candidate.amount,
        [...currentSubset, candidate]
      );
      if (result) return result;
    }

    return null;
  }

  return backtrack(0, 0, []);
}
```

## Estruturas de Dados TypeScript

```typescript
export interface LayeredMatchResult {
  exactMatches1to1: Array<{
    ofxDeposit: TransactionItem;
    redeTx: TransactionItem;
    layer: 'CAMADA_1_EXATA';
  }>;
  subsetMatchesNto1: Array<{
    ofxDeposit: TransactionItem;
    childRedeTxs: TransactionItem[];
    totalChildAmount: number;
    layer: 'CAMADA_2_SUBSET_SUM';
    isMatched: boolean;
  }>;
  temporalMatchesD1: Array<{
    ofxDeposit: TransactionItem;
    childRedeTxs: TransactionItem[];
    dateOffset: 'D-1' | 'D-2';
    layer: 'CAMADA_3_TEMPORAL';
  }>;
  unmatchedAlerts: Array<{
    item: TransactionItem;
    expectedAmount: number;
    foundAmount: number;
    delta: number;
    reason: 'SEM_VENDA_MAQUININHA' | 'DIVERGENCIA_MDR' | 'PENDENTE_IMPORTACAO_D1';
  }>;
}
```

## Mudanças nos Componentes Frontend

1. **`src/hooks/useConciliacao.ts`**:
   - Atualizar a funçÁo `useReconciliationViews` para buscar também as transações do dia anterior (`target_date = date - 1 day`) da mesma loja.
   - Implementar as 4 camadas de matching na geraçÁo de `redeVsOfx`, `osVsRede` e `pixVsOfx`.

2. **`src/components/conciliacao/RedeVsOfxTable.tsx`**:
   - Renderizar os grupos resultantes da Camada 1 e Camada 2 com selo de **"100% PAREADO (Exato)"** ou **"100% PAREADO (CombinaçÁo N:1)"**.
   - Indicar claramente quando uma venda foi pareada via janela temporal **"Pareado com Venda de Ontem (D-1)"**.

3. **`src/components/conciliacao/OsVsRedeTable.tsx`**:
   - Exibir correspondência exata $1:1$ de OS vs Maquininha. OSs que nÁo baterem nÁo sÁo forçadas — exibem tag de alerta.

4. **`src/components/conciliacao/ConciliacaoAlertsSection.tsx`**:
   - Novo componente/seçÁo de **Alertas de Divergência Real**: exibe uma tabela resumida com apenas os lançamentos que nÁo fecharam em nenhuma das 4 camadas, permitindo análise cirúrgica e ajuste manual.

## Cenários de VerificaçÁo (SCAN → INFER → VERIFY → FIX)

- **Cenário 1 (Caso "Rei do Módulo" - Exato 1:1 + CombinaçÁo 2:1):**
  - *Dados:* 4 depósitos OFX (R$ 590,52; R$ 2.447,39; R$ 367,11; R$ 446,49) e vendas de maquininha.
  - *AçÁo:* Processar via motor em camadas.
  - *Resultado Esperado:* A venda de R$ 590,52 pareia 1:1 na Camada 1. As duas vendas que somam R$ 2.447,39 pareiam na Camada 2 (Subset-Sum). NENHUMA divergência falsa é criada no agrupamento.

- **Cenário 2 (Sobras do Dia Anterior D-1):**
  - *Dados:* Depósito OFX de R$ 1.200,00 cai na segunda-feira. No arquivo da segunda nÁo há vendas da máquina que somem R$ 1.200,00, mas no domingo (D-1) há vendas nÁo conciliadas de R$ 1.200,00.
  - *AçÁo:* Executar a Camada 3 (Janela Temporal).
  - *Resultado Esperado:* O sistema localiza as vendas de domingo (D-1) e marca como pareado temporalmente, zerando a divergência falsa.

- **Cenário 3 (Divergência Real enviada para Alertas):**
  - *Dados:* Depósito OFX de R$ 800,00 sem nenhuma venda compatível hoje nem em D-1.
  - *AçÁo:* Processamento completo das 4 camadas.
  - *Resultado Esperado:* O depósito cai na seçÁo de **Alertas & Exceções**, indicando "Divergência de R$ 800,00 - Nenhuma venda localizada".
