# Spec Plan: Correção de Justificativas e Redesign do Card de Diferença Final (220)

## Tasks

- [ ] [FRONTEND/HOOKS] Refatorar `src/hooks/useJustifiedTransactions.ts`:
  - Ler da tabela `transactions` unificada (com campos reais `title`, `amount`, `manual_category`, `manual_justification`, `target_date`, `store_id`).
  - Suportar fallback de `ofx_transactions` (usando `bank_name`/`counterpart_name` em vez de `title`) e `pos_transactions`.
  - Capturar transações com `manual_category` preenchida ou `manual_justification` preenchida.
  - Deduplicar por `id` único.
- [ ] [FRONTEND/HOOKS] Atualizar `src/hooks/useCategorizeOrphan.ts` para sincronizar `transactions` junto com `ofx_transactions` e `pos_transactions`.
- [ ] [FRONTEND/COMPONENTS] Redesenhar o card de **Diferença Final** em `src/components/conciliacao/ResumoDiaPanel.tsx` com layout equilibrado, tipografia imponente e espaçamentos simétricos.
- [ ] [QUALITY/GATE] Executar `cmd.exe /c "npm run build"` garantindo 0 erros de compilação.
- [ ] [VERIFY] Validar que o lançamento de R$ 1.712,56 de Dom Pedro abate a diferença da filial e soma no Faturamento Atual do painel.
