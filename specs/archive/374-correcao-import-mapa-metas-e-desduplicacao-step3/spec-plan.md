# Spec Plan: Correção de Ingestão do Mapa de Metas (PDF) e Desduplicação de OSs no Step 3 (374)

## Tasks

- [x] [PARSER] Reestruturar `src/lib/parsers/mapaMetasParser.ts` com agrupamento de linhas por coordenada Y, extração da data do relatório, filiais individuais e rodapé de totais da holding (Total Acumulado = R$ 170.092,47, Previsão, Mês Anterior e Meta)
  *Critério de verificação: Teste unitário/parse com o layout do PDF extrai `totalFaturamento === 170092.47` e lista de filiais com seus respectivos faturamentos.*

- [x] [FRONTEND] Atualizar `useCentralImport.ts` e contratos de tipos para expor todos os campos estruturados de `MapaMetasResult` (`targetDate`, `totalMesAnterior`, `totalPrevisao`, `totalMeta`, etc.)
  *Critério de verificação: TypeScript compila sem erros de tipos e objetos de resultado mantêm integridade.*

- [x] [FRONTEND] Remover a renderização duplicada de `<MissingPatioOsEditor />` no Step 3 de `src/components/importacoes/CentralImportWizard.tsx` (linhas 3118-3126), mantendo o botão do cabeçalho como atalho seguro para o Step 2.5
  *Critério de verificação: Step 3 não renderiza tabela de OSs ausentes duplicada abaixo de Receitas Extras e exibe layout limpo.*

- [x] [FRONTEND] Conectar auto-preenchimento reativo de `odometroHoje` e `manualFaturamentoMesAnterior` no Step 3 quando `results.mapaMetasResults` for detectado, adicionando chip indicativo de origem automática
  *Critério de verificação: Ao importar Mapa de Metas, o input Odômetro OI é populado automaticamente com R$ 170.092,47 e exibe badge de faturamento do PDF.*

- [x] [FRONTEND] Ajustar transição do Step 2 para avançar diretamente ao Step 3 quando não existirem OSs ausentes (`missingOsList.length === 0`), mantendo avanço para o Step 2.5 quando houver pendências
  *Critério de verificação: Se não houver OSs ausentes, não exibe tela vazia de Step 2.5; se houver, exibe Step 2.5 normalmente.*

- [x] [TEST] Executar build completo (`npm run build` / `bun run build`) e validar integridade estática e ausência de regressões em imports
  *Critério de verificação: Build passa com exit code 0.*
