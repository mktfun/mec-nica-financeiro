# Spec Plan: Correção de Processamento de Planilhas de OS e Motor Central de Imports (361-fix-planilhas-os-central-imports)

## Tasks

- [x] [FRONTEND] Implementar motor canônico e tipos em `src/lib/parsers/centralImportManager.ts`:
  - [x] Declarar a interface canônica `CentralImportResults` com garantia de coleções não-nulas (`[]`).
  - [x] Implementar a função pura `parseCentralImports(files: File | File[], options?: { sessionId?: string })`.
  - [x] Integrar parsers: `processOsFiles`, `parseRedeFile`, `parseOFXFile`, `parseContasAPagarFile`, `parseMapaMetasPDF`.
  - [x] Normalizar OFX (`success: true`, `storeAlias`, `accountKey`) e Contas a Pagar (`contasPagarResults` + `contasAPagarResults`).

- [x] [FRONTEND] Refatorar `src/hooks/useCentralImport.ts` para herdar/reutilizar `parseCentralImports`:
  - [x] Delegar a leitura pura de arquivos para `parseCentralImports`.
  - [x] Manter e integrar a hidratação no banco (`delta_paid` e `is_new_os`).

- [x] [FRONTEND] Corrigir e blindar `src/components/importacoes/manual/Fase1PatioOsReview.tsx`:
  - [x] Usar guarda defensiva `(parseResult?.osFiles || []).filter(r => r.success)`.
  - [x] Corrigir mapeamento dos meios de pagamento para a RPC `batch_upsert_patio_os` (`os.credit_value ?? os.parsed_credit ?? 0`, `os.debit_value ?? os.parsed_debit ?? 0`, `os.pix_transfer_value ?? os.parsed_pix_transfer ?? 0`, `os.cash_value ?? os.parsed_cash ?? 0`).

- [x] [FRONTEND] Blindar defensivamente `Fase2RedeVsOsReview.tsx`, `Fase3OfxReconciliation.tsx` e `Fase4ContasVsSaidasReview.tsx`:
  - [x] Fase 2: `(parseResult?.redeResults || []).filter(r => r.success)`.
  - [x] Fase 3: `(parseResult?.ofxResults || []).filter(r => r.success)`.
  - [x] Fase 4: `(parseResult?.contasAPagarResults || parseResult?.contasPagarResults || []).filter(r => r.success)` e normalização de atributos `b.storeName` e `b.dueDate`.

- [x] [FRONTEND] Ajustar compatibilidade em `src/components/importacoes/wizard/Step4FinalAuditAndClose.tsx`:
  - [x] Garantir que o consumo de `results?.osFiles`, `results?.ofxResults`, etc., esteja perfeitamente alinhado com `CentralImportResults`.

- [x] [TEST] Executar build (`bun run build` ou `npm run build`) e typecheck (`tsc --noEmit`):
  - [x] Validar que não há erros de tipagem TypeScript nos módulos modificados.

- [x] [TEST] Verificação com a planilha real `1543_ConferenciaOSxFinanceiro.xls`:
  - [x] Validar extração de dados (38 OSs identificadas com sucesso) e ausência do erro de `.filter`.
