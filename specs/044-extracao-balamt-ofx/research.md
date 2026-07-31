# Pesquisa e Contexto: Extração do BALAMT no OFX

## Entendimento do Problema
O usuário relata que o "Saldo da Loja" ainda não está refletindo o saldo absoluto do banco (OFX). Ele identificou que o valor do "Saldo da Loja" está exibindo `R$ 2.058,44`, que é exatamente a variação líquida do dia (Entradas: R$ 5.337,36 - Saídas: R$ 3.278,92 = R$ 2.058,44). 

Na Spec 043, atualizamos o `useExtrato` para ler o campo `bank_total` da tabela `reconciliations`. Contudo, ao investigar o `ofxParser.ts` e o `useImportProcessor.ts`, descobrimos a causa raiz do problema: **o saldo final do banco (`<LEDGERBAL><BALAMT>`) do arquivo OFX nunca foi extraído, nem salvo no banco de dados!**
Atualmente, a importação do OFX ignora as tags `<LEDGERBAL>`, `<BALAMT>` e não possui lógica para armazenar o valor absoluto. Por isso, quando o Extrato do Banco entra no cálculo da reconciliação, ele não possui a informação principal do OFX: o saldo oficial da conta no fechamento daquele extrato.

Se `bank_total` em `reconciliations` está como `2058.44`, é porque o código pode ter inferido isso em algum lugar, ou porque foi feito um ajuste manual (Ajustar Saldo), ou até uma herança de outra migration que tentou colocar o saldo líquido no `bank_total` durante a inserção, mas de fato ele não representa o `<BALAMT>`.

### Solução Arquitetural
Para corrigir de fato a fonte de verdade do banco:
1. Em `src/lib/parsers/ofxParser.ts`, ler o bloco `<LEDGERBAL>` e capturar o `<BALAMT>`. A função passará a retornar `alias`, `transactions` e `bankBalance`.
2. Em `src/components/importacoes/WizardImportacao.tsx`, ao processar o OFX, pegar esse `bankBalance` e passar como payload extra (ou consolidar no state do React e passar na mutation `processImport`).
3. Em `src/hooks/useImportProcessor.ts`, ao processar o OFX, usar esse `bankBalance` no `upsert` da tabela `reconciliations` atualizando o campo `bank_total`.

Com isso, a query implementada na Spec 043 passará a funcionar magicamente e trará o saldo correto do banco reportado pela instituição financeira, em vez de uma conta matemática cega.
