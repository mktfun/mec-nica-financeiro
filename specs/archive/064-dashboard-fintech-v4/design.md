# Design: Dashboard Fintech V4 (064)

## Arquitetura Técnica
A lógica de ancoragem temporal precisa ser flexível.
1. `useDashboardV2` recebe um argumento `selectedDate?: string` (formato `YYYY-MM-DD`).
2. Se `selectedDate` estiver ausente, faremos fallback para a maior data contida na tabela `reconciliations` (como foi feito na V3).
3. Seja via param ou fallback, a data estabelecida será a `dateAtual`.
4. A `dateAnterior` será a maior data de `reconciliations` que for estritamente menor (`<`) que a `dateAtual`.
5. O gráfico de histórico de saldo (`last15Dates`) buscará as últimas 15 datas que sejam `<= dateAtual`, garantindo que o gráfico pare na data selecionada.

## Interfaces TypeScript
```ts
// src/hooks/useDashboardV2.ts
export function useDashboardV2(selectedDateStr?: string) { ... }
```

## Componentes / Hooks / Funções
- **`useDashboardV2.ts`** [MODIFICADO]:
  - Aceitar `selectedDateStr` opcional.
  - Ajustar a lógica de descoberta de `dateAtual` e `dateAnterior`.
  - Passar a variável `dateAtual` para frente nas queries de faturamento.
- **`src/routes/index.tsx`** [MODIFICADO]:
  - Criar state local `const [selectedDate, setSelectedDate] = useState<string>('')`.
  - Passar o `selectedDate` pro hook `useDashboardV2(selectedDate || undefined)`.
  - No lugar da Badge "Última conciliação: DD/MM/YYYY", colocar um `<input type="date" value={selectedDate || data?.dataAtual} />` com design limpo (bordas sutis, fundo escuro).
- **`StoreTableDashboard.tsx`** [MODIFICADO]:
  - Ajustar classes CSS: Aumentar sutilmente o min-width das colunas críticas (`whitespace-nowrap` já está ativo, mas o contêiner precisa dar espaço para scroll horizontal sem espremer as colunas flexíveis).
  - Coluna Pátio: Alterar a formatação de "12 ud. • R$ 34.000" para algo empilhado (flex-col) com fontes menores ou sem a palavra "ud.", para poupar espaço horizontal.

## Fluxo de UI
1. Usuário entra e vê os dados do dia que tem os dados mais recentes por padrão.
2. Ele percebe o calendário no canto superior direito e seleciona um dia do mês passado (ex: 2026-07-25).
3. Todas as queries rodam e mostram a situação de caixa, faturamento e contas exatamente como estavam atrelados à conciliação daquele dia 25/07. O gráfico de evolução atualiza para mostrar do dia 10/07 até 25/07.

## Cenários de Verificação
- **Cenário 1:** Limpeza do input date.
  - SCAN: Usuário apaga a data do campo.
  - INFER: `selectedDate` fica vazio. O hook reassume o default (maior data do banco).
- **Cenário 2:** Tabela em telas menores (laptop 13").
  - SCAN: Tabela com 7 colunas.
  - INFER: Com o empilhamento do Pátio e `whitespace-nowrap`, a tabela não "quebra" em múltiplas linhas caóticas, mas permite scroll horizontal suave.
