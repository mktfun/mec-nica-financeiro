# Design: Encoding Issue Fix

O mecanismo de reparo será um utilitário escrito em `node` usando `fs` e regex. O script rodará no diretório raiz e percorrerá todas as pastas (ignorando `node_modules`, `dist` e `.git`).

## Regras de Regex a aplicar:

1. `/çã/g` → `çã` (já executado parcialmente, mas aplicaremos por garantia).
2. `/ÇÃ/g` → `ÇÃ`
3. `/ão/g` → `ão`
4. `/ÃO/g` → `ÃO`
5. `/amanhÁ\b/g` → `amanhã`
6. `/AmanhÁ\b/g` → `Amanhã`
7. `/órfãs\b/g` → `órfãs`
8. `/rfãos\b/g` → `órfãos`
9. `/rfão\b/g` → `órfão`
10. `/mãe\b/g` → `mãe`
11. `/Mãe\b/g` → `Mãe`

## Considerações
Nenhuma destas regras de regex é destrutiva, pois não existem palavras legítimas na língua portuguesa com a sintaxe `ão`, `ÃO`, nem terminações exatas como `amanhÁ`.
A aplicação é puramente visual em `.tsx` e `.md` (e alguns `.sql` de schema) para evitar conflitos de sintaxe com o React e TypeScript.
