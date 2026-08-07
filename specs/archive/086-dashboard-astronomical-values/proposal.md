# Proposta: CorreçÁo de Valores Astronômicos no Dashboard (VisÁo Geral)

## Contexto e Problema
O usuário reportou que os valores no Dashboard ("VisÁo Geral") continuam astronômicos, com o "Saldo Total" e "Caixa Atual" batendo a marca de R$ 17.998.662,00 (17 milhões), mesmo após a limpeza da tabela `daily_snapshots`.

## Análise de Causa Raiz
A origem deste problema está em como o hook `useDashboardV2.ts` calcula o `saldoTotal`.
Atualmente, o hook busca os dados da tabela `reconciliations` da seguinte forma:
```typescript
        supabase
          .from('reconciliations')
          .select('store_id, bank_total, date, status')
          .order('date', { ascending: false }),
```
E depois processa:
```typescript
      const latestByStore: Record<string, { bank_total: number; date: string; status: string }> = {};
      for (const row of recsAll.data || []) {
        if (!latestByStore[row.store_id] || row.date > latestByStore[row.store_id].date) {
          latestByStore[row.store_id] = { bank_total: Number(row.bank_total || 0), date: row.date, status: row.status || 'pending' };
        }
      }
```
**O Bug de Leakage no Tempo**: 
A query nÁo tem filtro de data! Ela traz todas as conciliações da história. O algoritmo de reduçÁo pega a conciliaçÁo de data "mais recente" (maior `row.date`) de cada loja, **ignorando a data que o usuário selecionou no Dashboard (`dateAtual`)**.
Se em algum momento no passado (ou em testes) foi importado um arquivo com data futura (ex: 2030) ou se existe algum lixo no banco de dados de uma importaçÁo com data errada (e valor de 17 milhões), o Dashboard vai SEMPRE puxar esse valor para o "Saldo Atual", nÁo importa a data que você selecione na tela.

## SoluçÁo Proposta (Plano de AçÁo)
1. **Filtragem Estrita por Data (`target_date`)**:
   Modificar a query de `recsAll` no `useDashboardV2.ts` para buscar APENAS registros até a data selecionada (`.lte('date', dateAtual)`).
2. **Isolamento Temporal no Reducer**:
   Garantir que a lógica de `latestByStore` e `latestPrevByStore` nÁo vaze para o futuro. O saldo total exibido deve ser estritamente o da data selecionada na UI (ou o imediatamente anterior caso nÁo haja fechamento no dia).
3. **Limite e Performance (Opcional, mas recomendado)**:
   Ao invés de baixar a tabela `reconciliations` inteira no front-end, usar os filtros corretamente para escalar.

## Arquivos Afetados
- `src/hooks/useDashboardV2.ts`: Atualizar a query de `reconciliations` e a reduçÁo do `latestByStore`.

## Próximos Passos
Após aprovaçÁo desta proposta, executaremos o comando `/vibe-apply 086` para corrigir o código, isolando a data do dashboard e eliminando os "Saldos do Futuro".
