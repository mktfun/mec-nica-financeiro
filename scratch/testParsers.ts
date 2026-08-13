import fs from 'fs';
import { generateDeterministicHash } from '../src/lib/parsers/hashUtils';

console.log("=== VULNERABILITY 1: HASH COLLISION (hashUtils) ===");
const tx1 = generateDeterministicHash('2026-08-13T10:00:00Z', 50.00, 'PIX RECEBIDO', 'ofx');
const tx2 = generateDeterministicHash('2026-08-13T14:30:00Z', 50.00, 'PIX RECEBIDO', 'ofx');
console.log(`Tx1 (10:00): ${tx1}`);
console.log(`Tx2 (14:30): ${tx2}`);
console.log(`Colisao? ${tx1 === tx2}`);

console.log("\n=== VULNERABILITY 2: EXCEL US FORMAT (Marco Zero) ===");
const cleanNumber = (val: any): number => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const str = String(val).replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
};
console.log(`BR format (1.000,50): ${cleanNumber('1.000,50')}`);
console.log(`US format (1000.50) from Excel engine: ${cleanNumber('1000.50')}`); // Should be 1000.50, but becomes 100050!

console.log("\n=== VULNERABILITY 3: OFX CENTS DIVISION (ofxParser) ===");
const parseOfxAmount = (amountStr: string) => {
    let amount = parseFloat(amountStr.replace(',', '.'));
    const hasDecimalSeparator = amountStr.includes('.') || amountStr.includes(',');
    if (!hasDecimalSeparator && Math.abs(amount) > 100) {
      amount = amount / 100;
    }
    return amount;
};
console.log(`OFX sending 15000 (R$ 150,00 in cents): ${parseOfxAmount('15000')}`);
console.log(`OFX sending 150 (R$ 150,00 flat, no cents): ${parseOfxAmount('150')}`); // Becomes 1.50!!
console.log(`OFX sending 100 (R$ 100,00 flat, no cents): ${parseOfxAmount('100')}`); // Stays 100 (because > 100 is false, so >= 101 gets divided, 100 doesn't). Inconsistent!
