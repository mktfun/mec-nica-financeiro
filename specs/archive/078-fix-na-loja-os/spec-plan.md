# Spec Plan: Correção do Pátio Pendente (Na Loja OS) e Bug de Salvamento (078)

## Tasks

- [x] [FRONTEND] Em `src/components/conciliacao/ResumoDiaPanel.tsx`, corrigir a variável `storesMod1` na função `handleSave` alterando-a para `storesData`.
- [x] [FRONTEND] Em `src/hooks/useConciliacao.ts` (na função `useModulo1StoresData`), alterar o `.eq('date', date)` da query de `reconciliations` para remover essa restrição, buscando o último snapshot válido para cada loja. 
- [x] [FRONTEND] Em `src/hooks/useConciliacao.ts`, processar os resultados dessa query no JavaScript para extrair o `na_loja_os` exato da `date`, OU o mais recente imediatamente anterior à `date`.
- [x] [TEST] Selecionar 04/08 e verificar se o Pátio Pendente agora herda os 13k corretos da loja Jabaquara sem colapsar para 0.
- [x] [TEST] Clicar em "Gravar Fechamento Diário" e observar se os snapshots das lojas são guardados no BD sem ReferenceError.
