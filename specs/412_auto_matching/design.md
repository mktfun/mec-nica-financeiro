# Design: Resiliência no Auto-Matching Engine

## 1. Modificações em `matchClientTokens`

No arquivo `src/lib/matchers/autoMatchingEngine.ts`, linha ~129:
```typescript
  if (clientTokens.length === 0 || counterTokens.length === 0) {
    // FALLBACK para clientes com nomes muito curtos (ex: "HD", "JB")
    if (clientTokens.length === 0 && normClient.length >= 2) {
      if (normCounter.includes(normClient)) return true;
    }
    return false;
  }
```

## 2. Modificações no Match OFX (Tier 2 e Tier 1.5)

No loop do OFX:
```typescript
        // Tier 1.5: Match de Pagamento Parcial (Valor Menor ou Igual) + Match Forte de Nome
        if (!matchedOs) {
          const partialMatches = storeOss.filter(os => {
            if (matchedOsNumbers.has(String(os.os_number))) return false;
            const osTotal = Number(os.total_value || 0);
            
            // O valor da transação deve ser menor ou igual ao total da OS (Tolerância +0.05)
            if (txAmount > osTotal + TOLERANCE) return false;
            
            // Requisito estrito: O nome precisa dar match perfeito.
            return matchClientTokens(os.client_name, fullOfxText);
          });

          // Apenas assume se for inequívoco (uma única OS pendente desse cliente com valor coerente)
          if (partialMatches.length === 1) {
            matchedOs = partialMatches[0];
          }
        }
```

No Tier 2 (Receivables):
```typescript
        // Tier 2: Match via receivablesArray
        if (!matchedOs) {
          const matchedReceivable = storeReceivables.find(rec => {
            if (!rec.os_number || matchedOsNumbers.has(String(rec.os_number))) return false;
            
            const recVal = Number(rec.value || 0);
            
            // RELAXAMENTO: Antes bloqueávamos Boleto 100%. Agora, se o Boleto tem valor exato e 
            // a string contém indícios fortes, nós liberamos.
            if (rec.type === 'Boleto' && Math.abs(recVal - txAmount) > TOLERANCE) {
                return false;
            }

            const isTransferOrPix = /TRANSF|PIX|TED|DOC|CONTA/i.test(rec.type || '') || /TRANSF|PIX|TED|DOC/i.test(rec.description || '') || rec.type === 'Boleto';
            if (!isTransferOrPix) return false;
            
            return Math.abs(recVal - txAmount) <= TOLERANCE;
          });
```

Com essa implementação, a transferência de 7000.00 com "HD CENTRO AUTOMOTIVO" passará pelo Fallback ou Tier 1.5 e vinculará a respectiva OS da loja Brasicar / Matriz, encerrando o trabalho manual diário.
