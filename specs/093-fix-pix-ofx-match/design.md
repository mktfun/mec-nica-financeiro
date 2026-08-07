# Design: Algoritmo de Conciliação Tolerante (093-fix-pix-ofx-match)

## Arquitetura Técnica
A alteração central fica em `src/hooks/useConciliacao.ts` na função `useModulo1StoresData`. 

Atualmente temos algo como:
```typescript
const storeTxs = transactions.filter(t => t.store_id === store.id);
```

Precisamos introduzir as transações bancárias "óórfãs" (onde o extrato não sabe a loja) para serem avaliadas pela heurística de conciliação do PIX:
```typescript
const allTxsForMatch = transactions.filter(t => 
  t.store_id === store.id || (t.source === 'ofx' && t.store_id === null)
);
```

## Componentes / Hooks / Funções
1. **`useModulo1StoresData` (Hook)**
   - O array que busca `ofxPixTxs` deve olhar para todas as entradas de OFX elegíveis.
   - O objeto retornado deve expor de forma granulada: 
     - `pix_expectativa`: Total em R$ gerado pelas OSs com método PIX.
     - `pix_ofx_matched`: Total em R$ do OFX que de fato fez match com a expectativa.
     - `faturamento_atual`: Passa a ser a soma exclusiva de dados validados (`cartao_ofx_matched + pix_ofx_matched`).

2. **`conciliacao.index.tsx` (Componente UI)**
   - Coluna **Maquininha**: Exibe expectativa das Redes (`storeMod1?.cartao_entrou`).
   - Coluna **PIX**: Exibe expectativa das OSs (`storeMod1?.pix_expectativa`).
   - Coluna **Faturamento**: Exibe `storeMod1?.faturamento_atual`.
   - Coluna **Diferença**: Matemática pura de `((Maquininha + PIX) - Faturamento)`.
   - O sistema perdoa resíduos menores que R$ 1,00 para impedir "falsos alertas" gerados por dízimas ou quebras financeiras.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1:** Extrato Itaú sobe R$ 500,00 via PIX (sem loja vinculada). O lojista cria uma OS informando pagamento de R$ 500,00 no PIX para a "Loja Norte". 
  - Antes: O sistema ignorava e a "Diferença" ficava de 500 reais.
  - Depois: O algoritmo casa as informações, zera a diferença e mostra "Faturamento: R$ 500,00".
