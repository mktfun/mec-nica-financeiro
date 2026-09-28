export interface OfxTransaction {
  storeName: string;
  amount: number;
  type: 'in' | 'out';
  date: string;
  title: string;
  fitid?: string;
  cnpj_cpf?: string;
  counterpart_name?: string;
  raw_memo?: string;
  raw_name?: string;
  bank_reference?: string;
  original_fitid?: string;
}

export type OfxBalanceRole = 'OPENING' | 'CLOSING' | 'LEDGER' | 'AVAILABLE';
export type OfxBalanceSourceKind = 'STMTTRN_MEMO' | 'LEDGERBAL' | 'AVAILBAL' | 'PRVBAL';

export interface OfxBalanceCandidate {
  accountKey: string;
  sourceKind: OfxBalanceSourceKind;
  balanceRole: OfxBalanceRole;
  memoRaw?: string;
  memoNormalized?: string;
  postedDate: string; // YYYY-MM-DD
  amount: number;
  amountCents: number;
  fitid?: string;
  rawText?: string;
  isOpening?: boolean;
  isClosing?: boolean;
}

export type BalanceSource = 
  | 'saldo_total_disponivel_dia' 
  | 'saldo_anterior_plus_tx' 
  | 'ledgerbal_exact' 
  | 'ledgerbal_fallback';

export interface OfxParseResult {
  alias: string;
  accountKey?: string;
  bankId?: string;
  branchId?: string;
  accountId?: string;
  transactions: OfxTransaction[];
  balanceCandidates?: OfxBalanceCandidate[];
  bankBalance?: number;
  previousBalance?: number;
  previousBalanceDate?: string;
  accountLimit?: number;
  fileName?: string;
  closingDayBalance?: number;
  closingDayDate?: string;
  ledgerBalance?: number;
  ledgerBalanceDate?: string;
  availBalance?: number;
  availBalanceDate?: string;
  calculatedClosingBalance?: number;
  balanceSource?: BalanceSource;
}

export interface ParseOfxOptions {
  sessionId?: string;
  targetDate?: string;
}

// Normaliza texto de MEMO para comparação resiliente a variações de UTF-8 / Windows-1252 / acentos
export function normalizeMemoText(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacríticos (acentos)
    .replace(/[^a-zA-Z0-9\s]/g, ' ') // substitui símbolos e caracteres estranhos por espaço
    .replace(/\s+/g, ' ')           // colapsa múltiplos espaços em 1
    .trim()
    .toUpperCase();
}

// Detecção estrita de Saldo Anterior (SALDO ANTERIOR, etc.)
export function isPreviousBalanceMemo(norm: string): boolean {
  if (!norm) return false;
  return (
    norm.includes('SALDO ANTERIOR') ||
    norm.includes('SDO ANTERIOR') ||
    norm.includes('SLD ANTERIOR') ||
    norm.includes('SALDO INICIAL') ||
    norm.includes('DISPONIVEL ANTERIOR') ||
    norm.includes('DIA ANTERIOR')
  );
}

// Detecção estrita de Saldo do Dia (SALDO TOTAL DISPONÍVEL DIA, etc.)
export function isClosingDayBalanceMemo(norm: string): boolean {
  if (!norm) return false;
  if (isPreviousBalanceMemo(norm)) return false;
  return (
    /SALDO\s*(?:TOTAL)?\s*DISPON[^\n\r<]*?DIA/i.test(norm) ||
    /DISPONIVEL\s*DIA/i.test(norm) ||
    /SALDO\s*DO\s*DIA/i.test(norm) ||
    /SDO\s*(?:FDO|FIM|FINAL)/i.test(norm) ||
    /SALDO\s*FINAL/i.test(norm)
  );
}

import { traceLog } from '../logger.ts';
import { generateDeterministicHash } from './hashUtils.ts';
import { extractNumber } from './numberUtils.ts';

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

