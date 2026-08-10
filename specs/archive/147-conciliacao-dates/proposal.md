# Proposal: Navegação Inteligente de Datas na Conciliação (147-conciliacao-dates)

## Problema
Atualmente, a tela de Conciliação Diária (`/conciliacao/`) sempre abre no dia de hoje (`new Date()`). O calendário e os botões de paginação permitem navegar por qualquer dia indiscriminadamente. 
Isso gera confusão para o operador, pois ele pode navegar para dias vazios (sem lançamentos ou conciliações) e o sistema sempre o força a ver o dia de hoje primeiro, mesmo que a última conciliação trabalhada tenha sido há dias atrás.

## Solução Proposta
1. Mudar o estado inicial de `selectedDate` na tela de conciliação: ao invés de "hoje", buscar a última data disponível no sistema que possua dados (via `daily_snapshots` ou `import_logs`).
2. Criar um hook `useAvailableConciliacaoDates` que retorna um array ordenado apenas das datas que possuem informações (OFX importado ou snapshot salvo).
3. Modificar o componente `ResumoDiaPanel`:
   - Os botões "Anterior" e "Próximo" devem pular para a próxima data válida no array, e não apenas subtrair/adicionar 1 dia corrido.
   - O `<input type="date">` deve restringir (ou validar) se a data escolhida tem dados. Como o input nativo de data não suporta facilmente um array de "datas permitidas", podemos manter o input aberto mas, ao mudar a página, buscar a data válida mais próxima (ou utilizar um date picker customizado futuramente). Para a paginação nativa de setas (Anterior/Próximo), usar estritamente o array de datas disponíveis.

## Contratos de Dados
- Nenhuma nova tabela ou coluna é necessária.
- Utilizaremos as tabelas já existentes: `daily_snapshots` (datas fechadas) e opcionalmente `import_logs` (datas importadas prontas para fechamento) para coletar as datas únicas (`DISTINCT`).

## API / Interface
- **Novo Hook:** `useAvailableConciliacaoDates()` que fará query no Supabase retornando um `string[]` de datas em formato 'YYYY-MM-DD'.
- **Hook Modificado:** O `useState` em `conciliacao.index.tsx` receberá a maior data do hook de datas disponíveis como default inicial, ao invés de `new Date()`.
- **Componente Modificado:** `ResumoDiaPanel.tsx` receberá a lista de `availableDates` e a função `onDayChange` usará o array para encontrar o index atual e saltar para `index + offset`.

## Features Existentes Impactadas
- O roteamento e inicialização de `/conciliacao/` e o painel `ResumoDiaPanel`. A mudança é restrita a esse módulo (Feature ID: 147).

## Risco Principal
- **Probabilidade:** Baixa
- **Impacto:** Reversível
- **Risco:** O usuário acessar a tela em um dia que não possui dados prévios (como um domingo sem importações).
- **Tratamento / Resolução (Conforme User Feedback):** A navegação (tanto nas setinhas quanto no input de calendário) ficará RESTRITA apenas às datas que efetivamente contêm dados (OFX importado ou snapshot salvo). Isso garante que o cálculo em dias úteis seguintes (ex: segunda-feira) sempre busque a última conciliação válida sem quebrar caso o operador caia num "domingo vazio". O calendário ficará completamente bloqueado para dias sem dados.
