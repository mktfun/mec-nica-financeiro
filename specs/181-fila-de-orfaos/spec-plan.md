# Spec Plan: Fila de Órfãos (Manual) (181)

## Tasks

- [x] [BACKEND] Criar migration adicionando as colunas `manual_category` (text) e `manual_justification` (text) na tabela `transactions`.
- [x] [BACKEND] Na mesma migration, criar a função RPC `categorize_orphan_transaction(p_tx_id UUID, p_category TEXT, p_justification TEXT)`.
- [x] [FRONTEND] Criar Hook `useCategorizeOrphan.ts` para disparar a RPC.
- [x] [FRONTEND] Criar componente `OrphanCategorizationModal.tsx` recebendo o transaction id, o tipo e uma listagem dropdown (Sucata, Depósito Avulso, Tarifa, Outros).
- [x] [FRONTEND] Modificar `RedeVsExtratoTable.tsx` para injetar um botão de Ação/Justificar e exibir a badge visual caso a transação (do tipo `unmatched_extrato`) já tenha `manual_category` ou `manual_justification` preenchido.
- [x] [TEST] Verificar se a matemática global (Painel e Diferença) se manteve a mesma após categorizar um órfão.
