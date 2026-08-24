# Spec Plan: Tabela Unificada de OSs no Preview com Filtros Rápidos e Edição Livre (263)

## Tasks

- [x] [FRONTEND] Implementar o hook unificado `allPreviewOsList` no `CentralImportWizard.tsx` consolidando OSs importadas (`results.osFiles`) e OSs ausentes (`missingOsList`).
- [x] [FRONTEND] Criar o handler universal `updateOsRow` que permite editar livremente `total_value`, `paid_value` e `status` tanto para OSs da planilha quanto para OSs ausentes do banco.
- [x] [FRONTEND] Implementar pílulas de filtro rápido no topo da tabela (`Todas as OSs`, `Ausentes no Relatório`, `Recebimentos do Dia`, `Estoque em Pátio`), busca textual e seletor de loja.
- [x] [FRONTEND] Renderizar a tabela interativa completa no Step 3 com inputs inline, badges de origem/editado e paginação de 50 itens.
- [x] [TEST] Executar `cmd /c "npm run build"` para validar integridade e ausência de erros de tipos.
- [x] [TEST] Verificar que todas as 293 OSs aparecem na tabela e os filtros rápidos funcionam perfeitamente.

