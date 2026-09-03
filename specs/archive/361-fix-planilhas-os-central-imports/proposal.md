# Proposal: Correção de Processamento de Planilhas de OS e Motor Central de Imports (361-fix-planilhas-os-central-imports)

## Problema
Ao fazer upload de planilhas de OS (.xls / .xlsx no padrão `ConferenciaOSxFinanceiro`) na Fase 1 do Fechamento Manual (`Fase1PatioOsReview.tsx`), a aplicação quebra imediatamente no console com o erro:
`TypeError: Cannot read properties of undefined (reading 'filter')`

### Causa Raiz
1. O arquivo `src/lib/parsers/centralImportManager.ts` foi mantido como um stub incompleto de apenas 12 linhas, retornando `{ validData: [], errors: [] }` e aceitando apenas um único `File`.
2. Em `Fase1PatioOsReview.tsx`, a dropzone passa `acceptedFiles` para `parseCentralImports` e executa:
   `const osResults = parseResult.osFiles.filter(r => r.success);`
   Como `parseResult.osFiles` é `undefined`, o método `.filter` explode.
3. Esse mesmo erro fatal está armado em cascata em todas as 4 fases do fechamento manual:
   - **Fase 2 (`Fase2RedeVsOsReview.tsx`)**: `parseResult.redeResults.filter(r => r.success)` — `redeResults` indefinido.
   - **Fase 3 (`Fase3OfxReconciliation.tsx`)**: `parseResult.ofxResults.filter(r => r.success)` — `ofxResults` indefinido. Além disso, `OfxParseResult` do parser nativo não possui a chave `success` nem `storeAlias`/`accountKey`, descartando 100% dos extratos.
   - **Fase 4 (`Fase4ContasVsSaidasReview.tsx`)**: `parseResult.contasAPagarResults.filter(r => r.success)` — diverge da chave `contasPagarResults` usada no restante do sistema.
   - **Auditoria Final (`Step4FinalAuditAndClose.tsx`)**: Acessa `results?.osFiles`, `results?.ofxResults`, etc., que estavam ausentes da interface `CentralImportResults`.
4. Em `Fase1PatioOsReview.tsx`, os valores dos meios de pagamento para a RPC `batch_upsert_patio_os` estão sendo lidos como `os.credit_value`, `os.debit_value`, etc., enquanto a tipagem `ParsedOS` expõe `parsed_credit`, `parsed_debit`, `parsed_pix_transfer`, `parsed_cash`. Isso faz com que os valores cheguem zerados ao banco de dados.

## Solução Proposta
1. **Implementar o motor real em `src/lib/parsers/centralImportManager.ts`:**
   - Suportar tanto `File[]` quanto `File` individual.
   - Roteamento inteligente de tipos de arquivo:
     - `.ofx` / `.ret` -> `parseOFXFile`
     - `.pdf` -> `parseMapaMetasPDF`
     - `.xlsx` / `.xls` / `.csv`:
       - Se nome contém `contas` ou `pagar` -> `parseContasAPagarFile`
       - Se é relatório de vendas ou conciliação Rede -> `parseRedeFile`
       - Se é planilha de conferência de OS (`ConferenciaOSxFinanceiro` ou colunas de OS) -> `processOsFiles`
       - Fallback secundário para Contas a Pagar
       - Fallback para Maquininha Genérica
   - Retornar um objeto canônico `CentralImportResults` garantindo que **nenhuma coleção seja undefined** (todos arrays inicializados como `[]`).
   - Normalizar extratos OFX injetando `success: true`, `storeAlias: r.alias` e `accountKey: r.alias`.
   - Prover compatibilidade dual para Contas a Pagar (`contasPagarResults` e `contasAPagarResults`) e normalizar campos de cada título (`storeName: b.store_name || b.storeName`, `dueDate: b.due_date || b.dueDate`).

2. **Reutilização e Herança em `src/hooks/useCentralImport.ts`:**
   - Desacoplar o loop de parsing puro, delegando a execução dos arquivos para `parseCentralImports`.
   - Manter no hook apenas a lógica reativa do React e o enriquecimento de banco (`delta_paid`, `is_new_os`).

3. **Blindagem Defensiva em todas as Fases do Fechamento Manual:**
   - `Fase1PatioOsReview.tsx`: Usar `(parseResult?.osFiles || []).filter(...)` e corrigir o mapeamento de valores de pagamento (`os.credit_value ?? os.parsed_credit ?? 0`).
   - `Fase2RedeVsOsReview.tsx`: Usar `(parseResult?.redeResults || []).filter(...)`.
   - `Fase3OfxReconciliation.tsx`: Usar `(parseResult?.ofxResults || []).filter(...)`.
   - `Fase4ContasVsSaidasReview.tsx`: Usar `(parseResult?.contasAPagarResults || parseResult?.contasPagarResults || []).filter(...)`.

## Contratos de Dados
- Nenhuma alteração estrutural no PostgreSQL ou migrations é necessária.
- Utilização da RPC existente:
  `public.batch_upsert_patio_os(p_store_id TEXT, p_target_date DATE, p_os_records JSONB)`

## API / Interface
Expansão e consolidação do contrato em `src/lib/parsers/centralImportManager.ts`:
```typescript
export interface CentralImportResults {
  osFiles: OsImportResult[];
  redeResults: RedeResult[];
  ofxResults: (OfxParseResult & { success: boolean; storeAlias?: string; accountKey?: string })[];
  contasPagarResults: ContasAPagarParseResult[];
  contasAPagarResults: ContasAPagarParseResult[];
  maquininhaItems: MaquininhaItem[];
  mapaMetasResults: MapaMetasResult[];
  validData: any[];
  errors: string[];
}

export async function parseCentralImports(
  files: File | File[],
  options?: { sessionId?: string }
): Promise<CentralImportResults>;
```

## Features Existentes Impactadas
- `src/components/importacoes/manual/Fase1PatioOsReview.tsx` (Ingestão de OSs do Pátio)
- `src/components/importacoes/manual/Fase2RedeVsOsReview.tsx` (Ingestão de Cartões Rede)
- `src/components/importacoes/manual/Fase3OfxReconciliation.tsx` (Ingestão de Extratos OFX)
- `src/components/importacoes/manual/Fase4ContasVsSaidasReview.tsx` (Ingestão de Contas a Pagar)
- `src/components/importacoes/wizard/Step4FinalAuditAndClose.tsx` (Auditoria Final de Importação)
- `src/hooks/useCentralImport.ts` (Wizard Guiado de Importação Central)

## Risco Principal
**Risco:** Falsos negativos ou descarte silencioso de arquivos durante a categorização automática na dropzone (ex: OFX não possuir a flag `success` esperada pelo componente, ou planilha de OS ter pequenas variações no cabeçalho).
**Mitigação:**
1. A função `parseCentralImports` normaliza explicitamente cada resultado (injetando `success: true` para OFX válidos com transações).
2. O parser de OS (`processOsFiles`) já possui heurísticas consolidadas e testadas contra planilhas reais (`1543_ConferenciaOSxFinanceiro.xls`).
3. Todos os componentes consumidores utilizam arrays de fallback (`|| []`) garantindo que nenhum erro em tempo de execução (`TypeError`) aconteça.
