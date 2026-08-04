# Spec Plan: Correção Histórica de Conciliação e Bootstrap (076)

## Tasks

- [x] [BACKEND] Criar migration SQL `20260804000001_add_na_loja_os_history.sql` que adiciona a coluna `na_loja_os NUMERIC DEFAULT 0` à tabela `reconciliations`.
- [x] [FRONTEND] Em `src/routes/conciliacao.index.tsx`, alterar o `useState` do `selectedDate` para inicializar com `new Date().toISOString().substring(0, 10)` (Hoje).
- [x] [FRONTEND] Em `src/hooks/useConciliacao.ts` (`useModulo1StoresData`), carregar a tabela `reconciliations` filtrada por data, cruzar pelo `store.id` e caso exista um snapshot consolidado, retornar `reconciliations.na_loja_os`. Caso contrário, manter a lógica dinâmica do `patio_os`.
- [x] [FRONTEND] Em `src/components/conciliacao/ResumoDiaPanel.tsx`, dentro do loop que envia dados ao Supabase (`handleSave`), adicionar o parâmetro `na_loja_os: s.na_loja_os` no UPSERT de `reconciliations` para gravar o congelamento.
- [x] [FRONTEND] Em `src/routes/bootstrap.tsx`, adicionar a coluna de input `Na Loja OS (Pátio Pendente)` e incluí-la na matemática do `caixa_atual` na payload do UPSERT de `daily_snapshots`. Garantir que o valor preenchido também seja salvo no upsert de `reconciliations.na_loja_os`.
- [x] [TEST] Verificar se a navegação abre na data atual (Cenário 1).
- [x] [TEST] Verificar se `/bootstrap` atualiza o caixa_atual (Cenário 2).
