export interface OfxTransaction {
  storeName: string;
  amount: number;
  type: 'in' | 'out';
  date: string;
  title: string;
  fitid?: string;
  cnpj_cpf?: string;
  counterpart_name?: string;
}

export interface OfxParseResult {
  alias: string;
  transactions: OfxTransaction[];
  bankBalance?: number;
  previousBalance?: number;
  fileName?: string;
}

// Extracts CPF (000.000.000-00) or CNPJ (00.000.000/0000-00) from the end of a MEMO string
function extractDocument(memo: string): { doc: string | undefined; name: string | undefined } {
  const cnpjMatch = memo.match(/(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})\s*$/);
  if (cnpjMatch) {
    const doc = cnpjMatch[1];
    const name = memo.replace(cnpjMatch[0], '').trim().replace(/\s+/g, ' ');
    return { doc, name: name || undefined };
  }
  const cpfMatch = memo.match(/(\d{3}\.\d{3}\.\d{3}-\d{2})\s*$/);
  if (cpfMatch) {
    const doc = cpfMatch[1];
    const name = memo.replace(cpfMatch[0], '').trim().replace(/\s+/g, ' ');
    return { doc, name: name || undefined };
  }
  return { doc: undefined, name: undefined };
}

export async function parseOFXFile(file: File): Promise<OfxParseResult> {
  const text = await file.text();
  
  // Tenta achar a tag ORG (Banco) e ACCTID (Conta)
  const orgMatch = text.match(/<ORG>(.+?)(?:\r?\n|<)/);
  const acctMatch = text.match(/<ACCTID>(.+?)(?:\r?\n|<)/);
  
  const banco = orgMatch ? orgMatch[1].trim() : 'BANCO DESCONHECIDO';
  const conta = acctMatch ? acctMatch[1].trim() : 'CONTA DESCONHECIDA';
  
  // O alias gerado será "BANCO - CONTA"
  const alias = `${banco} - ${conta}`;
  
  const transactions: OfxTransaction[] = [];
  let previousBalance: number | undefined;
  
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
    
    // Extract FITID (unique transaction ID from bank)
    const fitidMatch = trnBlock.match(/<FITID>([^\r\n<]+)/);
    const fitid = fitidMatch ? fitidMatch[1].trim() : undefined;
    
    // Extract DTPOSTED
    const dtMatch = trnBlock.match(/<DTPOSTED>([^\r\n<]+)/);
    let dateStr = new Date().toISOString();
    if (dtMatch) {
      const rawDate = dtMatch[1].trim();
      // Format usually YYYYMMDDHHMMSS or YYYYMMDDHHMMSS[-03:EST]
      const cleanDate = rawDate.replace(/\[.*\]/, '').trim();
      if (cleanDate.length >= 8) {
        const yyyy = cleanDate.substring(0, 4);
        const mm = cleanDate.substring(4, 6);
        const dd = cleanDate.substring(6, 8);
        let hh = '00', min = '00', ss = '00';
        if (cleanDate.length >= 14) {
          hh = cleanDate.substring(8, 10);
          min = cleanDate.substring(10, 12);
          ss = cleanDate.substring(12, 14);
        }
        dateStr = `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}Z`;
      }
    }
    
    // Extract MEMO
    const memoMatch = trnBlock.match(/<MEMO>([^\r\n<]+)/);
    const rawMemo = memoMatch ? memoMatch[1].trim() : 'Transação Bancária';
    
    // Capture SALDO ANTERIOR before filtering it out
    if (rawMemo.toUpperCase().includes('SALDO ANTERIOR')) {
      previousBalance = Math.abs(amount);
      continue; // Don't add as transaction
    }
    
    // Filter other junk/balance entries
    const JUNK = ['SALDO TOTAL', 'SALDO DISPONIVEL', 'SALDO DISPONÍVEL', 'SALDO INICIAL', 'DISPONÍVEL DIA'];
    if (JUNK.some(k => rawMemo.toUpperCase().includes(k.toUpperCase()))) continue;
    
    // Extract CPF/CNPJ and counterpart name from memo
    const { doc, name } = extractDocument(rawMemo);
    
    // Extract TRNTYPE
    const typeMatch = trnBlock.match(/<TRNTYPE>([A-Z]+)/);
    const trnType = typeMatch ? typeMatch[1].trim() : '';
    let parsedType: 'in' | 'out' = amount >= 0 ? 'in' : 'out';
    if (trnType === 'DEBIT' || trnType === 'SRVCHG' || trnType === 'PAYMENT') {
      parsedType = 'out';
    } else if (trnType === 'CREDIT' || trnType === 'DEP') {
      parsedType = 'in';
    }
    
    transactions.push({
      storeName: alias,
      amount: amount,
      type: parsedType,
      date: dateStr,
      title: rawMemo,
      fitid,
      cnpj_cpf: doc,
      counterpart_name: name,
    });
  }
  
  // LEDGERBAL = actual account balance
  let bankBalance: number | undefined;
  const ledgerMatch = text.match(/<LEDGERBAL>[\s\S]*?<BALAMT>([^\r\n<]+)/);
  if (ledgerMatch) {
    const balStr = ledgerMatch[1].trim();
    // Brazilian OFX uses decimal point or comma — never assume centavos for integers
    let balNum = parseFloat(balStr.replace(',', '.'));
    if (isNaN(balNum)) balNum = parseInt(balStr, 10);
    if (!isNaN(balNum)) {
      bankBalance = balNum;
    }
  }

  return { alias, transactions, bankBalance, previousBalance, fileName: file.name };
}
