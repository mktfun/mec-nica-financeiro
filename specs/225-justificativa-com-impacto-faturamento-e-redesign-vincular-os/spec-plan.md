# Spec Plan: Justificativa com Controle de Faturamento e Redesign do Modal de Vincular OS (225)

## Tasks

- [ ] [FRONTEND/COMPONENTS] Atualizar `OrphanCategorizationModal.tsx` com opção visual de "Somar ao Faturamento" vs "Apenas Conciliar (Não somar)".
- [ ] [BACKEND/HOOKS] Atualizar `useCategorizeOrphan.ts` para salvar `impacts_revenue: boolean` no Supabase (`transactions` e `ofx_transactions`).
- [ ] [FRONTEND/HOOKS] Atualizar `useJustifiedTransactions.ts` para computar apenas as justificativas com `impacts_revenue !== false` no Faturamento Atual.
- [ ] [FRONTEND/COMPONENTS] Redesenhar completamente `ManualMatchOsModal.tsx`:
  - Desduplicação estrita de OSs por `os_number`.
  - Destaque em verde luminoso para Match Exato de Valor.
  - Botão largo e claro `Vincular a esta OS`.
  - Ordenação por proximidade de valor.
- [ ] [DATABASE/RESET] Executar script para limpar/reverter justificativas dos testes anteriores.
- [ ] [QUALITY/GATE] Executar `cmd.exe /c "npm run build"` garantindo 0 erros de compilação.
- [ ] [VERIFY] Validar a nova interface e controle de faturamento.
