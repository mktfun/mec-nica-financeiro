# Spec Plan: Correção de Foreign Key no Importador e Harmonização Visual da Conciliação (conciliacao-fk-fix-ui-harmony)

## Tasks

- [ ] [BACKEND/FRONTEND] Sanitizar UUIDs em `src/hooks/useConciliacao.ts` e `src/components/importacoes/CentralImportWizard.tsx`:
  - [ ] Validar se `ofx_transaction_id` e `rede_transaction_id` são UUIDs válidos antes do insert/upsert em `conciliation_matches`.
  - [ ] Evitar a violação de constraint `conciliation_matches_ofx_transaction_id_fkey`.
- [ ] [FRONTEND] Reconstruir Hero Card em `src/components/conciliacao/ResumoDiaPanel.tsx`:
  - [ ] Unificar os dados da Aba SALDO (G13 a G31) no Hero Card principal da conciliação.
  - [ ] Preservar a barra de navegação por data e os seletores de calendário.
- [ ] [FRONTEND] Reformular Cards da Lista "Fechamento por Loja" em `src/routes/conciliacao.index.tsx`:
  - [ ] Exibir a régua das 6 colunas por unidade: `Banco Itaú`, `Dinheiro MP`, `A Receber`, `Na Loja OS`, `Saldo Total` e `Resultado Final (G31)`.
  - [ ] Remover o bloco separado `Modulo1SaldoPanel.tsx` da página principal para evitar duplicidade de cards.
- [ ] [TEST] Verificar compilação limpa com `npm run build`.
