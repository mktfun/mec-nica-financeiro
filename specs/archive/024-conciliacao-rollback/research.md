# Research: Spec 024 - Rollback e Refinamento Real

## Análise do Feedback
1. **Perda de Funcionalidade Core**: As specs 021, 022 e 023 tentaram reinventar o layout (Split-Pane, depois Drawer Revolut), mas na prática, destruíram o valor da página original que permitia ver a saúde de todas as unidades rapidamente.
2. **NavegaçÁo Quebrada**: O usuário quer voltar a ter o clique na loja redirecionando para a rota de detalhes original (`/conciliacao-detalhes`). A invençÁo da gaveta lateral apenas para lançar caixa foi considerada inútil e "nada a ver".
3. **Cores**: A paleta de cores "Neon" foi rejeitada. O usuário quer manter as cores que ele já tinha aprovado nas master specs anteriores.
4. **Gráfico Zerado**: A ideia do gráfico da evoluçÁo foi elogiada, MAS implementei usando `new Date()` (Hoje no mundo real) em vez de usar a **Data Selecionada no Date Picker** como âncora. Como os dados de teste provavelmente sÁo de meses atrás, o gráfico ficou vazio.
5. **Smart Cash**: O input de caixa físico nÁo deve ser escondido numa gaveta misteriosa. Deve ficar visível no Dashboard Macro, MAS somente listar as lojas que tiveram pagamento/OS em dinheiro.

## Plano de AçÁo
1. Fizemos git checkout dos arquivos `src/routes/conciliacao.tsx` e `src/routes/conciliacao-detalhes.tsx` do commit anterior às loucuras (commit `acb4a52`).
2. Implementar apenas as melhorias solicitadas em cima desse layout sólido.
