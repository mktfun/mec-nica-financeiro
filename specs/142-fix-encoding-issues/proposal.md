# Proposal: Fix Global Encoding Issues (Spec 142)

## Problema
Em um evento passado não-rastreado, uma grande parte da base de código foi corrompida devido a conflito de enconding UTF-8 vs ISO-8859-1. As maiores vítimas foram os tildes (til) do português. A letra `ã` foi globalmente convertida em `Á`. A string `ção` converteu-se em `ção`. 
Isso causou danos puramente textuais e visuais (strings estáticas da UI do React) e, potencialmente, algumas query strings no Supabase. O usuário não consegue exibir "Visão", "Não", "Atenção" ou "Conciliação".

## Solução Proposta
A execução cirúrgica de um script `Node.js` que aplica um mapa de expressões regulares (Regex) em todos os arquivos de extensão `.ts`, `.tsx`, `.md` e `.sql`. O Regex deve focar especificamente nas anomalias geradas pelo erro de encoding sem comprometer palavras legítimas como "ANÁLISE", "BANCÁRIO" ou "GRÁFICO", as quais usam a letra `Á` com acento agudo correto.
O plano envolverá:
1. `çã` → `çã` (e capitalizadas)
2. `ão` → `ão` (e capitalizadas)
3. Correções duras como `amanhÁ` → `amanhã` e `órfãs` → `órfãs`.
