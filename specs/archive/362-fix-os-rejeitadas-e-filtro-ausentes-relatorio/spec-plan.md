# Spec Plan: Correção de OSs Rejeitadas e Modo "Apenas Fora do Relatório" (362)

## Tasks

- [x] [FRONTEND] Robustecer detecção de cabeçalho e colunas em `src/hooks/useOsImportProcessor.ts`:
  - [x] Aumentar limite de busca de cabeçalho para 60 linhas (`Math.min(60, data.length)`).
  - [x] Implementar regex tolerante para coluna de OS (`os|n[ºo°.]?\s*os|ordem\s*de\s*servi[çc]o|c[óo]digo`).
  - [x] Implementar regex tolerante para coluna de Situação/Status (`status|situa[çc][ãa]o|sit|estado|fase`).
  - [x] Normalizar matching de nomes de colunas de valores (`Vlr. Total`, `Vl. Total`, `Valor (R$)`).
  - [x] Flexibilizar extração de `storeAlias` para nomes com hífen (`BRASICAR`, `Planalto`, `Rei do Módulo`).

- [x] [FRONTEND] Enriquecer dicionário de aliases em `src/hooks/useStoreFileMappings.ts` e `src/lib/parsers/storeMapping.ts`:
  - [x] Adicionar variantes de Planalto (`BRASICAR`, `brasicar`, `Planalto (BRASICAR)`, `Mecanica Brasicar`, `06 - PLANALTO`).
  - [x] Adicionar variantes de Rei do Módulo (`Rei do Módulo`, `Rei do Modulo`, `REI DO MODULO`, `Mecanica Rei do Modulo`, `09 - REI DO MODULO`).
  - [x] Garantir precedência de termos compostos antes de siglas genéricas.

- [x] [FRONTEND] Melhorar rastreabilidade de erro em `src/lib/parsers/centralImportManager.ts`:
  - [x] Registrar o erro real do parser de OS em `results.errors` quando a planilha falhar no parsing de OS.

- [x] [FRONTEND] Atualizar marcação de OSs em `src/components/importacoes/manual/Fase1PatioOsReview.tsx`:
  - [x] Ajustar `loadPatioOs` para carregar OSs abertas na data E passivo ativo em pátio (`status.ilike.%aberto%,status.ilike.%parcial%,status.ilike.%pendente%`).
  - [x] Armazenar `importedOsKeys: Set<string>` para identificar ordens que vieram no relatório da sessão.
  - [x] Marcar itens com `isMissingFromReport: !importedOsKeys.has(...)` e `isFromReport: importedOsKeys.has(...)`.
  - [x] Passar indicadores para o `PatioExcelStoreAccordion`.

- [x] [FRONTEND] Implementar modo "Apenas Fora do Relatório" em `src/components/importacoes/patio/PatioExcelStoreAccordion.tsx`:
  - [x] Adicionar estado `filterMode: 'outside_report' | 'all'` com Segmented Control na toolbar.
  - [x] Renderizar badge de contagem de OSs fora do relatório no header da loja.
  - [x] No modo "Apenas Fora do Relatório", exibir apenas ordens ausentes por filial.
  - [x] Exibir Empty State amigável quando todas as OSs da filial vierem no relatório.
  - [x] Adicionar botões de ação rápida nas linhas ("Dar Baixa" / "Manter no Pátio").
  - [x] Garantir que os totalizadores globais e de loja continuem somando todas as OSs.

- [x] [TEST] Validação e Build:
  - [x] Executar typecheck e build (`bun run build`).
  - [x] Testar ingestão de planilha com cabeçalho em linha posterior e variações de cabeçalho.
