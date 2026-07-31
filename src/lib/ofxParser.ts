export interface OFXTransaction {
  type: string;
  amount: number;
  date: Date;
  memo: string;
  fitid?: string;
}

export function parseOFX(ofxString: string): OFXTransaction[] {
  const transactions: OFXTransaction[] = [];
  const stmttrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g;
  
  let match;
  while ((match = stmttrnRegex.exec(ofxString)) !== null) {
    const block = match[1];
    
    const typeMatch = block.match(/<TRNTYPE>(.+?)(?:\r?\n|<)/);
    const amountMatch = block.match(/<TRNAMT>(.+?)(?:\r?\n|<)/);
    const dateMatch = block.match(/<DTPOSTED>(.+?)(?:\r?\n|<)/);
    const memoMatch = block.match(/<MEMO>(.+?)(?:\r?\n|<)/);
    const fitidMatch = block.match(/<FITID>(.+?)(?:\r?\n|<)/);

    if (typeMatch && amountMatch && dateMatch && memoMatch) {
      // Parse date format YYYYMMDDHHMMSS
      const rawDate = dateMatch[1].trim();
      const year = parseInt(rawDate.substring(0, 4), 10);
      const month = parseInt(rawDate.substring(4, 6), 10) - 1;
      const day = parseInt(rawDate.substring(6, 8), 10);
      
      const parsedDate = new Date(year, month, day);
      
      transactions.push({
        type: typeMatch[1].trim(),
        amount: parseFloat(amountMatch[1].trim()),
        date: parsedDate,
        memo: memoMatch[1].trim(),
        fitid: fitidMatch ? fitidMatch[1].trim() : undefined,
      });
    }
  }

  return transactions;
}

export interface SystemTransaction {
  id: string;
  amount: number;
  date: Date;
  description?: string;
  [key: string]: any;
}

export interface MatchResult {
  matched: { ofx: OFXTransaction; system: SystemTransaction }[];
  unmatchedOfx: OFXTransaction[];
  unmatchedSystem: SystemTransaction[];
}

export function matchTransactions(
  ofxList: OFXTransaction[],
  systemList: SystemTransaction[],
  tolerance = 10
): MatchResult {
  const matched: { ofx: OFXTransaction; system: SystemTransaction }[] = [];
  const unmatchedOfx: OFXTransaction[] = [];
  const unmatchedSystem: SystemTransaction[] = [...systemList];

  for (const ofx of ofxList) {
    let foundMatchIndex = -1;

    for (let i = 0; i < unmatchedSystem.length; i++) {
      const sys = unmatchedSystem[i];

      // Match logic:
      // 1. Value must match exactly or within a very small rounding tolerance, here tolerance is for date, but maybe amount too?
      // "tolerance=10" usually means 10 days tolerance, or maybe 10 cents?
      // For bank conciliation, value should match exactly (or Math.abs(diff) < 0.01)
      const valueDiff = Math.abs(ofx.amount - sys.amount);
      if (valueDiff > 0.01) continue;

      // 2. Date tolerance (in days)
      // Sometimes the machine pays 1 day later
      const ofxTime = ofx.date.getTime();
      const sysTime = sys.date.getTime();
      const daysDiff = Math.abs(ofxTime - sysTime) / (1000 * 60 * 60 * 24);
      
      if (daysDiff <= tolerance) {
        foundMatchIndex = i;
        break;
      }
    }

    if (foundMatchIndex !== -1) {
      matched.push({
        ofx,
        system: unmatchedSystem[foundMatchIndex]
      });
      unmatchedSystem.splice(foundMatchIndex, 1);
    } else {
      unmatchedOfx.push(ofx);
    }
  }

  return { matched, unmatchedOfx, unmatchedSystem };
}
