# Spec 420 — Spec Plan: Idempotência de Dinheiro de OS e Correção da Baixa de Cofre

## Tasks

### [BACKEND / ETL]
- [x] Completed: Em `src/hooks/useImportProcessor.ts` (linhas 165–190), remover o filtro `.eq('entry_date', entryDate)` da checagem de existência em `store_cash_vault`, garantindo busca global por `store_id` e `os_number_ref`, com preservação estrita de OSs já marcadas como `depositado`. | Ref: `skills/backend-patterns` | Verificação: Script de teste de re-importação garantindo 0 duplicatas.

### [DATABASE / SANITIZATION]
- [x] Completed: Executar script de saneamento no PostgreSQL para excluir as 16 entradas duplicadas criadas em 18/09 em `store_cash_vault` que já haviam sido depositadas em 17/09, preservando o registro genuíno da OS 620. | Ref: `skills/database` | Verificação: Script headless confirmando zero duplicatas `store_id + os_number_ref` em `store_cash_vault`.

### [FRONTEND / WIZARD]
- [x] Completed: Em `src/components/importacoes/wizard/Step3CashVaultDaniel.tsx` (linhas 90–105), integrar `useQueryClient` e invalidar a chave `['store-cash-vault-em-transito']` após o update de recolhimento para atualização reativa da lista. | Ref: `skills/frontend-design-pro` | Verificação: Inspeção estática de código e tipagem.

### [TERMINAL GATE]
- [x] Completed: Executar `npm run build` garantindo exit code 0 e integridade total dos tipos TypeScript. | Ref: `skills/sdd-apply` | Verificação: `npm run build` exit code 0.
