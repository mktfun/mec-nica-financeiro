# Design: Correção Estrutural do Parser Marco Zero (167)

## Arquitetura Técnica
`marcoZeroParser.ts` -> Lógica alterada para Stateful Parser (Lê a linha -> Checa se é loja válida -> Se sim, guarda como Store Ativa -> Se não, avalia se a Store Ativa pode absorver o valor baseado no rótulo da linha).
O `REDE_STORE_MAPPING` será a única fonte da verdade para decidir se uma linha é uma Loja Nova ou não.

## Interfaces TypeScript
```typescript
// Não há mudanças na interface, mas a função getOrCreateStore muda.
const isKnownStore = (rawName: string): string | null => {
  const norm = rawName.trim().toLowerCase();
  // Se bater perfeitamente com as chaves ou valores do mapping
  if (REDE_STORE_MAPPING[norm]) return REDE_STORE_MAPPING[norm];
  const val = Object.values(REDE_STORE_MAPPING).find(v => v.toLowerCase() === norm);
  if (val) return val;
  
  // Fuzzy match de segurança (se tiver a palavra-chave forte)
  if (norm.includes('santo andr')) return REDE_STORE_MAPPING['mpsantoandre'];
  if (norm.includes('kennedy')) return REDE_STORE_MAPPING['mpkennedy'];
  if (norm.includes('jabaquara')) return REDE_STORE_MAPPING['mpjabaquara'];
  if (norm.includes('maua') || norm.includes('mauá')) return REDE_STORE_MAPPING['reidooleomaua'];
  if (norm.includes('piraporinha')) return REDE_STORE_MAPPING['mppiraporinha'];
  if (norm.includes('planalto')) return REDE_STORE_MAPPING['mpplanalto'];
  if (norm.includes('rudge')) return REDE_STORE_MAPPING['mprudge'];
  if (norm.includes('beretta')) return REDE_STORE_MAPPING['mpjorgeberetta'];
  if (norm.includes('módulo') || norm.includes('modulo')) return REDE_STORE_MAPPING['reidomodulo'];
  
  return null;
}
```

## Componentes / Hooks / Funções
1. **`src/lib/parsers/marcoZeroParser.ts`**: Alterar o laço das abas (SALDO e OS). Introduzir `let activeStore: MarcoZeroExtraction | null = null;`. Para cada linha, testar a primeira e segunda coluna. Se retornar valor válido no `isKnownStore`, atualizar `activeStore`. 
Se não for uma loja, testar os identificadores da linha ("DINHEIRO", "A RECEBER", "CAIXA", etc) e extrair o valor da coluna 3 (D) para salvar no `activeStore`.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- Cenário 1: [Linha com nome "Cartão Débito"] → [ação: Parser lê o nome e não acha nas Lojas] → [resultado esperado: Checa se tem loja ativa. Vê que "Cartão Débito" pode ser "A RECEBER". Extrai o valor de Coluna D e soma no A Receber da loja ativa.]
- Cenário 2: [Linha com nome "Mauá"] → [ação: Parser bate com fuzzy match] → [resultado esperado: Cria `activeStore` chamado "Maua - MHE" e segue para a próxima linha].
