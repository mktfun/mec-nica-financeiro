# Spec Plan: Faturamento Assistido sem OS e Correção de Incongruências no Pátio / Frontend (357)

## Tasks

- [x] [FRONTEND] Ajustar `AssistedRevenueCalculator.tsx` para layout Dark UI Zinc-950 com os 3 inputs da fórmula `(Concil. Anterior - Mês Anterior) + Metas = Faturamento Atual` e botão de aplicação
- [x] [FRONTEND] Conectar `AssistedRevenueCalculator` no Step 3 de `CentralImportWizard.tsx` sob guarda estrita `results.osFiles.length === 0` e persistir `faturamento_mes_anterior` no metadata
- [x] [FRONTEND] Corrigir a formatação de `Contas a Pagar` em `CentralImportWizard.tsx` para eliminar ponto flutuante quebrado (`toFixed(2)`)
- [x] [FRONTEND] Implementar `sanitizeOsNumber` e deduplicação em `useOcrOsProcessor.ts` para eliminar `601Fatura` e OSs duplicadas entre lojas
- [x] [FRONTEND] Conectar o pátio manual (`PatioExcelStoreAccordion`) para injetar os itens em `results.osFiles` ao avançar do Step 1.5
- [x] [TEST] Executar `npm run build` e validar fluxo sem OS vs fluxo com OS
