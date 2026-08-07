# Design: CorreçÁo de ExclusÁo de Lote e BotÁo "Limpar Todos os Dados" (delete-and-clean-all)

## Arquitetura Técnica

```
[Tela de Importações: src/routes/importacoes.tsx]
       │
       ├──► BotÁo Excluir Lote (Lixeira no Card)
       │     └─► useDeleteImport()
       │           ├─► Tenta RPC delete_import_batch
       │           ├─► Fallback JS: DELETE em cascata por store_id & target_dates
       │           └─► qc.clear() + invalidateQueries
       │
       └──► BotÁo "Limpar Todos os Dados" (Cabeçalho)
             └─► Modal de ConfirmaçÁo
                   └─► useClearAllData()
                         ├─► DELETE neq(id, 0) em 9 tabelas do Supabase
                         ├─► qc.clear()
                         └─► Toast "Todos os dados foram zerados"
```

## Componentes / Hooks Afetados

1. **`src/hooks/useImportProcessor.ts`:**
   - Refatorar `useDeleteImport` com fallback resiliente em JS caso a RPC lance exceçÁo ou nÁo delete todos os logs.
   - Criar `useClearAllData` para executar o expurgo completo de 9 tabelas do Supabase e limpar o cache do React Query.

2. **`src/routes/importacoes.tsx`:**
   - Adicionar botÁo *"Limpar Todos os Dados"* no topo da página.
   - Implementar modal de confirmaçÁo de exclusÁo total.
   - Ajustar o fluxo de confirmaçÁo do card de lote para garantir que o spinner de carregamento apareça durante a exclusÁo.

## Cenários de VerificaçÁo

### Cenário 1: Excluir Lote Individual
- **Entrada:** Usuário clica na lixeira de um lote em `/importacoes` e confirma.
- **Resultado Esperado:** Os logs daquele lote sÁo deletados do banco, as transações e OSs associadas sÁo removidas, o cache do navegador é limpo e o card desaparece da lista.

### Cenário 2: Limpar Todos os Dados (Zerar Banco)
- **Entrada:** Usuário clica no botÁo "Limpar Todos os Dados", visualiza a confirmaçÁo e clica em "Confirmar ExclusÁo Total".
- **Resultado Esperado:** Todas as 9 tabelas do Supabase ficam com 0 registros, o React Query limpa a memória e a tela exibe "0 lotes processados" e histórico limpo.
