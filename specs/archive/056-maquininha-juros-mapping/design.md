# Design: Maquininha and Juros Mapping and Sum (056)

## Arquitetura Técnica
(User Upload) -> `useCentralImport.ts` / `useExpenseImportProcessor.ts` -> `redeParser.ts` / `jurosRedeParser.ts`
Dentro dos parsers, o nome da loja extraído (ex: `MPSantoAndre`) passa pelo novo módulo utilitário `storeMapping.ts`.
Se o mapeamento retornar `"IGNORAR"`, a transaçÁo/linha/bloco é descartada em tempo de parse (via `continue` no loop).
Caso contrário, o nome bruto é substituído pelo nome oficial (ex: `Santo André - HD`), garantindo que a base de dados receba o nome unificado e consiga fazer match imediato com a OS e OFX.

## Interfaces TypeScript
```typescript
// src/lib/parsers/storeMapping.ts
export const REDE_STORE_MAPPING: Record<string, string> = {
  "mpsantoandre": "Santo André - HD",
  "mpjabaquara": "Jabaquara - JAB",
  "mpjorgeberetta": "Jorge Beretta - DHJV",
  "reidooleomaua": "Maua - MHE",
  "mpkennedy": "Kennedy - MP",
  "mppiraporinha": "Piraporinha - EMPORIO",
  "mpplanalto": "Planalto - BRASICAR",
  "reidomodulo": "Rei do Módulo - MP",
  "mprudge": "Rudge Ramos - CAP",
  "mpdompedro1": "Dom Pedro - DP",
  "visa": "IGNORAR",
  "mastercard": "IGNORAR",
  "-": "IGNORAR",
  "elo": "IGNORAR",
  "mhe mp": "IGNORAR",
  "kennedy mp": "IGNORAR",
  "brasicar mp": "IGNORAR",
  "emporio mp": "IGNORAR",
  "rei do modulo mp": "IGNORAR",
  "hd mp": "IGNORAR",
  "dom pedro mp": "IGNORAR",
  "jorge beretta mp": "IGNORAR"
};

export function normalizeRedeStoreName(rawName: string): string {
  const normalized = rawName.trim().toLowerCase();
  if (REDE_STORE_MAPPING[normalized]) {
    return REDE_STORE_MAPPING[normalized];
  }
  return rawName.trim(); // Se nÁo encontrar, retorna o original limpo
}
```

## Componentes / Hooks / Funções
- `src/lib/parsers/storeMapping.ts` [NEW]: Dicionário e funçÁo de normalizaçÁo.
- `src/lib/parsers/redeParser.ts` [MODIFY]: Importar e aplicar `normalizeRedeStoreName(storeName)`. Se retorno for `"IGNORAR"`, aplicar `continue`.
- `src/lib/parsers/jurosRedeParser.ts` [MODIFY]: Importar e aplicar `normalizeRedeStoreName(block.name)`. Se retorno for `"IGNORAR"`, aplicar `continue`.

## Fluxo de UI
1. Usuário entra em "ImportaçÁo" e arrasta os arquivos da Rede e de Juros.
2. O sistema faz o parse e filtra dezenas de "lojas falsas" (Visa, Mastercard, etc.).
3. O preview limpo é exibido mostrando apenas as lojas mapeadas com seus valores reais e juros retidos.
4. Ao clicar em Importar, os Juros vÁo para `transactions` perfeitamente alocados.

## Cenários de VerificaçÁo (SCAN → INFER → VERIFY → FIX)
- **Cenário 1:** [Upload arquivo com linha "Visa"] → [Parser] → [Dicionário retorna "IGNORAR"] → [Linha nÁo entra no array de transactions].
- **Cenário 2:** [Upload arquivo Juros com loja "MPSantoAndre"] → [Parser] → [Dicionário converte para "Santo André - HD"] → [Salva no DB como "Santo André - HD"].