export function parseOFXContent(text: string, fileName: string = 'extrato.ofx', options?: ParseOfxOptions): OfxParseResult {
  // Tenta achar a tag ORG (Banco), BANKID, BRANCHID e ACCTID (Conta)
  const orgMatch = text.match(/<ORG>(.+?)(?:\r?\n|<)/i);
  const bankIdMatch = text.match(/<BANKID>(.+?)(?:\r?\n|<)/i);
  const branchIdMatch = text.match(/<BRANCHID>(.+?)(?:\r?\n|<)/i);
  const acctMatch = text.match(/<ACCTID>(.+?)(?:\r?\n|<)/i);
  
  let banco = orgMatch ? orgMatch[1].trim() : '';
  const bankId = bankIdMatch ? bankIdMatch[1].trim() : (banco || '0341');
  if (!banco || banco === 'BANCO DESCONHECIDO') {
    if (bankIdMatch && (bankIdMatch[1].trim() === '0341' || bankIdMatch[1].trim() === '341')) {
      banco = 'ITAU';
    } else {
      banco = 'ITAU';
    }
  }

  const rawAcct = acctMatch ? acctMatch[1].trim() : '';
  let conta = rawAcct;
  const branch = branchIdMatch ? branchIdMatch[1].trim().replace(/\D/g, '') : '';
  if (branch && conta && conta.replace(/\D/g, '').length < 8) {
    conta = `${branch}${conta.replace(/\D/g, '')}`;
  }
  
  // Fallback robusto por nome do arquivo: Extrato_0263_811531_03-09-2026.ofx ou 0263_811531
  const fnMatch = fileName.match(/Extrato_(\d{4})_(\d{5,8})/i) || fileName.match(/(\d{4})_(\d{5,8})/);
  if (fnMatch) {
    const combinedKey = `${fnMatch[1]}${fnMatch[2]}`;
    if (!conta || conta.replace(/\D/g, '').length < 8) {
      conta = combinedKey;
    }
  }

  if (!conta) {
    conta = 'CONTA DESCONHECIDA';
  }
  
  // O alias gerado será "BANCO - CONTA"
  const alias = `${banco} - ${conta}`;

  // Conta canônica identificada (ex: 7386_166586 ou 0263_811531)
  const cleanAcct = rawAcct ? rawAcct.replace(/\D/g, '') : conta.replace(/\D/g, '');
  const cleanBranch = branch ? branch.replace(/\D/g, '') : (fnMatch ? fnMatch[1] : '');
  const accountKey = cleanBranch && cleanAcct ? `${cleanBranch}_${cleanAcct}` : conta;
  
  const transactions: OfxTransaction[] = [];
  const balanceCandidates: OfxBalanceCandidate[] = [];
  let previousBalance: number | undefined;
  let previousBalanceDate: string | undefined;
  let closingDayBalance: number | undefined;
  let closingDayDate: string | undefined;
  
  // Extração de blocos STMTTRN suportando:
  // 1. Tags com fechamento </STMTTRN> (XML padrão)
  // 2. Tags abertas SGML sem fechamento (Itaú OFX 1.0)
  const stmtTrnBlocks: string[] = [];
  const stmtTrnWithClose = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let matchClose;
  while ((matchClose = stmtTrnWithClose.exec(text)) !== null) {
    stmtTrnBlocks.push(matchClose[1]);
  }

  if (stmtTrnBlocks.length === 0) {
    const bankTranListMatch = text.match(/<BANKTRANLIST>([\s\S]*?)(?:<\/BANKTRANLIST>|<LEDGERBAL>|<PRVBAL>|<AVAILBAL>|$)/i);
    const trnContent = bankTranListMatch ? bankTranListMatch[1] : text;
    const rawParts = trnContent.split(/<STMTTRN>/i);
    rawParts.shift(); // remove cabeçalho antes da 1a ocorrência
    rawParts.forEach(part => {
      const trimmed = part.trim();
      if (trimmed) stmtTrnBlocks.push(trimmed);
    });
  }
  
  const hashOccurrences = new Map<string, number>();
  
  for (const trnBlock of stmtTrnBlocks) {
    // Extract TRNAMT
    const amtMatch = trnBlock.match(/<TRNAMT>([^\r\n<]+)/i);
    let amount = 0;
    if (amtMatch) {
      const rawValue = amtMatch[1].trim();
      const cleanStr = rawValue.replace(',', '.').trim();
      const parsedFloat = parseFloat(cleanStr);
      if (!isNaN(parsedFloat)) {
        amount = Math.round(parsedFloat * 100) / 100;
      }
    }
    
    if (isNaN(amount)) continue;
    
    // Extract FITID (unique transaction ID from bank) - Ignore it and use deterministic hash
    const fitidMatch = trnBlock.match(/<FITID>([^\r\n<]+)/i);
    const originalFitid = fitidMatch ? fitidMatch[1].trim() : undefined;
    
    // Extract DTPOSTED
    const dtMatch = trnBlock.match(/<DTPOSTED>([^\r\n<]+)/i);
    let dateStr = new Date().toISOString();
    if (dtMatch) {
      const rawDate = dtMatch[1].trim();
      // Format usually YYYYMMDDHHMMSS ou YYYYMMDDHHMMSS[-03:EST]
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
    
    // Extract TRNTYPE
    const typeMatch = trnBlock.match(/<TRNTYPE>([A-Za-z]+)/i);
    const trnType = typeMatch ? typeMatch[1].trim().toUpperCase() : '';

    // Extract MEMO
    const memoMatch = trnBlock.match(/<MEMO>([^\r\n<]+)/i);
    const rawMemo = memoMatch ? memoMatch[1].trim() : 'Transação Bancária';
    const normMemo = normalizeMemoText(rawMemo);
    
    // Transações normais sem valor são ignoradas, mas linhas de saldo com valor 0.00 são candidatos válidos
    const isBalanceMemo = isPreviousBalanceMemo(normMemo) || isClosingDayBalanceMemo(normMemo);
    if (amount === 0 && !isBalanceMemo) {
      continue;
    }
    
    // 1. Capture SALDO ANTERIOR and opening variations (exclusivo para abertura)
    if (isPreviousBalanceMemo(normMemo)) {
      const val = (trnType === 'DEBIT' || trnType === 'SRVCHG' || amount < 0) ? -Math.abs(amount) : Math.abs(amount);
      const postDate = dateStr.substring(0, 10);
      previousBalance = val;
      previousBalanceDate = postDate;
      balanceCandidates.push({
        accountKey,
        sourceKind: 'STMTTRN_MEMO',
        balanceRole: 'OPENING',
        memoRaw: rawMemo,
        memoNormalized: normMemo,
        postedDate: postDate,
        amount: val,
        amountCents: Math.round(val * 100),
        fitid: originalFitid,
        isOpening: true,
      });
      continue; // Don't add as regular transaction
    }

    // 2. Capture SALDO TOTAL DISPONÍVEL DIA and variations (prioridade absoluta de fechamento)
    if (isClosingDayBalanceMemo(normMemo)) {
      const val = (trnType === 'DEBIT' || trnType === 'SRVCHG' || amount < 0) ? -Math.abs(amount) : Math.abs(amount);
      const postDate = dateStr.substring(0, 10);
      closingDayBalance = val;
      closingDayDate = postDate;
      balanceCandidates.push({
        accountKey,
        sourceKind: 'STMTTRN_MEMO',
        balanceRole: 'CLOSING',
        memoRaw: rawMemo,
        memoNormalized: normMemo,
        postedDate: postDate,
        amount: val,
        amountCents: Math.round(val * 100),
        fitid: originalFitid,
        isClosing: true,
      });
      continue; // Don't add as regular transaction
    }
    
    // 3. Filter other junk/balance summary entries (apenas APÓS checagem de fechamento e anterior)
    const isJunk = (
      normMemo === 'SALDO TOTAL' ||
      normMemo === 'SALDO DISPONIVEL' ||
      normMemo.startsWith('SALDO TOTAL ') ||
      normMemo.startsWith('SALDO DISPONIVEL ')
    );
    if (isJunk) {
      const val = (trnType === 'DEBIT' || trnType === 'SRVCHG' || amount < 0) ? -Math.abs(amount) : Math.abs(amount);
      const postDate = dateStr.substring(0, 10);
      balanceCandidates.push({
        accountKey,
        sourceKind: 'STMTTRN_MEMO',
        balanceRole: 'CLOSING',
        memoRaw: rawMemo,
        memoNormalized: normMemo,
        postedDate: postDate,
        amount: val,
        amountCents: Math.round(val * 100),
        fitid: originalFitid,
      });
      continue;
    }
    
    // Extract CPF/CNPJ and counterpart name from memo
    const { doc, name } = extractDocument(rawMemo);
    
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
    
    // Extract NAME
    const nameTagMatch = trnBlock.match(/<NAME>([^\r\n<]+)/i);
    const rawName = nameTagMatch ? nameTagMatch[1].trim() : undefined;

    // Extract CHECKNUM / REFNUM
    const checknumMatch = trnBlock.match(/<CHECKNUM>([^\r\n<]+)/i);
    const refnumMatch = trnBlock.match(/<REFNUM>([^\r\n<]+)/i);
    const bankReference = checknumMatch ? checknumMatch[1].trim() : (refnumMatch ? refnumMatch[1].trim() : undefined);

    transactions.push({
      storeName: alias,
      amount: amount,
      type: parsedType,
      date: dateStr,
      title: rawMemo,
      fitid: deterministicFitid,
      cnpj_cpf: doc,
      counterpart_name: name,
      raw_memo: rawMemo,
      raw_name: rawName,
      bank_reference: bankReference,
      original_fitid: originalFitid,
    });
  }
  
  // Check for native <PRVBAL> tag if previousBalance was not found in transactions
  const prvBalMatch = text.match(/<PRVBAL>[\s\S]*?<BALAMT>([^\r\n<]+)/i) || text.match(/<PRVBAL>([^\r\n<]+)/i);
  if (prvBalMatch) {
    const rawVal = prvBalMatch[1].trim().replace(',', '.');
    const parsed = parseFloat(rawVal);
    if (!isNaN(parsed)) {
      const parsedPrv = Math.round(parsed * 100) / 100;
      if (previousBalance === undefined) {
        previousBalance = parsedPrv;
      }
      const prvDtMatch = text.match(/<PRVBAL>[\s\S]*?<DTASOF>([^\r\n<]+)/i);
      let prvDate = previousBalanceDate;
      if (prvDtMatch) {
        const rawDt = prvDtMatch[1].trim().replace(/\[.*\]/, '').trim();
        if (rawDt.length >= 8) {
          prvDate = `${rawDt.substring(0, 4)}-${rawDt.substring(4, 6)}-${rawDt.substring(6, 8)}`;
        }
      }
      balanceCandidates.push({
        accountKey,
        sourceKind: 'PRVBAL',
        balanceRole: 'OPENING',
        postedDate: prvDate || (options?.targetDate || new Date().toISOString().substring(0, 10)),
        amount: parsedPrv,
        amountCents: Math.round(parsedPrv * 100),
        isOpening: true,
      });
    }
  }

  // Extração do <LEDGERBAL> e <DTASOF> (Saldo bruto do arquivo com data/hora)
  let ledgerBalance: number | undefined;
  let ledgerBalanceDate: string | undefined;
  const ledgerMatch = text.match(/<LEDGERBAL>[\s\S]*?<BALAMT>([^\r\n<]+)/i);
  if (ledgerMatch) {
    const rawValue = ledgerMatch[1].trim();
    let cleanStr = rawValue.replace(',', '.').trim();
    let parsedFloat = parseFloat(cleanStr);

    const dtAsOfMatch = text.match(/<LEDGERBAL>[\s\S]*?<DTASOF>([^\r\n<]+)/i);
    if (dtAsOfMatch) {
      const rawDt = dtAsOfMatch[1].trim().replace(/\[.*\]/, '').trim();
      if (rawDt.length >= 8) {
        ledgerBalanceDate = `${rawDt.substring(0, 4)}-${rawDt.substring(4, 6)}-${rawDt.substring(6, 8)}`;
      }
    }

    if (!isNaN(parsedFloat)) {
      // Itaú missing dot heuristic:
      if (!cleanStr.includes('.') && !cleanStr.includes(',')) {
        const option100 = parsedFloat / 100;
        const option10 = parsedFloat / 10;
        const option1 = parsedFloat;

        if (closingDayBalance !== undefined) {
          const diffs = [
            { val: option100, diff: Math.abs(option100 - closingDayBalance) },
            { val: option10, diff: Math.abs(option10 - closingDayBalance) },
            { val: option1, diff: Math.abs(option1 - closingDayBalance) }
          ];
          diffs.sort((a, b) => a.diff - b.diff);
          parsedFloat = diffs[0].val;
        } else if (previousBalance !== undefined) {
          const sumTx = transactions.reduce((acc, t) => acc + (t.type === 'in' ? Math.abs(t.amount) : -Math.abs(t.amount)), 0);
          const expectedBalance = previousBalance + sumTx;
          const diffs = [
            { val: option100, diff: Math.abs(option100 - expectedBalance) },
            { val: option10, diff: Math.abs(option10 - expectedBalance) },
            { val: option1, diff: Math.abs(option1 - expectedBalance) }
          ];
          diffs.sort((a, b) => a.diff - b.diff);
          parsedFloat = diffs[0].val;
        } else {
          parsedFloat = parsedFloat / 100;
        }
      }
      ledgerBalance = Math.round(parsedFloat * 100) / 100;

      balanceCandidates.push({
        accountKey,
        sourceKind: 'LEDGERBAL',
        balanceRole: 'LEDGER',
        postedDate: ledgerBalanceDate || (options?.targetDate || new Date().toISOString().substring(0, 10)),
        amount: ledgerBalance,
        amountCents: Math.round(ledgerBalance * 100),
        isClosing: true,
      });
    }
  }

  // Extração do <AVAILBAL> e <DTASOF> quando presente
  let availBalance: number | undefined;
  let availBalanceDate: string | undefined;
  const availMatch = text.match(/<AVAILBAL>[\s\S]*?<BALAMT>([^\r\n<]+)/i);
  if (availMatch) {
    const rawVal = availMatch[1].trim().replace(',', '.');
    const parsed = parseFloat(rawVal);
    if (!isNaN(parsed)) {
      availBalance = Math.round(parsed * 100) / 100;
      const dtAsOfAvail = text.match(/<AVAILBAL>[\s\S]*?<DTASOF>([^\r\n<]+)/i);
      if (dtAsOfAvail) {
        const rawDt = dtAsOfAvail[1].trim().replace(/\[.*\]/, '').trim();
        if (rawDt.length >= 8) {
          availBalanceDate = `${rawDt.substring(0, 4)}-${rawDt.substring(4, 6)}-${rawDt.substring(6, 8)}`;
        }
      }
      balanceCandidates.push({
        accountKey,
        sourceKind: 'AVAILBAL',
        balanceRole: 'AVAILABLE',
        postedDate: availBalanceDate || (options?.targetDate || new Date().toISOString().substring(0, 10)),
        amount: availBalance,
        amountCents: Math.round(availBalance * 100),
      });
    }
  }

  // Deduplicação dos candidatos de saldo por chave única
  const uniqueCandidates: OfxBalanceCandidate[] = [];
  const seenCandidateKeys = new Set<string>();
  for (const c of balanceCandidates) {
    const key = `${c.sourceKind}|${c.postedDate}|${c.amountCents}|${c.memoNormalized || ''}`;
    if (!seenCandidateKeys.has(key)) {
      seenCandidateKeys.add(key);
      uniqueCandidates.push(c);
    }
  }

  // Hierarquia Canônica de Atribuição de Saldo Bancário (Spec 444)
  let bankBalance: number | undefined;
  let balanceSource: BalanceSource | undefined;
  let calculatedClosingBalance: number | undefined;

  // Prioridade 1: Saldo do Dia (SALDO TOTAL DISPONÍVEL DIA / SDO FINAL)
  if (closingDayBalance !== undefined) {
    bankBalance = closingDayBalance;
    balanceSource = 'saldo_total_disponivel_dia';
  } 
  // Prioridade 2: Âncora no Saldo Anterior + Movimentações do Dia
  else if (previousBalance !== undefined) {
    const effectiveTarget = options?.targetDate || (transactions.length > 0 ? transactions[0].date.substring(0, 10) : undefined);
    const relevantTxs = effectiveTarget
      ? transactions.filter(t => t.date.substring(0, 10) <= effectiveTarget)
      : transactions;
    const deltaDia = relevantTxs.reduce((acc, t) => acc + (t.type === 'in' ? Math.abs(t.amount) : -Math.abs(t.amount)), 0);
    calculatedClosingBalance = Math.round((previousBalance + deltaDia) * 100) / 100;
    bankBalance = calculatedClosingBalance;
    balanceSource = 'saldo_anterior_plus_tx';
  }
  // Prioridade 3: LEDGERBAL com DTASOF <= targetDate
  else if (ledgerBalance !== undefined && ledgerBalanceDate && options?.targetDate && ledgerBalanceDate <= options.targetDate) {
    bankBalance = ledgerBalance;
    balanceSource = 'ledgerbal_exact';
  }
  // Prioridade 4: Fallback Legado
  else if (ledgerBalance !== undefined) {
    bankBalance = ledgerBalance;
    balanceSource = 'ledgerbal_fallback';
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

  return { 
    alias, 
    accountKey,
    bankId,
    branchId: cleanBranch,
    accountId: cleanAcct,
    transactions, 
    balanceCandidates: uniqueCandidates,
    bankBalance, 
    previousBalance, 
    previousBalanceDate,
    accountLimit, 
    fileName, 
    closingDayBalance,
    closingDayDate,
    ledgerBalance,
    ledgerBalanceDate,
    availBalance,
    availBalanceDate,
    calculatedClosingBalance,
    balanceSource 
  };
}

export async function parseOFXFile(file: File, options?: ParseOfxOptions): Promise<OfxParseResult> {
  if (file.name.toLowerCase().endsWith('.pdf')) {
    const { parseItauBankStatementPDF } = await import('./itauPdfParser');
    return parseItauBankStatementPDF(file, options);
  }

  let text = '';
  try {
    const buffer = await file.arrayBuffer();
    try {
      // Tenta UTF-8 estrito primeiro (padrão de downloads modernos)
      text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
    } catch {
      // Fallback para windows-1252 (padrão Itaú SGML legado)
      text = new TextDecoder('windows-1252').decode(buffer);
    }
  } catch {
    text = await file.text();
  }

  return parseOFXContent(text, file.name, options);
}
