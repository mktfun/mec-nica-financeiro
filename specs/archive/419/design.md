# Spec 419 — Design: Parsing Resiliente da Rede e Sanitização Fiel de Arquivos

## Arquitetura de Fluxo Ponta a Ponta
```
[Arquivo Excel Rede]
       │
       ▼
[parseRedeFile (redeParser.ts)]
       │
       ├─► Linha com "valor líquido" = "-"
       │   ├─► grossAmount = extractNumber(grossRaw) (ex: R$ 1.000,00)
       │   ├─► interest = totalFee || (mdr + antecipacao) || 0
       │   └─► netAmount = rawNetNum > 0 ? rawNetNum : (grossAmount - interest)
       │
       ▼
[RedeResult]
  - transactions (length: 33)
  - totalGross: R$ 57.679,52
  - totalNet: R$ 57.679,52
       │
       ▼
[parseCentralImports (centralImportManager.ts)]
       │
       ├─► Guarda de arquivo vazio:
       │   if (redeRes.transactions.length === 0 || (totalNet <= 0 && totalGross <= 0))
       │   └─► FALSE (arquivo possui movimentação!) -> Não descarta
       │
       ▼
[results.redeResults.push(redeRes)]
       │
       ▼
[CentralImportWizard UI]
  - Step 2: Lojas da Rede detectadas e mapeadas
  - Step 4 / Fase 2: Vendas e PIX da Rede comparados com as OSs do Pátio
```

---

## Interfaces TypeScript Reais

### `RedeTransaction` (`src/lib/parsers/redeParser.ts`)
```typescript
export interface RedeTransaction {
  storeName: string;
  establishment?: string;
  method: 'Cartão Crédito' | 'Cartão Débito' | 'PIX' | 'Outros';
  grossAmount: number;
  netAmount: number;
  interest: number;
  date: string;
  creditDate?: string;
  batchNumber?: string;
  prazoDays?: number;
  transactionType?: 'venda' | 'devolucao';
  nsu?: string;
  authorization?: string;
  tid?: string;
  time?: string;
  brand?: string;
}
```

### `RedeResult` (`src/lib/parsers/redeParser.ts`)
```typescript
export interface RedeResult {
  success: boolean;
  fileName: string;
  transactions: RedeTransaction[];
  totalInterest: number;
  totalNet: number;
  totalGross: number;
  totalDevolucoes?: number;
  error?: string;
}
```

---

## Cenários Obrigatórios

### 1. Happy Path
- **Entrada:** Arquivo `Rede_Rel_Vendas_17_09_2026-17_09_2026-b39776b1-cfcb-4eba-9bb9-e124f5844fe8.xlsx` (Jorge Beretta MP) contendo 6 transações com `valor líquido: "-"`.
- **Comportamento:** O parser extrai `grossAmount` de cada transação, calcula `netAmount = grossAmount - interest`, soma `totalGross = 7427.18` e `totalNet = 7427.18`. O `centralImportManager` não descarta o arquivo e o inclui em `results.redeResults`.

### 2. Edge Case (Arquivo Realmente Sem Movimento)
- **Entrada:** Um arquivo da Rede que só possui cabeçalhos e nenhuma linha de dados (ou linhas com R$ 0,00 tanto no bruto quanto no líquido).
- **Comportamento:** `transactions.length === 0` ou `(totalNet <= 0 && totalGross <= 0)`. O arquivo é corretamente classificado em `results.alerts.ignoredEmptyRede` e ignorado sem quebrar a esteira.

---

## Critérios de Aceitação Verificáveis
1. **Zero Descarte Indevido:** Nenhum dos 6 arquivos de vendas da pasta `C:\Users\admin\Desktop\conciliacao\09-26\18-09` é descartado no alerta `ignoredEmptyRede`.
2. **Totalidade das Transações:** As 33 transações dos 6 arquivos de vendas da Rede são extraídas com seus respectivos valores brutos e líquidos.
3. **Mapeamento de Lojas:** As lojas Dom Pedro, Jabaquara, Rei do Módulo, HD, Jorge Beretta e CAP são identificadas e associadas com sucesso.
4. **Terminal Gate:** `npm run build` executa e passa com exit code 0.
