# Design - Extrato e Histórico da Loja (Spec 050)

## 1. UI/UX Architecture
A página do Dashboard da Loja (`loja.$lojaId.tsx`) atualmente exibe uma aba de **Caixa Físico** na seção principal sob o resumo de *Entradas* e *Saídas*.
Devemos restaurar as abas de transações mantendo o layout simplificado e o design Liquid Glass da plataforma.

### Padrão de Abas:
- **Caixa Físico:** (Ativa por padrão) Exibe o detalhamento de dinheiro no cofre.
- **Entradas:** Exibirá a listagem de receitas.
- **Saídas:** Exibirá a listagem de despesas pagas.

A UI das listas deverá reutilizar o mesmo componente limpo que antes estava na Conciliação Diária, garantindo consistência visual. A cor primária para Entradas será `var(--color-success)` e para Saídas `var(--color-accent-danger)`.
Os badges e data da transação manterão a fonte Mono e os ícones Lucide equivalentes (`ArrowUpRight` para Entradas, `ArrowDownRight` para Saídas).

## 2. Modelagem de Dados
- Não haverá nova tabela no banco de dados.
- O hook `useExtrato` já está importado e disponível em `src/routes/loja.$lojaId.tsx`.
- Usaremos o retorno `extrato.transactions` e faremos um filter simples: `tx.type === 'in'` e `tx.type === 'out'`, respectivamente.
