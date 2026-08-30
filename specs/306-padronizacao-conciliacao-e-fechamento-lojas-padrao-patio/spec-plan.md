# Spec Plan: Padronização da Conciliação Diária e Fechamento por Filial no Padrão Canônico do Pátio (306)

## Tasks
- [x] [FRONTEND] Atualizar `src/routes/conciliacao.index.tsx`: envolver com `PageContainer variant="finance"`, implantar os 4 Summary Cards canônicos `border-l-4` e refatorar a lista de filiais para `<Card className="p-0 overflow-hidden mt-4">` com `divide-y` no padrão exato de `patio.tsx`.
- [x] [FRONTEND] Atualizar `src/routes/conciliacao.$lojaId.tsx`: envolver com `PageContainer variant="finance"`, remover o bloco anômalo `bg-black/25` de 6 mini-cards e implantar os 4 Summary Cards canônicos `border-l-4` da filial com abas padronizadas.
- [x] [FRONTEND] Atualizar `src/components/conciliacao/StoreCartaoMaquininhaView.tsx`: padronizar os 4 cards para `border-l-4` canônico e refatorar a tabela de vendas em cartão com `AmountCell`, semáforo estrito nos badges e layout limpo.
- [x] [FRONTEND] Atualizar `src/components/conciliacao/StoreExtratoBancarioView.tsx`: padronizar os 4 cards para `border-l-4` canônico e alinhar a barra de filtros.
- [x] [TEST] Testar compilação com `node node_modules/vite/bin/vite.js build` e validar ausência de regressão.
- [x] [VISUAL-QA] Capturar screenshots das telas `/conciliacao` e `/conciliacao/$lojaId` via Playwright para validação visual contra a referência `patio.tsx`.\n