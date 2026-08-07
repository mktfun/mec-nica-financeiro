# Design: Correções do Dashboard e Fluxo de Histórico (010)

## Modificações na UI

1. **Dashboard Principal (`HeroBalance.tsx` e `conciliacao.tsx`)**
   - Alterar o subtítulo "Saldo Líquido do Dia" para "Saldo Líquido do Mês Atual" ou "Saldo Acumulado".
   - Os cards da `conciliacao.tsx` mostrarão o somatório do mês em vez do dia atual (Entradas do Mês).

2. **Fluxo do Grid de Lojas (`conciliacao.tsx`)**
   - Importar o componente `<StoreDetailsSheet />` que já existe.
   - Criar os estados: `const [selectedStore, setSelectedStore] = useState<StoreRow | null>(null);` e o equivalente para a conciliação associada.
   - Substituir o `<Link to="/lojas">` pelo `onClick={() => setSelectedStore(store)}`.
   - Adicionar o botão "Ver Extrato de Entradas/Saídas" no final do `StoreDetailsSheet` que abrirá o `/historico` para aquela loja.

## Modificações no Backend / Hooks

1. **`useTransactions.ts` -> `useDashboardSummary`**
   - Em vez de buscar na tabela `reconciliations` filtrando por `eq('date', today)`, remover o filtro de "hoje".
   - Buscar os dados da tabela `transactions` onde `occurred_at` está dentro do mês atual (ex: `>= 2026-06-01`).
   - Somar os valores `type = 'in'` para compor "Entradas", e `type = 'out'` para compor "Saídas". O Saldo Líquido será `in - out`.

2. **`useConciliacao.ts` -> `useConciliacaoResumo`**
   - Atualmente ele soma "Entradas do Dia". Podemos mudar para "Entradas do Mês" para que a página de Conciliação também reflita valores mais realistas e compatíveis com a importação em lote. Para isso, o parâmetro `date` no Hook precisaria aceitar um intervalo (mês inteiro). 

## Mapa de Dependências
- `src/components/dashboard/HeroBalance.tsx` depende de `useDashboardSummary`. Mudando o Hook, a tela se atualiza sem quebrar a UI.
- `src/routes/conciliacao.tsx` depende de `StoreDetailsSheet` (Novo).
- Nenhuma dependência externa será quebrada. O modal já existe e está pronto para ser utilizado na rota de conciliação.
