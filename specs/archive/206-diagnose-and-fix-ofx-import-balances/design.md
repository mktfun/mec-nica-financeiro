# Design: 206-diagnose-and-fix-ofx-import-balances

## Arquitetura Técnica
```
[Arquivos OFX] 
      ↓
[parseOFXFile (ofxParser.ts)]
   - Regex Multi-Padrão para Saldo Anterior (SLD/SDO/INICIAL/PRVBAL)
   - Triangulação Matemática com Checksum Contábil
   - Suporte a Contas com Saldo Devedor / Cheque Especial
      ↓
[CentralImportWizard.tsx]
   - Step 2: Mapeamento de Filiais + Tabela de Auditoria de Saldos OFX
   - Acumulação Determinística de Múltiplas Contas por Loja
   - Alertas Visuais de Aliases Não Mapeados
      ↓
[useBulkInsertTransactions (useTransactions.ts)]
   - Agrupamento e Upsert Seguro em `reconciliations`
   - Inserção Idempotente em `ofx_transactions`
      ↓
[Supabase DB / RPCs]
   - `get_dashboard_metrics` & `calculate_daily_conciliation`
   - Exibição Exata e sem Divergências no Dashboard
```

## Interfaces TypeScript
```typescript
export interface OfxParseResult {
  alias: string;
  transactions: OfxTransaction[];
  bankBalance?: number;
  previousBalance?: number;
  accountLimit?: number;
  fileName?: string;
  inferredScale?: 'exact' | 'div10' | 'div100';
  deltaTransactions?: number;
}

export interface StoreOfxAuditSummary {
  storeId: string;
  storeName: string;
  files: {
    fileName: string;
    alias: string;
    previousBalance: number;
    totalIn: number;
    totalOut: number;
    calculatedBalance: number;
    ledgerBalance: number;
    isBalanced: boolean;
  }[];
  totalBankBalance: number;
  totalPreviousBalance: number;
}
```

## Componentes / Hooks / Funções
1. `src/lib/parsers/ofxParser.ts`:
   - Regex ampliada para `previousBalance`:
     `/SALDO\s+(?:ANTERIOR|INICIAL|DO\s+DIA|DEVEDOR|DISPON[IÍ]VEL\s+ANTERIOR)|(?:SLD|SDO)\s+ANTERIOR/i`
   - Suporte ao sinal negativo real do saldo anterior quando indicado por `DEBIT` ou valor negativo.
   - Extração do `<PRVBAL>` nativo se presente no header OFX.
2. `src/components/importacoes/CentralImportWizard.tsx`:
   - Adicionar sub-painel colapsável de **Auditoria de Saldos Bancários Extraídos** no Step 2 e Step 3.
   - Corrigir a agregação de `storeBankBalances` para somar valores quando houver mais de uma conta para a mesma loja (`storeBankBalances[store_id] = (storeBankBalances[store_id] || 0) + ofx.bankBalance`).
   - Adicionar validação para que nenhum arquivo OFX com transações fique com `store_id` indefinido sem aviso explícito ao usuário.
3. `src/hooks/useTransactions.ts`:
   - Blindar o upsert em `reconciliations` para nunca inserir chaves nulas sem store correspondente.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1 (Itaú com Saldo Truncado sem ponto)**:
  - Input: `<BALAMT>398519`, `SALDO ANTERIOR 41595.55`, Soma Tx = `-1743.65`.
  - Resultado: Identifica escala `/ 10` e grava `R$ 39.851,90` com 100% de precisão.
- **Cenário 2 (Itaú com rótulo "SLD ANTERIOR" ou "SDO ANTERIOR")**:
  - Input: Memo `"SLD ANTERIOR"`, `<BALAMT>250000`.
  - Resultado: Captura o saldo anterior, calcula o delta com as transações e infere `R$ 25.000,00` em vez de cair no fallback errôneo de `R$ 2.500,00`.
- **Cenário 3 (Múltiplos OFX para a mesma filial)**:
  - Input: 2 extratos mapeados para a mesma loja (ex: conta corrente R$ 10.000 + conta aplicação R$ 5.000).
  - Resultado: `bank_total` da loja no banco e no fechamento registra a soma correta `R$ 15.000,00`.
- **Cenário 4 (Diagnóstico Visual em Tempo Real)**:
  - Input: Upload dos 10 arquivos OFX no Wizard.
  - Resultado: Tabela de auditoria renderiza a lista completa das lojas, o saldo de cada uma e a soma total consolidada (ex: R$ 106.327,07), permitindo conferência imediata antes de salvar.
