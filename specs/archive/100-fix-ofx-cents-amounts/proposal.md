# Proposal: Correção Definitiva de OFX em Centavos (100)

## 1. Problema: Valores aparecendo na casa dos Milhões
**Causa Raiz:** Algumas exportações bancárias (como Itaú e Bradesco) emitem os valores do arquivo OFX como um número inteiro de centavos, omitindo o ponto ou vírgula decimal (ex: `1218338` em vez de `12183.38`). 
Na atualização passada (Spec 088), havíamos corrigido esse bug **apenas** para o campo `BALAMT` (Saldo da Conta). No entanto, esquecemos de aplicar a mesma lógica de conversão/divisão de centavos para o campo `TRNAMT` (Valor individual de cada transação). 
O que ocorre agora é que a Engine lê a transação como `1218338` reais (1.2 milhões) e a joga no banco de dados. Ao somar todas essas transações distorcidas, o Saldo Total e o Fluxo de Caixa disparam para dezenas de milhões.

## 2. Solução
Aplicar a mesma lógica de normalização decimal que criamos para o Saldo (`BALAMT`) nas Transações (`TRNAMT`). 
1. Ao extrair `TRNAMT`, se a string não contiver ponto nem vírgula, e o valor for maior que 100, ele será dividido por 100.
2. A mesma proteção será injetada retroativamente na captura de saldo anterior que ocorre por meio de `MEMO` (caso o banco envie o Saldo Inicial mascarado como transação).

## Risco
O motor de processamento fará os splits corretamente em centavos. Se houver alguma transação legitima de valor redondo (ex: `101 reais` vindo como `<TRNAMT>101`), ela viraria `1.01`. Porém, os bancos que exportam sem ponto/vírgula o fazem universalmente para os centavos, então a leitura correta deles é `1.01`. Bancos normais sempre mandam `101.00`, que passará incólume.
