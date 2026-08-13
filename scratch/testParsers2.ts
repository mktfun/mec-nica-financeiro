import { generateDeterministicHash } from '../src/lib/parsers/hashUtils';

const dt1 = '2026-08-13T00:00:00Z'; // PIX 1
const dt2 = '2026-08-13T00:00:00Z'; // PIX 2 on the same day, bank didn't send time
const tx1 = generateDeterministicHash(dt1, 50.00, 'PIX RECEBIDO', 'ofx');
const tx2 = generateDeterministicHash(dt2, 50.00, 'PIX RECEBIDO', 'ofx');
console.log(`Tx1: ${tx1}`);
console.log(`Tx2: ${tx2}`);
console.log(`Colisao de PIXs identicos no mesmo dia? ${tx1 === tx2}`);
