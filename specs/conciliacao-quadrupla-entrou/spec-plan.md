# Spec Plan: Cadeia de Conciliação Quádrupla (OS × Maquininha × PIX × Extrato OFX) e Baixa Automática 'ENTROU' (conciliacao-quadrupla-entrou)

## Tasks

- [ ] [FRONTEND] Implementar Avaliação de Fechamento Quádruplo em `src/hooks/useConciliacao.ts`:
  - [ ] Adicionar função `evaluateQuadrupleMatching` para verificar se as 3 pontas (OS ↔ Maquininha ↔ Banco OFX) fecham 100%.
  - [ ] Adicionar mutation `useAutoCloseOs` para atualizar `status = 'ENTROU'` na tabela `patio_os` quando a cadeia de 4 pontas for concluída.
- [ ] [FRONTEND] Atualizar `src/components/conciliacao/OsVsRedeTable.tsx`:
  - [ ] Exibir o badge de status **`ENTROU`** com destaque verde quando a OS for baixada automaticamente.
  - [ ] Adicionar indicador visual de progresso de fechamento por OS (1/3, 2/3, 3/3 pontas batidas).
- [ ] [FRONTEND] Atualizar `src/components/conciliacao/OsDetailModal.tsx`:
  - [ ] Exibir checklist visual de 4 pontas no modal de detalhes (OS Gerente → Maquininha → Banco OFX → Status ENTROU).
- [ ] [FRONTEND] Atualizar `src/routes/conciliacao.$lojaId.tsx`:
  - [ ] Exibir os totais consolidados de "Saldo Na Loja (OSs Pendentes)" vs "Saldo Realizado (Baixadas/ENTROU)" em alinhamento com a Aba SALDO da planilha `CONCILIACAO-2307.xlsx`.
- [ ] [TEST] Verificar compilação limpa com `npm run build`.
