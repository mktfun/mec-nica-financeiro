# Proposal: Correção de Exclusão de Lote e Botão "Limpar Todos os Dados" (delete-and-clean-all)

## Problema
1. **Falha ao Excluir Lote Específico:** Na tela `/importacoes`, clicar no botão de excluir (lixeira) de uma importação agrupada não concluía a exclusão dos registros devido a falhas de permissão ou divergência de parâmetros da RPC `delete_import_batch` com as Foreign Keys.
2. **Falta de Botão de Limpeza Global ("Limpar Tudo"):** Não existia um mecanismo simples e seguro na interface de usuário para zerar completamente a base de dados (todas as 9 tabelas de conciliação/transações/OS/lotes) de uma só vez para reiniciar testes.

## Solução Proposta
1. **Fix da Exclusão por Lote (`useDeleteImport`):**
   - Refatorar o hook `useDeleteImport` com fallback resiliente: tenta a RPC `delete_import_batch`, e caso a RPC falhe ou não apague os logs, executa a exclusão direta via Supabase JS Client ordenadamente em cascata (`conciliation_matches` → `transactions` → `patio_os` → `receivables` → `reconciliations` → `import_logs` → `import_batches`).
   - Adicionar `qc.clear()` no `onSuccess` para forçar a desocupação imediata da memória do navegador.
2. **Novo Botão "Limpar Todos os Dados" na Tela `/importacoes`:**
   - Adicionar botão destacado no cabeçalho de `/importacoes` com ícone de lixeira vermelha e estilo de perigo.
   - Criar modal de confirmação com dupla checagem: *"Tem certeza que deseja apagar TODOS os registros de todas as lojas do sistema? Esta ação é irreversível."*
   - Criar o hook `useClearAllData` para executar o `DELETE` global em todas as 9 tabelas (`transactions`, `patio_os`, `receivables`, `reconciliations`, `conciliation_matches`, `import_logs`, `import_batches`, `cash_registers`, `reconciliacoes_triplas`), seguido de `qc.clear()`.

## Contratos de Dados
- Tabelas afetadas: `import_logs`, `import_batches`, `transactions`, `patio_os`, `receivables`, `reconciliations`, `conciliation_matches`, `cash_registers`, `reconciliacoes_triplas`.

## Features Existentes Impactadas
- `src/hooks/useImportProcessor.ts` (`useDeleteImport`, `useClearAllData`)
- `src/routes/importacoes.tsx` (interface de gerenciamento de importações)

## Risco Principal
Garantir que a exclusão por lote desfaça os registros das tabelas relacionadas sem deixar orfãos em `transactions` ou `patio_os`.
