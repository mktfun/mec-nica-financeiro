# Design: Correção de Processamento de Planilhas de OS e Motor Central de Imports (361-fix-planilhas-os-central-imports)

## Arquitetura Técnica
O fluxo de ingestão e conciliação unificado opera no modelo Pure Parser -> State Orchestrator -> Safe Consumer:

```
[Dropzone / Upload de Arquivos] (Fase 1..4 ou Wizard Central)
             │
             ▼
[parseCentralImports(files: File | File[])] em centralImportManager.ts
 ├── Agrupamento por extensão (.xlsx/.xls, .ofx/.ret, .pdf)
 ├── Roteamento determinístico:
 │    ├── OFX/RET ──────────────► parseOFXFile() + normalização (success: true, alias)
 │    ├── PDF ──────────────────► parseMapaMetasPDF()
 │    └── Planilhas Excel/CSV ──► Teste Contas a Pagar (parseContasAPagarFile)
 │                                ├── Sucesso? ──► contasPagarResults & contasAPagarResults
 │                                └── Não? ──────► Teste Rede (parseRedeFile)
 │                                                  ├── Sucesso? ──► redeResults
 │                                                  └── Não? ──────► Teste OS (processOsFiles)
 │                                                                    ├── Sucesso? ──► osFiles
 │                                                                    └── Não? ──────► Fallback Maquininha Genérica
 └── Retorno do objeto canônico CentralImportResults (sempre com arrays inicializados: [])
             │
             ├──► Ingestão Direta / Fechamento Manual (Fases 1, 2, 3, 4):
             │      ├── Fase 1: (parseResult?.osFiles || []) ──► Mapeamento seguro de valores ──► batch_upsert_patio_os
             │      ├── Fase 2: (parseResult?.redeResults || []) ──► pos_transactions
             │      ├── Fase 3: (parseResult?.ofxResults || []) ──► bank_transactions
             │      └── Fase 4: (parseResult?.contasAPagarResults || []) ──► accounts_payable
             │
             └──► Hook React useCentralImport():
                    └── Reutiliza parseCentralImports() e adiciona enriquecimento com Supabase (delta_paid, is_new_os)
```

## Interfaces TypeScript

```typescript
import type { OsImportResult } from '@/hooks/useOsImportProcessor';
import type { RedeResult } from '@/lib/parsers/redeParser';
import type { OfxParseResult } from '@/lib/parsers/ofxParser';
import type { MapaMetasResult } from '@/lib/parsers/mapaMetasParser';
import type { ContasAPagarParseResult } from '@/types/contasPagar';

export type NormalizedOfxResult = OfxParseResult & {
  success: boolean;
  storeAlias?: string;
  accountKey?: string;
  error?: string;
};

export interface MaquininhaItem {
  fileName: string;
  storeName: string;
  amount: number;
  dateVenda?: string;
  dateCredito?: string;
}

export interface CentralImportResults {
  osFiles: OsImportResult[];
  redeResults: RedeResult[];
  ofxResults: NormalizedOfxResult[];
  contasPagarResults: ContasAPagarParseResult[];
  contasAPagarResults: ContasAPagarParseResult[];
  maquininhaItems: MaquininhaItem[];
  mapaMetasResults: MapaMetasResult[];
  validData: any[];
  errors: string[];
}
```

## Componentes / Funções Modificados

1. `src/lib/parsers/centralImportManager.ts`:
   - Responsabilidade: Motor SSOT puro de leitura e roteamento de arquivos importados. Implementa `parseCentralImports(files: File | File[], options?: { sessionId?: string })`.
2. `src/hooks/useCentralImport.ts`:
   - Responsabilidade: Adaptação React do motor centralizado, reutilizando `parseCentralImports` e mantendo a hidratação de `delta_paid` e `is_new_os` via Supabase.
3. `src/components/importacoes/manual/Fase1PatioOsReview.tsx`:
   - Responsabilidade: Adição de guarda defensiva `(parseResult?.osFiles || [])` e correção do mapeamento de valores para `batch_upsert_patio_os`:
     ```typescript
     credit_value: (os as any).credit_value ?? os.parsed_credit ?? 0,
     debit_value: (os as any).debit_value ?? os.parsed_debit ?? 0,
     pix_transfer_value: (os as any).pix_transfer_value ?? os.parsed_pix_transfer ?? 0,
     cash_value: (os as any).cash_value ?? os.parsed_cash ?? 0,
     ```
4. `src/components/importacoes/manual/Fase2RedeVsOsReview.tsx`:
   - Responsabilidade: Adição de guarda defensiva `(parseResult?.redeResults || []).filter(r => r.success)`.
5. `src/components/importacoes/manual/Fase3OfxReconciliation.tsx`:
   - Responsabilidade: Adição de guarda defensiva `(parseResult?.ofxResults || []).filter(r => r.success)`.
6. `src/components/importacoes/manual/Fase4ContasVsSaidasReview.tsx`:
   - Responsabilidade: Adição de guarda defensiva `(parseResult?.contasAPagarResults || parseResult?.contasPagarResults || []).filter(r => r.success)` e normalização de propriedades de contas (`b.storeName || (b as any).store_name`, `b.dueDate || (b as any).due_date`).
7. `src/components/importacoes/wizard/Step4FinalAuditAndClose.tsx`:
   - Responsabilidade: Harmonização com o tipo expandido `CentralImportResults`.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)

### Cenário 1: Upload de Planilha de OS no Fechamento Manual (Fase 1)
- **Estado Inicial**: Usuário na tela de Fechamento Manual na aba "1. OSs do Pátio".
- **Ação**: Soltar o arquivo `1543_ConferenciaOSxFinanceiro.xls` ou `.xlsx` na dropzone.
- **Resultado Esperado**:
  - Nenhum erro de `TypeError: Cannot read properties of undefined (reading 'filter')`.
  - O parser extrai as OSs com sucesso.
  - As OSs são enviadas para a RPC `batch_upsert_patio_os` com valores corretos (total, pago, crédito, débito, pix, dinheiro).
  - A tabela da grade exibe as OSs carregadas e o toast exibe confirmação.

### Cenário 2: Upload de Múltiplos Arquivos Heterogêneos
- **Estado Inicial**: Usuário ou wizard chama `parseCentralImports` com lista contendo 1 OFX, 1 Excel de Contas a Pagar e 1 Excel de OS.
- **Ação**: `await parseCentralImports([fileOfx, fileContas, fileOs])`.
- **Resultado Esperado**:
  - `osFiles` contém 1 item `success: true`.
  - `ofxResults` contém 1 item com `success: true` e `transactions` preenchidas.
  - `contasAPagarResults` contém 1 item com títulos a pagar.
  - Todas as demais coleções (`redeResults`, `maquininhaItems`, `mapaMetasResults`) são arrays vazios `[]`, nunca `undefined`.

### Cenário 3: Resiliência contra Arquivo Vazio ou Corrompido
- **Estado Inicial**: Usuário faz upload de arquivo vazio ou formato não reconhecido.
- **Ação**: Processar arquivo inválido.
- **Resultado Esperado**:
  - O sistema não quebra com exceção não tratada.
  - Registra mensagem de erro em `errors` ou emite aviso no toast sem interromper a execução dos demais arquivos.
