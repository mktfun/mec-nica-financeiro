# Design: Correção de OSs Rejeitadas e Modo "Apenas Fora do Relatório" (362)

## Arquitetura e Fluxo de Dados

```
  [Upload na Dropzone: Fase1PatioOsReview.tsx]
                     │
                     ▼
        [parseCentralImports (centralImportManager.ts)]
                     │
                     ▼
          [processOsFiles (useOsImportProcessor.ts)]
          - Busca cabeçalho até linha 60
          - Matching tolerante: OS / N° OS / Ordem de Serviço
          - Matching tolerante: Status / Situação
          - Extração de StoreAlias (Planalto / BRASICAR / Rei do Módulo)
                     │
                     ▼
          [Resolução de StoreId (useStoreFileMappings.ts)]
          - 'BRASICAR' -> 'st-06' (Planalto)
          - 'Rei do Módulo' -> 'st-09' (Rei do Módulo)
                     │
                     ▼
    [Geração de importedOsKeys no Fase1PatioOsReview.tsx]
    - Set<"${store_id}_${os_number}">
    - Mesclagem com OSs ativas do banco (patio_os)
    - Cada item recebe isMissingFromReport: boolean
                     │
                     ▼
       [Renderização: PatioExcelStoreAccordion.tsx]
       - Segmented Control: [⚠️ Apenas Fora do Relatório] vs [📋 Todas as OSs]
       - Por Filial: Se todas vieram no relatório -> Empty State elegante
       - Linhas fora do relatório: Botões rápidos "Dar Baixa" / "Manter no Pátio"
                     │
                     ▼
    [handleSaveChanges -> RPC public.batch_upsert_patio_os]
    - Salva todas as OSs com isModified: true no PostgreSQL
```

---

## Interfaces TypeScript

```typescript
// Em src/components/importacoes/patio/PatioExcelStoreAccordion.tsx

export type PatioFilterMode = 'outside_report' | 'all';

export interface EditablePatioOsItem {
  id: string;
  os_number: string;
  store_id: string;
  store_name: string;
  client_name: string;
  plate: string;
  total_value: number;
  paid_value: number;
  pending_value: number;
  days_open: number;
  opened_at: string;
  status: 'em_aberto' | 'pago_parcial' | 'finalizada' | 'cancelada';
  payment_method: PaymentMethodOption;
  debit_value?: number;
  credit_value?: number;
  pix_transfer_value?: number;
  cash_value?: number;
  isModified?: boolean;
  isNewManual?: boolean;
  isMissingFromReport?: boolean;
  isFromReport?: boolean;
}

export interface PatioExcelStoreAccordionProps {
  stores: StoreRow[];
  osItems: EditablePatioOsItem[];
  onChangeItem: (id: string, updates: Partial<EditablePatioOsItem>) => void;
  onAddManualOs: (storeId: string, os: Partial<EditablePatioOsItem>) => void;
  onRemoveManualOs?: (id: string) => void;
  targetDate: string;
  selectedStoreId?: string;
  onSelectStore?: (storeId: string) => void;
  hasReportImported?: boolean;
  defaultFilterMode?: PatioFilterMode;
}
```

---

## Mutações em Arquivos Existentes [MODIFY]

### 1. `src/hooks/useOsImportProcessor.ts` [MODIFY]
- **Linha 80**: Aumentar varredura de cabeçalho:
  ```typescript
  for (let i = 0; i < Math.min(60, data.length); i++)
  ```
- **Linha 84**: Flexibilizar detecção de colunas de cabeçalho usando regex tolerante:
  ```typescript
  const hasOsCol = rowStr.some(c => /^(os|n[ºo°.]?\s*os|n[ºo°.]?\s*da\s*os|n[úu]mero\s*(?:da\s*)?os|ordem\s*de\s*servi[çc]o|c[óo]d(?:igo)?(?:\s*os)?)$/i.test(c));
  const hasStatusCol = rowStr.some(c => /^(status|situa[çc][ãa]o|sit\b|estado|fase)$/i.test(c));
  if (hasOsCol && hasStatusCol) {
    headerRowIndex = i;
    ...
  }
  ```
