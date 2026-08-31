export interface ExpenseMatchResult {
  isMatched: boolean;
  matchedBill?: {
    id: string;
    title: string;
    description: string;
    amount: number;
    recipient_name?: string;
    category?: string;
    installment?: string;
  };
  confidence: number;
}

/**
 * Normaliza strings para comparação (remove acentos, pontuação, múltiplos espaços e lowercase)
 */
function normalizeText(text?: string | null): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Realiza o match entre uma transação bancária de saída (débito OFX) e as contas a pagar importadas (daily_manual_bills)
 */
export function matchExpenseWithOfxDebit(tx: any, bills: any[] = []): ExpenseMatchResult {
  if (!tx || tx.type !== 'out' || !bills || bills.length === 0) {
    return { isMatched: false, confidence: 0 };
  }

  const txAmount = Math.abs(Number(tx.amount || 0));
  const txRaw = `${tx.title || ''} ${tx.subtitle || ''} ${tx.counterpart_name || ''} ${tx.fitid || ''}`;
  const normTx = normalizeText(txRaw);

  // 1. Match por valor idêntico (tolerância de R$ 0.05)
  const exactAmountBills = bills.filter(b => Math.abs(Math.abs(Number(b.amount || 0)) - txAmount) < 0.05);

  if (exactAmountBills.length === 1) {
    const singleBill = exactAmountBills[0];
    const normRecip = normalizeText(singleBill.recipient_name);
    const normDesc = normalizeText(singleBill.description);
    const normTitle = normalizeText(singleBill.title);

    // Se o nome do favorecido ou descrição também bater, confiança máxima (99%)
    if (
      (normRecip && normTx.includes(normRecip)) ||
      (normDesc && normTx.includes(normDesc)) ||
      (normTitle && normTx.includes(normTitle))
    ) {
      return { isMatched: true, matchedBill: singleBill, confidence: 0.99 };
    }

    // Mesmo que o texto varie ligeiramente, o valor único na filial dá confiança alta (90%)
    return { isMatched: true, matchedBill: singleBill, confidence: 0.90 };
  }

  if (exactAmountBills.length > 1) {
    // Desempate por similaridade de texto
    for (const b of exactAmountBills) {
      const normRecip = normalizeText(b.recipient_name);
      const normDesc = normalizeText(b.description);
      const normTitle = normalizeText(b.title);

      if (
        (normRecip && normTx.includes(normRecip)) ||
        (normDesc && normTx.includes(normDesc)) ||
        (normTitle && normTx.includes(normTitle))
      ) {
        return { isMatched: true, matchedBill: b, confidence: 0.95 };
      }
    }
    // Caso padrão: atribui o primeiro da lista com score médio
    return { isMatched: true, matchedBill: exactAmountBills[0], confidence: 0.80 };
  }

  // 2. Match com tolerância de até 5% (para pequenas variações de juros ou multas)
  for (const b of bills) {
    const normRecip = normalizeText(b.recipient_name);
    if (normRecip.length > 3 && normTx.includes(normRecip)) {
      const bAmount = Math.abs(Number(b.amount || 0));
      if (bAmount > 0 && Math.abs(bAmount - txAmount) / bAmount < 0.05) {
        return { isMatched: true, matchedBill: b, confidence: 0.75 };
      }
    }
  }

  return { isMatched: false, confidence: 0 };
}

export interface InMemExpenseMatchingResult {
  matchedCount: number;
  matchedPairs: Array<{
    ofxFitid: string;
    billExternalCode?: string;
    recipientName: string;
    amount: number;
    storeId: string;
    confidence: number;
    layer: number;
  }>;
  orphanOutflows: Array<{
    id: string;
    fitid: string;
    storeId: string;
    storeName: string;
    amount: number;
    description: string;
    date: string;
  }>;
}

