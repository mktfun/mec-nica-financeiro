# Proposal: Automação do Pareamento e Tag de PIX (116)

## Problema
1. O usuário precisa clicar manualmente no botão "Parear Transações" no painel de conciliação para que as transações de OS e banco se conectem. A exigência é que isso aconteça nativamente assim que a importação termina, sem cliques adicionais.
2. O valor de "PIX" na conciliação e dashboard globais está zerado (R$ 0,00). Isso acontece porque ao importar o arquivo bancário OFX, o parser nativo não seta a coluna payment_method baseada no extrato. Sem o carimbo de pix na coluna de método de pagamento, o backend os ignora nas somas de entradas PIX, já que ele depende de payment_method ILIKE '%pix%'.

## Solução Proposta
1. **Remoção do Botão e Injeção Automática**: Vamos deletar o botão de Parear Transações da interface do Painel e invocar sua chamada RPC subjacente (uto_match_transactions) programaticamente no final do Wizard de Importação (CentralImportWizard.tsx).
2. **Atribuição Automática de PIX**: Injetar uma heurística simples na hora da montagem do 	xsToInsert no Wizard de importação: Se o título da transação OFX (	x.title) possuir a palavra 'PIX', gravamos payment_method: 'pix', caso contrário, enviamos nulo. Isso destrava imediatamente o cálculo das RPCs sem precisar reescrever lógicas de banco.

## Contratos de Dados
- Não há mudanças de schema em tabelas, tudo se baseia no uso da coluna já existente payment_method na tabela 	ransactions.

## Risco Principal
- Caso a chamada RPC demore muito, pode atrasar a finalização do loading no UI do import. Porém, sendo executada de forma nativa no Supabase, costuma levar menos de 200ms.
