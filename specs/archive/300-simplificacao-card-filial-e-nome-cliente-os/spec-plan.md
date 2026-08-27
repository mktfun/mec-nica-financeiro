# Spec Plan: Simplificação do Card de Filial e Nome do Cliente na Importação de OS com Match Inteligente (300)

## Tasks

### Fase 1 — Banco de Dados & Schema
- [ ] [BACKEND] Executar migration SQL adicionando a coluna `client_name text` nas tabelas `patio_os` e `estoque_os_pendente`.
- [ ] [BACKEND] Executar script de backfill para popular o `client_name` nas OSs já importadas para as lojas do dia 26/08.

### Fase 2 — Parsers de Importação de OS
- [ ] [FRONTEND] Atualizar interface `ParsedOS` em `src/hooks/useImportProcessor.ts` e type `PatioOSRow` em `src/lib/supabase.ts` para incluir `client_name?: string | null`.
- [ ] [FRONTEND] Atualizar mapeamento de colunas em `src/hooks/useOsImportProcessor.ts` e `src/hooks/useImportProcessor.ts` para extrair a coluna `Cliente` e persistir em `patio_os`.

### Fase 3 — UI do Card de Filial (SALDO TOTAL)
- [ ] [FRONTEND] Atualizar `src/routes/conciliacao.index.tsx` para exibir apenas o label **SALDO TOTAL** e o valor colorido (verde positivo, vermelho negativo), removendo os subtextos poluídos.
- [ ] [FRONTEND] Atualizar `src/routes/conciliacao.$lojaId.tsx` para refletir o mesmo padrão limpo de **SALDO TOTAL**.

### Fase 4 — Modal de Vinculação & Match Inteligente por Nome
- [ ] [FRONTEND] Atualizar `src/hooks/useManualMatch.ts` para carregar `client_name` de `patio_os`.
- [ ] [FRONTEND] Atualizar `src/components/conciliacao/ManualMatchOsModal.tsx` para exibir o nome real do cliente na coluna `CLIENTE / PLACA` e aplicar algoritmo de pontuação com match por nome e valor no topo.

### Fase 5 — Validação e Quality Gate
- [ ] [TEST] Verificar no frontend a exibição limpa de "SALDO TOTAL" em verde/vermelho.
- [ ] [TEST] Verificar a listagem do modal com nome real do cliente e ordenação inteligente.
- [ ] [TEST] Executar `npm run build` com 100% de sucesso.
