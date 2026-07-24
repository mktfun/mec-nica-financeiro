# 🎨 Memória Modular: Interface & UX (Frontend)

## [2026-07-23] — Feature ID: delete-and-clean-all

**Contexto:** Adicionado botão de "Limpar Todos os Dados" na tela `/importacoes` com modal de confirmação e fallback JS client para exclusão de lotes.

**Regra aprendida:**
- Para exclusões de lotes ou limpeza global de banco de dados, utilize sempre o fallback de deleção ordenada via JS Client (`conciliation_matches` → `transactions` → `patio_os` → `receivables` → `reconciliations` → `import_logs` → `import_batches`) acompanhado de `qc.clear()` para purgar imediatamente o cache do React Query no navegador.
- Botões de ações de destruição em massa devem ter cor de perigo (vermelho/danger) e exigi confirmação em modal explícito.

**Risco identificado:** Apenas invalidar queries (`invalidateQueries`) sem executar `qc.clear()` pode manter objetos cacheados na memória do navegador.

**Não fazer:** Nunca confiar exclusivamente em RPCs de deleção sem implementar um fallback JS Client resiliente.
