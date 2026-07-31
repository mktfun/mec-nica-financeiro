# Proposal - 018 Bugfixes & Loading

## Requisitos
1. **Correção do Bug de Recebíveis D+1:** Quando o usuário importar uma planilha antiga que já foi importada antes, se o recebível estava "pendente" mas hoje já passou da data de vencimento (`due_date`), o sistema deve atualizar o status para "recebido" em vez de ignorar silenciosamente.
2. **Atualização do LoadingSpinner:** Substituir o spinner com estilo de "bolinhas coloridas girando" por um componente limpo e profissional, aderente às tendências de UI de 2026 (Liquid Glass/Minimalista).

## User Stories
- **US1:** Como gerente financeiro, quero reimportar uma planilha de dias passados para que o sistema reconheça automaticamente que os recebíveis pendentes (que dependiam de D+1) já caíram na conta, atualizando seus status para "recebido".
- **US2:** Como usuário do sistema, quero ver telas de carregamento modernas e suaves, para sentir que estou usando um software premium e profissional.

## BDD Scenarios

### Cenário: Reimportando planilha com recebíveis vencidos
- **Given (Dado):** Que um cartão de crédito foi importado dia 28/05 e gravado como "pendente" com vencimento para 29/05 (D+1).
- **When (Quando):** O usuário reimporta a mesma planilha no dia 02/06.
- **Then (Então):** O sistema deve identificar a duplicata, notar que `29/05 <= 02/06`, e realizar um `UPDATE` no banco alterando o status de "pendente" para "recebido".

### Cenário: Exibição de carregamento
- **Given (Dado):** Que o sistema está carregando dados no dashboard.
- **When (Quando):** O componente `LoadingSpinner` é renderizado na tela.
- **Then (Então):** Um indicador visual premium e minimalista (sem bolinhas espaçadas) é exibido utilizando a identidade visual da marca.
