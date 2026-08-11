# Design: Marco Zero Auto-Store Mapping (166)

## Arquitetura Técnica
`marcoZeroParser.ts` -> Varre a planilha linha a linha identificando nomes de lojas -> Agrupa saldos e OSs em dicionários por Loja -> Retorna `MarcoZeroExtraction[]` com `storeName` -> `MarcoZeroWizard.tsx` recebe as extrações e usa `useStores` para auto-selecionar o `storeId` usando `normalizeRedeStoreName` -> Wizard salva lote iterando as extrações válidas.

## Interfaces TypeScript
```typescript
export interface MarcoZeroExtraction {
  storeName: string; // Trocado de sheetName para storeName
  dinheiroMp: number;
  aReceber: number;
  negativo: number;
  caixaAnterior: number;
  osPendentes: { numero_os: string; data_os: string; valor_os: number }[];
}
```

## Componentes / Hooks / Funções
1. **`src/lib/parsers/marcoZeroParser.ts`**: Alterar lógica de parsing para iterar em blocos ou em linhas de lojas usando a coluna de índice (A) como identificador.
2. **`src/components/importacoes/MarcoZeroWizard.tsx`**: Atualizar a visualização (`extraction.storeName` ao invés de `sheetName`) e executar um `useEffect` na inicialização para mapear `extraction.storeName` contra `stores.name` de forma difusa (ex: usando `normalizeRedeStoreName` se necessário).

## Fluxo de UI
1. O usuário anexa a planilha "CONCILIAÇÃO 1008.xlsx".
2. O sistema extrai e mostra a lista de LOJAS (e não de Abas).
3. Cada bloco exibe o nome da loja extraído (Ex: "Santo André - HD") e o "Vincular Loja" **já vem preenchido** com a loja correta do banco.
4. O usuário apenas dá um scroll de verificação visual e clica em "Importar e Finalizar".

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- Cenário 1: [Lojas com nomes perfeitos] → [Upload planilha] → [Todos os dropdowns "Vincular Loja" são auto-selecionados].
- Cenário 2: [Loja não identificada] → [Upload planilha] → [Select daquela loja fica "Selecione..." forçando escolha manual].
- Cenário 3: [Aba de OSs com múltiplas lojas] → [O parser agrupa todas as OSs pela loja contida na linha, enviando corretamente para a caixa daquela loja].
