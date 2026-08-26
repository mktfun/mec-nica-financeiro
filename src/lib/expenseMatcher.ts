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
