# Proposal - UnificaçÁo da Verdade do Saldo Real (OFX BALAMT)

## Objetivo
Resolver a quebra de confiança do usuário causada pela divergência de saldos no sistema. O "Saldo Real" exibido globalmente deve representar **sempre** o último saldo oficial lido da tag `<BALAMT>` de um arquivo OFX bancário, ao invés de calcular um balanço fictício somando transações de extrato. E remover os saldos residuais (1.7M) do banco de dados que continuam poluindo as dashboards.

## Requisitos
1. A hook `useAllStoresBalances` deve ser reescrita para consumir a tabela `reconciliations` em vez da tabela `transactions`. 
2. Ela deve capturar o `bank_total` da data mais recente processada para cada loja.
3. Se a loja nÁo possuir nenhum registro de reconciliaçÁo, o saldo será `0`.
4. Os Cards na Tela de VisÁo Global (Lojas da Rede) devem refletir esse novo cálculo de forma consistente com os dados internos de cada loja.
5. Deve-se criar um utilitário temporário (SQL Migration / BotÁo Administrativo / Script Node executável via `npm run admin:cleanup-balances`) que purga as entradas de `reconciliations` cujo `bank_total` seja o bug de 1.7M provocado pelo erro da importaçÁo em lote, de forma a higienizar o banco sem o usuário precisar deletar loja por loja.

## BDD Scenarios

### Cenário: ExibiçÁo consistente do Saldo Real entre listagem e detalhe
- **Given (Dado):** que a loja Dom Pedro importou um OFX onde a tag `<BALAMT>` era `25000.50`.
- **When (Quando):** o usuário acessar a rota `/lojas` (visÁo geral).
- **Then (EntÁo):** o card da loja Dom Pedro deve exibir "Saldo Real: R$ 25.000,50".
- **And (E):** ao clicar para entrar na loja, a dashboard deve exibir exatamente `R$ 25.000,50` no painel superior.

### Cenário: Limpeza do cache do Bug de 1.7M
- **Given (Dado):** que a tabela `reconciliations` possui entradas inválidas com saldo de `1751833` devido a falha sistêmica antiga.
- **When (Quando):** o script de saneamento/limpeza é executado ou o usuário deletar o lote.
- **Then (EntÁo):** as entradas fantasmas desaparecem e as queries `useAllStoresBalances` e `useExtrato` retornam `0` até uma nova importaçÁo ser enviada com os dados reais.