export function executeExpenseAutoMatching(
  ofxResults: any[],
  contasPagarResults: any[],
  mapping: Record<string, string>,
  stores: { id: string; name: string }[]
): InMemExpenseMatchingResult {
  const TOLERANCE = 0.05;
  const matchedBillKeys = new Set<string>();
  const matchedPairs: InMemExpenseMatchingResult['matchedPairs'] = [];
  const orphanOutflows: InMemExpenseMatchingResult['orphanOutflows'] = [];

  const allBills: any[] = (contasPagarResults || []).flatMap(c =>
    (c.bills || []).map((b: any, idx: number) => ({
      ...b,
      _key: b.external_code || `${b.store_id || 'mst'}_${b.recipient_name}_${b.amount}_${idx}`
    }))
  );

  const storeMap = new Map<string, string>();
  (stores || []).forEach(s => storeMap.set(s.id, s.name));

  (ofxResults || []).forEach(ofx => {
    const storeId = mapping[ofx.alias] || '';
    const storeName = storeMap.get(storeId) || ofx.alias || 'Loja';

    (ofx.transactions || [])
      .filter((tx: any) => tx.type === 'out' || Number(tx.amount || 0) < 0)
      .forEach((tx: any, txIdx: number) => {
        const txAmount = Math.abs(Number(tx.amount || 0));
        const txDesc = `${tx.title || ''} ${tx.counterpart_name || ''}`.trim();
        const normTx = normalizeText(txDesc);
        const txFitid = tx.fitid || `ofx-out-${txAmount}-${txIdx}`;

        if (/IRRF|IOF|ESTORNO\s+TARIFA/i.test(normTx)) return;

        let matchedBill: any = null;
        let matchConfidence = 0;
        let layer = 0;

        // CAMADA 1: Match por External Code / FITID exato
        if (tx.fitid) {
          const found = allBills.find(b =>
            !matchedBillKeys.has(b._key) &&
            b.external_code &&
            (tx.fitid.includes(b.external_code) || b.external_code.includes(tx.fitid)) &&
            Math.abs(Number(b.amount || 0) - txAmount) <= TOLERANCE
          );
          if (found) {
            matchedBill = found;
            matchConfidence = 1.0;
            layer = 1;
          }
        }

        // CAMADA 2: Match de Valor Exato + Mesma Loja + Token de Favorecido
        if (!matchedBill && storeId) {
          const storeBills = allBills.filter(b => !matchedBillKeys.has(b._key) && b.store_id === storeId && Math.abs(Number(b.amount || 0) - txAmount) <= TOLERANCE);
          for (const b of storeBills) {
            const normRecip = normalizeText(b.recipient_name);
            const firstToken = normRecip.split(' ')[0];
            if (firstToken && firstToken.length >= 3 && normTx.includes(firstToken)) {
              matchedBill = b;
              matchConfidence = 0.95;
              layer = 2;
              break;
            }
          }
        }

        // CAMADA 3: Match de Valor Único na Loja
        if (!matchedBill && storeId) {
          const storeBills = allBills.filter(b => !matchedBillKeys.has(b._key) && b.store_id === storeId && Math.abs(Number(b.amount || 0) - txAmount) <= TOLERANCE);
          if (storeBills.length === 1) {
            matchedBill = storeBills[0];
            matchConfidence = 0.90;
            layer = 3;
          }
        }

        // CAMADA 4: Match Global Intercompany (Matriz pagando conta de filial ou Favorecido idêntico)
        if (!matchedBill) {
          const candidateBills = allBills.filter(b => !matchedBillKeys.has(b._key) && Math.abs(Number(b.amount || 0) - txAmount) <= TOLERANCE);
          if (candidateBills.length === 1) {
            matchedBill = candidateBills[0];
            matchConfidence = 0.85;
            layer = 4;
          } else if (candidateBills.length > 1) {
            for (const b of candidateBills) {
              const normRecip = normalizeText(b.recipient_name);
              const firstToken = normRecip.split(' ')[0];
              if (firstToken && firstToken.length >= 3 && normTx.includes(firstToken)) {
                matchedBill = b;
                matchConfidence = 0.80;
                layer = 4;
                break;
              }
            }
          }
        }

        if (matchedBill) {
          matchedBillKeys.add(matchedBill._key);
          tx.matched_bill_id = matchedBill._key;
          tx.match_status = 'matched';
          matchedPairs.push({
            ofxFitid: txFitid,
            billExternalCode: matchedBill.external_code,
            recipientName: matchedBill.recipient_name || matchedBill.title || '',
            amount: txAmount,
            storeId: storeId || matchedBill.store_id || '',
            confidence: matchConfidence,
            layer
          });
        } else {
          orphanOutflows.push({
            id: tx.id || txFitid,
            fitid: txFitid,
            storeId,
            storeName,
            amount: txAmount,
            description: txDesc || 'Débito Bancário',
            date: tx.date || new Date().toISOString().slice(0, 10),
          });
        }
      });
  });

  return {
    matchedCount: matchedPairs.length,
    matchedPairs,
    orphanOutflows
  };
}

