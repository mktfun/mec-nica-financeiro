# Tasks - Spec 035

## Backend
- [x] 1. Criar uma nova migration SQL (ex: `20260610220000_update_bank_total_trigger.sql`) contendo uma função e um Trigger na tabela `transactions`. 

## Frontend
- [x] 2. Editar `src/routes/importacoes.tsx` para consertar o rótulo "Lote OS R$ 0,00".
- [x] 3. Em `src/components/importacoes/WizardImportacao.tsx`, ao registrar logs para OFX ou Maquininha, o `total_paid_all` deve refletir o valor de Entradas MENOS o valor de Saídas (`totalEntradas - totalSaidas`).

## QA e Finalização
- [x] 4. Rodar o build (`npm run build`) para verificar dependências.
- [x] 5. Concluir testando as modificações (arquivar via `/vibe-archive commit e push` após validação).
