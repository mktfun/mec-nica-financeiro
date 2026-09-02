# Proposal: Fluxo Seamless de Transição Automática para OCR e Injeção no Pipeline (Feature 347)

## Problema
Atualmente, no Wizard de Importação (`CentralImportWizard.tsx`), a esteira de OCR existe como um modal desacoplado que exige que o operador clique manualmente em um botão avulso. Quando o operador faz o upload dos arquivos normais (OFX, Rede, Contas a Pagar) na virada de mês (onde não existe relatório .xls de OSs), o sistema fica esperando ou exige cliques extras fora da esteira principal.

O usuário solicitou que o fluxo seja **100% contínuo e transparente (Seamless)**:
1. O operador solta os arquivos normais (OFX, Rede, Contas) no Dropzone do Step 1.
2. O sistema detecta automaticamente que `results.osFiles.length === 0` (ausência de planilha de OSs do ERP).
3. O Wizard transiciona **automaticamente** para a etapa de Ingestão de Prints OCR (com o Guia Ativo de Cobrança por Loja e área de `Ctrl+V`).
4. Ao colar/soltar os prints e clicar em "Salvar e Continuar", as OSs extraídas são convertidas sinteticamente em `results.osFiles` (idênticas a um `.xls` real).
5. O Wizard avança **automaticamente** para o Step 2 (Mapeamento) / Step 3 (Inputs Manuais & Preview) $\to$ Step 4 $\to$ Step 5 $\to$ Step 6 $\to$ Step 7, seguindo todo o fluxo padrão como se o arquivo .xls tivesse sido importado desde o início.

---

## Solução Proposta (Foco em Reuso e Transição Seamless)

1. **Conversor Sintético de OS (`convertOcrItemsToOsFiles`)**:
   - Reutiliza a função de transformação para converter `ExtractedOcrOsItem[]` do Mistral Vision em `OsImportResult[]` (`results.osFiles`), populando `osArray`, `receivablesArray`, `parsed_debit`, `parsed_credit`, `parsed_pix_transfer`, `parsed_cash`, `days_open` e `delta_paid`.
2. **Auto-Roteamento de Etapa no `CentralImportWizard.tsx`**:
   - No `processFiles`: se `parsedResults.osFiles.length === 0` e existirem outros arquivos válidos (OFX/Rede/Contas), define `step = 1.5` (`STEP_OCR_INGESTION`) automaticamente.
   - Embutir a visualização do Guia Ativo de Cobrança diretamente na esteira do Wizard (ou abrir em tela cheia com botão de avançar).
   - Ao concluir o OCR, injeta em `results.osFiles`, auto-preenche o `mapping` das lojas identificadas e avança para `step = 2` (Mapeamento) / `step = 3` (Inputs Manuais).

---

## Investigação e Análise de Reuso (Relatório dos Subagentes)

- **Estruturas Existentes Reutilizadas:**
  - `src/hooks/useCentralImport.ts`: Reutilizado sem duplicar o estado global `UnifiedImportResult`.
  - `src/hooks/useOsImportProcessor.ts`: Reutilizado o contrato `OsImportResult` e `ParsedOS`.
  - `src/hooks/useOcrOsProcessor.ts`: Reutilizada a fila assíncrona Mistral Vision (Pixtral-12B JSON Mode).
  - `src/components/importacoes/OcrBatchStoreCarryoverList.tsx` e `OcrBatchReviewGrid.tsx`: Reutilizados como componentes visuais embutidos da etapa de OCR.
  - `src/lib/matchers/autoMatchingEngine.ts`: Reutilizado sem modificação, consumindo `results.osFiles` gerado pelo conversor.

---

## Contratos de Dados TypeScript

```typescript
export interface ConvertOcrOptions {
  targetDate?: string;
  defaultStoreAlias?: string;
  queryDbForDelta?: boolean;
}

export function convertOcrItemsToOsFiles(
  ocrItems: ExtractedOcrOsItem[],
  options?: ConvertOcrOptions
): OsImportResult[];
```

---

## Mutações em Arquivos Existentes `[MODIFY]`

- `[NEW] src/lib/parsers/ocrOsAdapter.ts`: Função pura `convertOcrItemsToOsFiles` para converter `ExtractedOcrOsItem[]` em `OsImportResult[]`.
- `[MODIFY] src/components/importacoes/CentralImportWizard.tsx`: 
  - Adição da etapa `step === 1.5` (ou transição direta para a ingestão visual quando `osFiles.length === 0`).
  - Função `handleOcrCompleted(extractedItems)` que injeta em `results.osFiles`, atualiza o `mapping` e avança o Wizard.
  - Remoção de botões desconexos fora do fluxo linear.

---

## Risco Principal e Mitigação
- **Risco:** Perda de arquivos OFX/Rede parseados anteriormente durante a injeção das OSs do OCR.
- **Mitigação:** Injeção não-destrutiva em `results` via `setResults(prev => ({ ...prev, osFiles: convertedOsFiles }))`.
