# Spec Plan: Correção de Salvar Bootstrap (074-fix-bootstrap)

## Tasks

- [x] [FRONTEND] Em `src/routes/bootstrap.tsx`, refatorar `handleSave` para remover o `upsert` de `daily_snapshots` de dentro do loop `for (const store of stores)`.
- [x] [FRONTEND] Em `src/routes/bootstrap.tsx`, em `handleSave`, criar as variáveis somatórias `totalSaldo`, `totalFaturamento`, `totalContas` antes do loop e acumulá-las durante a iteração das lojas.
- [x] [FRONTEND] Em `src/routes/bootstrap.tsx`, após o loop das lojas, adicionar o UPSERT em `daily_snapshots` com os totais somados, utilizando `{ onConflict: 'date' }` e removendo `store_id`. O campo `saldo_final` deve ser renomeado para `saldo_bancario`.
- [x] [TEST] Verificar cenário 1: Salvar a carga inicial na UI e observar na aba de Network (ou console) se a resposta 400 desaparece e a mensagem de Sucesso é renderizada.
