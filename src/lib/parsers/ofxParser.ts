export interface OfxTransaction {
  storeName: string;
  amount: number;
  type: 'OFX';
  date: string;
  title: string;
}

export async function parseOFXFile(file: File): Promise<OfxTransaction[]> {
  const text = await file.text();
  
  // Tenta achar a tag ORG (Banco) e ACCTID (Conta)
  const orgMatch = text.match(/<ORG>(.+?)(?:\r?\n|<)/);
  const acctMatch = text.match(/<ACCTID>(.+?)(?:\r?\n|<)/);
  
  const banco = orgMatch ? orgMatch[1].trim() : 'BANCO DESCONHECIDO';
  const conta = acctMatch ? acctMatch[1].trim() : 'CONTA DESCONHECIDA';
  
  // O alias gerado será "BANCO - CONTA"
  const alias = `${banco} - ${conta}`;
  
  const transactions: OfxTransaction[] = [];
  
  // Regex to match each STMTTRN block
  const stmtTrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g;
  let match;
  
  while ((match = stmtTrnRegex.exec(text)) !== null) {
    const trnBlock = match[1];
    
    // Extract TRNAMT
    const amtMatch = trnBlock.match(/<TRNAMT>([^\r\n<]+)/);
    const amountStr = amtMatch ? amtMatch[1].trim() : '0';
    const amount = parseFloat(amountStr.replace(',', '.'));
    
    if (isNaN(amount)) continue;
    
    // Extract DTPOSTED
    const dtMatch = trnBlock.match(/<DTPOSTED>([^\r\n<]+)/);
    let dateStr = new Date().toISOString();
    if (dtMatch) {
      const rawDate = dtMatch[1].trim();
      // Format usually YYYYMMDDHHMMSS
      if (rawDate.length >= 8) {
        const yyyy = rawDate.substring(0, 4);
        const mm = rawDate.substring(4, 6);
        const dd = rawDate.substring(6, 8);
        let hh = '00', min = '00', ss = '00';
        if (rawDate.length >= 14) {
          hh = rawDate.substring(8, 10);
          min = rawDate.substring(10, 12);
          ss = rawDate.substring(12, 14);
        }
        dateStr = `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}Z`;
      }
    }
    
    // Extract MEMO
    const memoMatch = trnBlock.match(/<MEMO>([^\r\n<]+)/);
    const title = memoMatch ? memoMatch[1].trim() : 'Transação Bancária';
    
    transactions.push({
      storeName: alias,
      amount: Math.abs(amount), // Guardaremos o valor absoluto
      type: 'OFX',
      date: dateStr,
      title: title
    });
  }
  
  return transactions;
}
