# Design & UX - Unificação do Saldo Real

## Frontend (Stitch / React)

A interface em `src/routes/lojas.tsx` deve ser intocada no aspecto de CSS/UX (Liquid Glass, cards arredondados), pois já possui um layout atrativo. A única mudança real é o que o hook subjacente devolve.

- **Componente Alterado indiretamente**: `AnimatedNumber` do `Saldo Real`. O componente se alimentará da nova fonte de dados confiável, trazendo clareza instantânea para o usuário sem exigir interação adicional.

## Banco de Dados (Supabase)

### Tabela `reconciliations`
Atualmente é quem detém a verdade do saldo através da coluna `bank_total`.

### Relação com `useAllStoresBalances`
Em vez de fazermos um `GROUP BY` e `SUM(amount)` na `transactions` inteira via JS/TS na página de `/lojas`, usaremos uma função SQL mais limpa, ou simplesmente uma consulta em `reconciliations` pegando a data mais recente. 

A abordagem ideal no frontend será:
- Usar Supabase via JS Client:
```typescript
const { data, error } = await supabase
   .from('reconciliations')
   .select('store_id, bank_total, date')
   .order('date', { ascending: false });

// Group in JS para pegar a data mais recente (se a query não filtrar por DISTINCT ON (store_id) que é exclusivo do Postgres SQL e às vezes chato no client do Postgrest)
```

## Saneamento Temporário (Clean Up Script)
Como parte do design desta spec, o desenvolvedor deve criar e executar um script Node isolado (ex: `scripts/purge-bug-17m.ts`) que apaga os registros da tabela `reconciliations` que possuem `bank_total = 1751833` associados a múltiplas contas do erro anterior.