- **Normalização de Nomes de Colunas**: Remover pontuações e acentos ao comparar (`c.replace(/[^\w]/g, '').toLowerCase()`) para cobrir `Vlr. Total`, `Vl. Total`, `Total (R$)`, etc.
- **Store Alias Extraction**: Tratar nomes com hífen (`Planalto - BRASICAR`, `Rei do Módulo - MP`).

### 2. `src/hooks/useStoreFileMappings.ts` & `src/lib/parsers/storeMapping.ts` [MODIFY]
- Adicionar ao `KNOWN_ACCOUNT_DEFAULTS`:
  - `'BRASICAR': 'st-06'`
  - `'brasicar': 'st-06'`
  - `'Planalto (BRASICAR)': 'st-06'`
  - `'Mecanica Brasicar': 'st-06'`
  - `'06 - PLANALTO': 'st-06'`
  - `'Rei do Módulo': 'st-09'`
  - `'Rei do Modulo': 'st-09'`
  - `'REI DO MODULO': 'st-09'`
  - `'Mecanica Rei do Modulo': 'st-09'`
  - `'09 - REI DO MODULO': 'st-09'`
- Precedência de matching: termos específicos antes de siglas curtas.

### 3. `src/lib/parsers/centralImportManager.ts` [MODIFY]
- Preservar a mensagem de erro específica caso o arquivo seja uma planilha de OS (`processOsFiles` falhou), repassando para `results.errors`.

### 4. `src/components/importacoes/manual/Fase1PatioOsReview.tsx` [MODIFY]
- Armazenar `importedOsKeys: Set<string>` ao processar os arquivos no `onDrop`.
- Ao carregar OSs no `loadPatioOs`, marcar cada item com `isMissingFromReport = !importedOsKeys.has(...)` e `isFromReport = importedOsKeys.has(...)`.
- Passar `hasReportImported = importedOsKeys.size > 0` para o accordion.

### 5. `src/components/importacoes/patio/PatioExcelStoreAccordion.tsx` [MODIFY]
- Adicionar estado `filterMode: PatioFilterMode` (inicia em `'outside_report'` se houver itens fora do relatório; caso contrário, `'all'`).
- Inserir Segmented Control no topo da toolbar:
  - `[⚠️ Apenas Fora do Relatório (X)]`
  - `[📋 Todas as OSs (Y)]`
- Na sanfona da filial:
  - Se `filterMode === 'outside_report'` e não houver itens ausentes: exibir Empty State informativo.
  - Nas linhas de OS ausente: exibir badge âmbar e botões rápidos de ação ("Dar Baixa" / "Manter no Pátio").
- Preservar os cálculos de métricas globais e por loja sobre a lista completa de `osItems`.

---

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)

### Cenário 1: Ingestão de OS de Planalto - BRASICAR e Rei do Módulo
- **Estado Inicial**: Arquivo com cabeçalho na linha 25 e coluna nomeada como `Situação` e loja `BRASICAR`.
- **Ação**: Importar via dropzone da Fase 1.
- **Resultado Esperado**:
  - Arquivo aceito com sucesso sem cair em erro genérico.
  - OSs atribuídas corretamente à loja `st-06` (Planalto - BRASICAR) e `st-09` (Rei do Módulo).
  - Valores da filial exibem os totais corretos (não R$ 0,00).

### Cenário 2: Modo "Apenas Fora do Relatório" e Edição Manual
- **Estado Inicial**: 20 OSs vieram no relatório importado, e 2 OSs antigas em aberto existiam no banco.
- **Ação**: Visualizar a filial no modo "Apenas Fora do Relatório".
- **Resultado Esperado**:
  - Apenas as 2 OSs que não vieram no relatório aparecem na tabela.
  - O operador clica em "Dar Baixa" em uma delas.
  - O status muda para "finalizada", o valor pago iguala ao total e `isModified` fica `true`.
  - Ao alternar para "Todas as OSs", todas as 22 OSs aparecem, com a OS modificada atualizada.
  - Ao clicar em "Salvar Alterações", a RPC `batch_upsert_patio_os` é disparada com sucesso.
