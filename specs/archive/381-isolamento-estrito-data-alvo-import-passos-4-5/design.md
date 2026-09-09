# Design: Isolamento Estrito de Data Alvo nos Passos 4 e 5 da Importação (Spec 381)

## Arquitetura e Fluxo de Dados

```
Arquivos de Entrada (OFX / Rede / OS / Contas)
       │
       ▼
useCentralImport (Parsers)
       │
       ▼
executeAutoMatchingEngine(results, mapping, stores, targetDate)
  ├── Filtro Estrito: Apenas tx.date === targetDate participa do match
  └── Saída: unmatchedTransactions (Apenas do dia!)
       │
       ▼
executeExpenseAutoMatching(results.ofxResults, results.contasPagarResults, mapping, stores, targetDate)
  ├── Filtro Estrito: Apenas débitos com tx.date === targetDate
  └── Saída: orphanOutflows (Apenas do dia!)
       │
       ▼
CentralImportWizard (Gravação em Lote)
  ├── txsToInsert: target_date = tx.date || targetDate (NUNCA força sobre data diferente)
  └── fetchRealUnmatchedTransactions: target_date = tDate E occurred_at compatível
       │
       ▼
UI: Step 4 (Step1UnregisteredPayments) & Step 5 (Step2NonRevenueJustifications)
  ├── Filtro defensivo: row.date === targetDate
  └── Zero vazamento de transações antigas de dias anteriores
```

---

## Interfaces TypeScript Reais

### Assinatura Atualizada de `executeExpenseAutoMatching`
```typescript
export function executeExpenseAutoMatching(
  ofxResults: any[],
  contasPagarResults: any[],
  mapping: Record<string, string>,
  stores: { id: string; name: string }[],
  targetDate?: string // Data alvo para isolamento estrito
): InMemExpenseMatchingResult;
```

### Contrato de Validação de Data em `autoMatchingEngine.ts`
```typescript
function isSameDate(txDate: string | undefined | null, targetDate: string): boolean {
  if (!txDate || !targetDate) return false;
  const cleanTx = txDate.split('T')[0].trim();
  const cleanTarget = targetDate.split('T')[0].trim();
  return cleanTx === cleanTarget;
}
```

---

## Mutações em Arquivos Existentes [MODIFY]

### 1. `src/lib/matchers/autoMatchingEngine.ts`
- Em `redeResults`:
  ```typescript
  // Processar apenas transações da data alvo
  const txDate = tx.date ? String(tx.date).split('T')[0] : targetDate;
  if (targetDate && txDate !== targetDate) return;
  ```
- Em `ofxResults`:
  ```typescript
  // Processar apenas depósitos e PIX da data alvo
  const txDate = tx.date ? String(tx.date).split('T')[0] : targetDate;
  if (targetDate && txDate !== targetDate) return;
  ```

### 2. `src/lib/expenseMatcher.ts`
- Adicionar parâmetro opcional `targetDate?: string` em `executeExpenseAutoMatching`.
- Filtrar `allDebits` para ignorar débitos cuja data seja diferente de `targetDate`.

### 3. `src/components/importacoes/CentralImportWizard.tsx`
- Ao montar `txsToInsert`:
  ```typescript
  // Preservar data original de ocorrência
  const effectiveDate = tx.date ? String(tx.date).split('T')[0] : targetDate;
  txsToInsert.push({
    ...
    occurred_at: tx.date || targetDate || new Date().toISOString(),
    date: effectiveDate,
    target_date: effectiveDate, // Não sobrescreve forçado com targetDate se for de outro dia
  });
  ```
- Em `fetchRealUnmatchedTransactions`:
  Adicionar descarte se `occurred_at` não for do mesmo dia de `tDate`.

### 4. `src/components/importacoes/wizard/Step1UnregisteredPayments.tsx`
- No cálculo de `filteredTransactions`:
  ```typescript
  const dateSafeTxs = activeTxs.filter(tx => {
    if (!targetDate) return true;
    const cleanDate = (tx.date || '').split('T')[0];
    return cleanDate === targetDate;
  });
  ```

### 5. `src/components/importacoes/wizard/Step2NonRevenueJustifications.tsx`
- No fallback em memória de `nonRevenueInflowEntries` e `nonRevenueOutflowEntries`:
  Garantir que `tx.date === targetDate` ou `tx.occurred_at?.slice(0, 10) === targetDate`.

---

## Cenários Obrigatórios

### Happy Path (Cenário Nominal)
1. **Estado Inicial:** Operador seleciona a Data Alvo `2026-09-09` e faz upload do pacote de extratos OFX e relatórios contendo histórico dos últimos 5 dias.
2. **Ação:** O operador avança para a Fase de Processamento e clica em *"Processar e Avançar Conciliação"*.
3. **Resultado Esperado:** 
   - No Passo 4 (`Step1UnregisteredPayments`), aparecem **apenas** pagamentos e vendas com data `2026-09-09`.
   - No Passo 5 (`Step2NonRevenueJustifications`), aparecem **apenas** débitos e créditos com data `2026-09-09`.
   - Transações de 04/09 e 08/09 não aparecem em nenhuma das tabelas do dia 09/09.

### Edge Case (Extrato Sem Data ou Com Fuso Horário)
1. **Estado Inicial:** Transação OFX com timestamp ISO `2026-09-09T03:00:00.000Z` ou data formatada `2026-09-09`.
2. **Ação:** O normalizador `isSameDate` executa o split em `T`.
3. **Resultado Esperado:** Reconhecimento correto de `2026-09-09` sem falsas exclusões por fuso horário. Se a data for nula ou não detectável, assume `targetDate` de forma controlada.

---

## Critérios de Aceitação Verificáveis
1. **Zero vazamento de datas anteriores:** Ao abrir o Passo 4 e o Passo 5 com `targetDate = '2026-09-09'`, todas as linhas exibem estritamente a data `2026-09-09` (ou `09/09/2026`).
2. **Preservação de Integridade no Banco:** Transações com `occurred_at` em 04/09 presentes em lotes não são mais reescritas como `target_date = 2026-09-09`.
3. **Build Gate:** `cmd.exe /c "npm run build"` executa com código 0 e sem erros de tipagem TypeScript.

---

## 2 Cenários de Teste [SCAN -> INFER -> VERIFY -> FIX]

### Teste 1: Auditoria da Lista de Pagamentos sem OS (Passo 4)
- **SCAN:** Carregar transações pendentes no Step 4 com arquivo de extrato contendo datas 08/09 e 09/09.
- **INFER:** O sistema deve descartar as linhas de 08/09 e reter apenas as de 09/09.
- **VERIFY:** Inspecionar `unmatchedTransactions` via console/script e verificar `every(tx => tx.date === targetDate) === true`.
- **FIX:** Se houver resquício de data anterior, acionar o filtro defensivo no hook/componente.

### Teste 2: Auditoria da Lista de Justificativas e Débitos OFX (Passo 5)
- **SCAN:** Abrir o Step 2 (Passo 5) para a data `2026-09-09`.
- **INFER:** A tabela de débitos e créditos deve conter exclusivamente movimentações de `2026-09-09`.
- **VERIFY:** Nenhuma linha de 04/09 (como faturas antigas) ou de 08/09 (como SISPAG de R$ 3.000 de ontem) é renderizada.
- **FIX:** Reforçar o predicado no `useMemo` de `nonRevenueOutflowEntries`.
