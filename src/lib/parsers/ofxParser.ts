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
  accountLimit?: number;
  fileName?: string;
}

import { traceLog } from '../logger';
import { generateDeterministicHash } from './hashUtils';
import { extractNumber } from './numberUtils';

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

export async function parseOFXFile(file: File, options?: { sessionId?: string }): Promise<OfxParseResult> {
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
  
  const hashOccurrences = new Map<string, number>();
  
  while ((match = stmtTrnRegex.exec(text)) !== null) {
    const trnBlock = match[1];
    
    // Extract TRNAMT
    const amtMatch = trnBlock.match(/<TRNAMT>([^\r\n<]+)/);
    let amount = 0;
    if (amtMatch) {
      const rawValue = amtMatch[1].trim();
      const cleanStr = rawValue.replace(',', '.').trim();
      const parsedFloat = parseFloat(cleanStr);
      if (!isNaN(parsedFloat)) {
        amount = Math.round(parsedFloat * 100) / 100;
      }
    }
    
    if (isNaN(amount) || amount === 0) continue;
    
    // Extract FITID (unique transaction ID from bank) - Ignore it and use deterministic hash
    const fitidMatch = trnBlock.match(/<FITID>([^\r\n<]+)/);
    const originalFitid = fitidMatch ? fitidMatch[1].trim() : undefined;
    
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
    
    let deterministicFitid = generateDeterministicHash(dateStr, amount, rawMemo, 'ofx');
    const count = (hashOccurrences.get(deterministicFitid) || 0) + 1;
    hashOccurrences.set(deterministicFitid, count);
    if (count > 1) {
      deterministicFitid = `${deterministicFitid}_${count}`;
    }
    
    transactions.push({
      storeName: alias,
      amount: amount,
      type: parsedType,
      date: dateStr,
      title: rawMemo,
      fitid: deterministicFitid,
      cnpj_cpf: doc,
      counterpart_name: name,
    });
  }
  
  // LEDGERBAL = actual account balance
  let bankBalance: number | undefined;
  const ledgerMatch = text.match(/<LEDGERBAL>[\s\S]*?<BALAMT>([^\r\n<]+)/);
  if (ledgerMatch) {
    const rawValue = ledgerMatch[1].trim();
    // 1. Substitui vírgula por ponto se necessário
    let cleanStr = rawValue.replace(',', '.').trim();
    // 2. Faz o parse para Float
    let parsedFloat = parseFloat(cleanStr);
    
    if (!isNaN(parsedFloat)) {
      // Itaú missing dot heuristic:
      if (!cleanStr.includes('.') && !cleanStr.includes(',')) {
        const option100 = parsedFloat / 100;
        const option10 = parsedFloat / 10;
        const option1 = parsedFloat;

        if (previousBalance !== undefined) {
          const sumTx = transactions.reduce((acc, t) => acc + t.amount, 0);
          const expectedBalance = previousBalance + sumTx;
          const expectedBalanceNeg = -previousBalance + sumTx;

          // Encontra a opção que tem a menor diferença para o saldo esperado
          const diffs = [
            { val: option100, diff: Math.min(Math.abs(option100 - expectedBalance), Math.abs(option100 - expectedBalanceNeg)) },
            { val: option10, diff: Math.min(Math.abs(option10 - expectedBalance), Math.abs(option10 - expectedBalanceNeg)) },
            { val: option1, diff: Math.min(Math.abs(option1 - expectedBalance), Math.abs(option1 - expectedBalanceNeg)) }
          ];
          diffs.sort((a, b) => a.diff - b.diff);
          parsedFloat = diffs[0].val;
        } else {
          // Fallback seguro: a maioria dos casos sem ponto são centavos exatos (ex: 1309322 -> 13093.22)
          parsedFloat = parsedFloat / 100;
        }
      }

      // 3. Converte para centavos de forma matemática segura
      const cents = Math.round(parsedFloat * 100);
      // Retorna em Reais para salvar na coluna do banco
      bankBalance = cents / 100;
    }
  }

  let accountLimit: number | undefined;
  const overdraftMatch = text.match(/<OVERDRAFTLIMIT>([^\r\n<]+)/);
  const creditMatch = text.match(/<CREDITLIMIT>([^\r\n<]+)/);
  if (overdraftMatch) {
    const rawValue = overdraftMatch[1].trim();
    const cleanStr = rawValue.replace(',', '.').trim();
    const parsedFloat = parseFloat(cleanStr);
    if (!isNaN(parsedFloat)) {
      accountLimit = Math.abs(Math.round(parsedFloat * 100) / 100);
    }
  } else if (creditMatch) {
    const rawValue = creditMatch[1].trim();
    const cleanStr = rawValue.replace(',', '.').trim();
    const parsedFloat = parseFloat(cleanStr);
    if (!isNaN(parsedFloat)) {
      accountLimit = Math.abs(Math.round(parsedFloat * 100) / 100);
    }
  }

  if (options?.sessionId) {
    traceLog('2_EXTRACTION_OFX', 'DEBUG', 'Extração de transações do OFX concluída', options.sessionId, {
      bank_id: banco,
      account_id: conta,
      total_transactions_found: transactions.length,
      extracted_values: transactions.map(t => ({
        fitid: t.fitid,
        date: t.date,
        amount: t.amount,
        type: t.type
      }))
    });
  }

  return { alias, transactions, bankBalance, previousBalance, accountLimit, fileName: file.name };
}
