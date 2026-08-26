# Spec Plan: Preservação Total de Transações OFX e Herança de Conciliações Anteriores/Posteriores (291)

## Tasks

### Fase 1 — Importação Sem Cortes e Consulta Histórica
- [x] [FRONTEND] Garantir que `ofxParser.ts` e `CentralImportWizard.tsx` não descartem nenhuma transação de finais de semana ou feriados
- [x] [FRONTEND] Implementar consulta/herança de justificativas e vínculos históricos de qualquer data contábil anterior ou posterior (`useHistoricalReconciledTransactions`)

### Fase 2 — Trava de Segurança e UI Nativa no Extrato (StoreExtratoBancarioView)
- [x] [FRONTEND] Detectar transações já conciliadas em outras datas (`isLockedFromOtherDate`)
- [x] [FRONTEND] Renderizar badge nativo `🔒 Conciliado em DD/MM/AAAA: [Motivo/OS]` com ícone de Lock
- [x] [FRONTEND] Bloquear ações de edição/desvinculação para transações já homologadas em outros fechamentos
- [x] [FRONTEND] Adicionar botão de filtro `[ 🔒 Outras Conciliações (N) ]` na barra de filtros do extrato

### Fase 3 — Validação e Quality Gate
- [x] [TEST] Testar cenário de final de semana/feriado com transações de múltiplas datas (`test_spec291_historical.js`)
- [x] [TEST] Executar `npm run build` para garantir ausência de erros TypeScript
