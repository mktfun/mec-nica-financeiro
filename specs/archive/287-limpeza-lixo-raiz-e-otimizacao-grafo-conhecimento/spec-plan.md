# Spec Plan: Limpeza de Lixo da Raiz, Configuração de .graphifyignore e Otimização do Grafo (287)

## Tasks

- [x] [CLEANUP] Remover arquivos temporários, dumps e screenshots descartáveis da raiz do repositório
- [x] [CONFIG] Criar e configurar arquivo `.graphifyignore` para ignorar specs arquivadas, caches e artefatos de build
- [x] [GRAPHIFY] Executar re-extração do grafo com `graphify extract . --force`
- [x] [TEST] Executar `npm run build` para garantir que nenhum arquivo essencial foi afetado
- [x] [TEST] Validar o novo `graph.html` e relatório `GRAPH_REPORT.md`
