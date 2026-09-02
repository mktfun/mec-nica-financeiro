# Spec Plan: Faturamento Assistido por Mapa de Metas e Gestão Dual de Pátio sem Import de OS (350)

## Tasks

- [x] [FRONTEND] Criar componente `src/components/importacoes/patio/PatioManualStoreGrid.tsx` com listagem de OSs por loja e chips de 1 clique para seleção de Forma de Pagamento (PIX, Crédito, Débito, Dinheiro, Boleto)
- [x] [FRONTEND] Criar componente `src/components/importacoes/patio/PatioManagementDualModal.tsx` estruturado em 2 abas (Aba 1: Baixa Manual por Filial, Aba 2: Importação por Imagem / OCR) no padrão Dark UI Zinc-950
- [x] [FRONTEND] Criar componente `src/components/importacoes/wizard/AssistedRevenueCalculator.tsx` para o cálculo automático no Step 3: `(Faturamento Ant. - Faturamento Mês Ant.) + Faturamento Metas`
- [x] [FRONTEND] Adaptar `src/components/importacoes/CentralImportWizard.tsx`:
  - [x] Integrar o novo `<PatioManagementDualModal />` no fluxo
  - [x] Renderizar condicionalmente o `<AssistedRevenueCalculator />` no Step 3 apenas quando `results.osFiles.length === 0`
- [x] [TEST] Validar compilação limpa (`npm run build`)
- [x] [TEST] Executar Cenário 1 (Fechamento sem OS com Mapa de Metas e Baixa de Pagamento por chip) e Cenário 2 (Fechamento normal com OS intacto)
