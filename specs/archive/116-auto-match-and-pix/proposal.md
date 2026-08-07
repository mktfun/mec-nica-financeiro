﻿# Proposal: AutomaçÁo do Pareamento e Tag de PIX (116)

## Problema
1. O usuário precisa clicar manualmente no botÁo "Parear Transações" no painel de conciliaçÁo para que as transações de OS e banco se conectem. A exigência é que isso aconteça nativamente assim que a importaçÁo termina, sem cliques adicionais.
2. O valor de "PIX" na conciliaçÁo e dashboard globais está zerado (R$ 0,00). Isso acontece porque ao importar o arquivo bancário OFX, o parser nativo nÁo seta a coluna payment_method baseada no extrato. Sem o carimbo de pix na coluna de método de pagamento, o backend os ignora nas somas de entradas PIX, já que ele depende de payment_method ILIKE '%pix%'.

## SoluçÁo Proposta
1. **RemoçÁo do BotÁo e InjeçÁo Automática**: Vamos deletar o botÁo de Parear Transações da interface do Painel e invocar sua chamada RPC subjacente (uto_match_transactions) programaticamente no final do Wizard de ImportaçÁo (CentralImportWizard.tsx).
2. **AtribuiçÁo Automática de PIX**: Injetar uma heurística simples na hora da montagem do 	xsToInsert no Wizard de importaçÁo: Se o título da transaçÁo OFX (	x.title) possuir a palavra 'PIX', gravamos payment_method: 'pix', caso contrário, enviamos nulo. Isso destrava imediatamente o cálculo das RPCs sem precisar reescrever lógicas de banco.

## Contratos de Dados
- NÁo há mudanças de schema em tabelas, tudo se baseia no uso da coluna já existente payment_method na tabela 	ransactions.

## Risco Principal
- Caso a chamada RPC demore muito, pode atrasar a finalizaçÁo do loading no UI do import. Porém, sendo executada de forma nativa no Supabase, costuma levar menos de 200ms.
