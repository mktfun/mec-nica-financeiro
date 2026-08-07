# Design: Proteção de Parsing OFX (100)

## 1. `src/lib/parsers/ofxParser.ts`
Localizar a extração primária de `TRNAMT` na linha ~62:
```typescript
const amtMatch = trnBlock.match(/<TRNAMT>([^\r\n<]+)/);
const amountStr = amtMatch ? amtMatch[1].trim() : '0';
let amount = parseFloat(amountStr.replace(',', '.'));

// FIX INJETADO:
const hasDecimalSeparator = amountStr.includes('.') || amountStr.includes(',');
if (!hasDecimalSeparator && Math.abs(amount) > 100) {
  amount = amount / 100;
}
```
Isso resolverá todas as transações, bem como a extração automática de "SALDO ANTERIOR" (que lê esse mesmo `amount`).

## 2. Atualização das Transações Existentes (Consequência Visual)
Apenas alterar o Parser resolverá o problema para **novos arquivos importados**. O usuário verá os dados antigos (de 10 milhões) nas telas anteriores a menos que ele limpe a base. A instrução do arquivo é apenas avisar ao usuário para apagar o import (via banco ou funcionalidade de limpar o dia) e fazer o upload do OFX novamente, já que a base de dados em `transactions` atualmente contem os 12 milhões consolidados.
