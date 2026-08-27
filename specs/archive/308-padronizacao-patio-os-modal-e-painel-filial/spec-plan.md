# Spec Plan: Padronização do Modal de OSs do Pátio e Painel de 6 Métricas da Filial (308)

## Tasks
- [x] [FRONTEND] Atualizar `src/components/conciliacao/PatioOsDetailModal.tsx`: converter os 4 KPIs para `border-l-4` canônico, padronizar toolbar de busca/filtro e refatorar tabela com `AmountCell`, badges semânticos e ações limpas.
- [x] [FRONTEND] Atualizar `src/routes/conciliacao.$lojaId.tsx`: implantar o painel executivo com as 6 métricas da filial idênticas ao card da home e padronizar as abas para estilo canônico sem fundo verde.
- [x] [FRONTEND] Atualizar `src/components/conciliacao/StoreOrdensServicoView.tsx`: converter os 4 cards superiores para `border-l-4` canônico para harmonizar a 3ª aba.
- [x] [TEST] Compilar o projeto com `node node_modules/vite/bin/vite.js build` e validar integridade.
- [x] [VISUAL-QA] Capturar screenshots das telas atualizadas e validar conformidade visual contra `patio.tsx`.\n