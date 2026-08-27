# Design: Correção de Dependência Descarregável llm-matcher (309)

## Arquitetura Técnica
```
Git Repository (main)
       │
       ├── CentralImportWizard.tsx  ──(import)──>  src/lib/llm-matcher.ts (agora rastreado no git)
       │                                                    │
       │                                                    └──(fetch REST)──> Gemini 2.5 Flash API
       │
       └── Vite Build / CI / Nitro Pipeline
             └── Resolução de módulos: @/lib/llm-matcher OK (código 0)
```

## Interfaces TypeScript
Em `src/lib/llm-matcher.ts`:
```typescript
export interface RedeSaleItem {
  id?: string;
  nsu?: string;
  authorization?: string;
  grossAmount: number;
  feeAmount: number;
  netAmount: number;
  method: string;
  dateVenda: string;
  previsaoPgto?: string;
  storeId?: string;
  storeName?: string;
}

export interface OfxCreditItem {
  id?: string;
  fitid?: string;
  title: string;
  amount: number;
  date: string;
  storeId?: string;
}

export interface RedeReconciliationResult {
  storeId: string;
  storeName: string;
  totalVendasLiquidas: number;
  totalCreditadoOfx: number;
  aCompensarReal: number;
  salesStatus: Array<{
    sale: RedeSaleItem;
    status: 'entrou' | 'nao_entrou';
    matchedOfxFitid?: string;
    reasoning: string;
  }>;
  aiUsed: boolean;
  modelUsed?: string;
}
```

## Componentes / Hooks / Funções
1. `src/lib/llm-matcher.ts`:
   - `reconcileRedeWithOfxViaGemini`: reconcilia vendas de cartão contra extrato bancário usando o modelo `gemini-2.5-flash` ou heurística determinística se offline.
   - `matchPixWithOsViaGemini`: cruza transferências PIX do extrato com OSs abertas no pátio por similaridade de nome e valor.
2. `src/components/importacoes/CentralImportWizard.tsx`:
   - Consome `reconcileRedeWithOfxViaGemini` no fluxo de importação unificada.

## Cenários de Verificação
- **Cenário 1 (Build Local):** `node node_modules/vite/bin/vite.js build` deve compilar sem erro de resolução de `@/lib/llm-matcher`.
- **Cenário 2 (Git Status):** `git status` deve confirmar `src/lib/llm-matcher.ts` rastreado e commitado.
- **Cenário 3 (CI/CD Remoto):** Push para `origin main` destrava o deploy do servidor.
