# Checklist de Implementação: Fix SSOT Conciliação e Cofre

### [DB]
- [x] 1. Criar migration SQL reestruturando a RPC `dar_baixa_dinheiro`. Adicionar bloco `SELECT ... FOR UPDATE` nas tabelas operacionais e tratar concorrências, garantindo `{ success, message, error }`.
- [x] 2. Ajustar a RPC `get_daily_reconciliation_summary` para sempre ler totais operacionais reais e nunca resgatar overrides errados do jsonb se não fizerem sentido (como `dinheiro_lojas` em cache no modo aberto).

### [BACKEND/FRONTEND HOOKS]
- [x] 3. Refatorar as mutações em `BaixaDinheiroModal.tsx` e `CashVaultCompositionModal.tsx` para não atualizarem status "optimistic" ou locais caso a RPC retorne `success: false` silencioso (tratar a promise de retorno).
- [x] 4. Limpar metadados agregados sujos no `handleSave` de `ResumoDiaPanel.tsx`, para que Salvar Fechamento não reescreva os saldos do cofre e perca os status atuais das contas, além de expurgar a lógica de dupla leitura em `useBackendConciliacao.ts`.

### [SECURITY/TEST]
- [x] 5. Rodar lint e type-checking local.
- [x] 6. Forçar auditoria estática com `npm run build`.
