# Spec Plan 201: Refatoração de Configurações e Consolidação de Custos no Financeiro

- [x] 1. **Revisão e Validação de Schema (Supabase)**:
  - [x] 1.1 Garantir que as colunas de rateio e canais na tabela `stores` (`pedidos_mesa`, `pedidos_ifood`, `pedidos_99`, `pedidos_keeta`, `custo_fixo_salao`, `custo_fixo_delivery`) e na tabela `products` (`packaging_cost`, `price_ifood`, `price_99`, `price_keeta`) estão íntegras.

- [x] 2. **Refatoração de Configurações (`src/routes/configuracoes.tsx`)**:
  - [x] 2.1 Organizar os inputs em cartões semânticos e limpos (Estrutura Geral, Rateio Salão vs. Delivery, Taxas e Margens).
  - [x] 2.2 Garantir persistência reativa com feedback no `onBlur` sem causar perda de foco ou travamentos.

- [x] 3. **Consolidação Matemática e Visual no Financeiro (`src/routes/financeiro.tsx`)**:
  - [x] 3.1 Exibir a composição de custo total unificada por prato: `CMV` + `Custo Fixo Rateado` + `Embalagem` = `Custo Total`.
  - [x] 3.2 Aplicar markup divisor matemático exato para Preços Sugeridos (Mesa, iFood, 99, Keeta) baseado no Custo Total e nas alíquotas reais de cada canal.
  - [x] 3.3 Calcular margens líquidas reais no Simulador de Preços Praticados com badges de status de lucratividade.

- [x] 4. **Sincronização da Exportação Excel (`handleExportExcel`)**:
  - [x] 4.1 Atualizar a rotina de exportação do `exceljs` para gerar as colunas de Custo Total e Margens idênticas às exibidas na tela.

- [x] 5. **Validação & QA**:
  - [x] 5.1 Executar `npm run build` para garantir zero erros de TypeScript.
  - [x] 5.2 Testar cenários de cálculo com e sem volume de pedidos.
