# Phase 1: Research - UnificaçÁo do Saldo Real (BALAMT)

## Contexto do Problema
O usuário relatou uma divergência gritante na visualizaçÁo de saldos do sistema:
- Na tela externa (`/lojas`), o "Saldo Real" exibe `-R$ 2.206,30`.
- Ao entrar na loja (`/loja/st-01`), o "Saldo da Loja" exibe `R$ 1.751.833,00`.

O usuário está profundamente incomodado pois percebeu que a tela externa está "apenas somando entradas e saídas", em vez de exibir o saldo OFX exato (`<BALAMT>`). 

## Achados Técnicos
1. **Discrepância de Hooks:**
   - A tela `/lojas` consome o hook `useAllStoresBalances()`.
   - A tela `/loja/$lojaId` consome o `useExtrato()` que busca o `globalBalance` (lido da coluna `bank_total` da tabela `reconciliations`).
2. **Lógica de `useAllStoresBalances`:**
   - Atualmente faz `SELECT store_id, amount, type FROM transactions WHERE source = 'ofx'` e itera somando `in` e subtraindo `out`. Isso é um cálculo derivado e **incorreto** para representar o Saldo da Conta Bancária (que pode ter um saldo inicial nÁo refletido nas transações importadas).
3. **Resíduos da Falha Anterior:**
   - O saldo bizarro de `1.7M` é um artefato residual da falha da Spec 044 (já corrigido em `useTransactions.ts` no commit `a16008e`). As linhas "fantasmas" ainda estÁo no banco do usuário e precisam ser limpas via script ou na interface para restaurar a normalidade visual.

## SoluçÁo Arquitetural
Para garantir que a "fonte da verdade" do Saldo Real seja estritamente o `bank_total` extraído da tag `<BALAMT>` do último arquivo OFX, o sistema inteiro precisa ser refatorado para consultar `reconciliations`. O `useAllStoresBalances()` deve abandonar as somatórias de transações e passar a puxar o último `bank_total` gravado para cada loja.
