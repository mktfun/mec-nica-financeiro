# Phase 1: Research - Correção de OFX Malformado (BALAMT em Centavos)

## Contexto
O usuário reportou que após limpar o banco, os "Saldos Reais" das lojas continuaram exibindo números milionários ou absurdos (ex: `R$ 2.210.992,00` ou `-R$ 5.003.957,00`). E também forneceu um arquivo OFX de exemplo `Extrato_JAB.ofx`.

## Análise do OFX
O arquivo `Extrato_JAB.ofx` mostra:
```xml
<TRNAMT>15459.42
...
<LEDGERBAL>
<BALAMT>1751833
```
- A tag `<TRNAMT>` (Transações) possui formatação correta com ponto decimal (`.`).
- A tag `<BALAMT>` (Saldo) não possui ponto decimal, vindo como um inteiro longo.

## Causa Raiz
O software/banco que gera os arquivos OFX do usuário (que gerencia mais de 10 lojas) possui um bug no parser de exportação: ele exporta o saldo (`<BALAMT>`) **em centavos** sem o separador decimal (ou seja, omite o ponto antes das duas últimas casas).
- `1751833` lido como Float no JS vira `1751833.00` (1.7 Milhões).
- O valor real é `17518.33` (Dezessete mil reais).

## Solução (Heurística de OFX)
Devido ao padrão da moeda BRL (Reais), sempre usamos 2 casas decimais. Se a tag `<BALAMT>` for um número sem NENHUM caractere separador (sem `.` e sem `,`), devemos assumir que ele foi exportado diretamente da representação em centavos.
- A heurística irá detectar a ausência de pontuação.
- Se não houver pontuação, pegamos o valor e dividimos por 100.
- Se houver `.` ou `,`, executamos o `parseFloat` padrão.
