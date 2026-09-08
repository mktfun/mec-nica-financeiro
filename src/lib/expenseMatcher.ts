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

const STORE_KEYWORDS_MAP: Record<string, string[]> = {
  'st-01': ['DOM PEDRO', 'DOMPEDRO', 'DP'],
  'st-02': ['JABAQUARA', 'JAB'],
  'st-03': ['JORGE BERETTA', 'DHJV', 'JB'],
  'st-04': ['KENNEDY', 'POPULAR', 'MP AUTO', 'AUTO MECANICA POPULAR'],
  'st-05': ['PIRAPORINHA', 'EMPORIO', 'EMPORIO DO OLEO'],
  'st-06': ['PLANALTO', 'BRASICAR', 'CENTRO AUTOMOTIVO AUTO MECANICA LTDA'],
  'st-07': ['RUDGE', 'CAP', 'PRIME', 'CENTRO AUTOMOTIVO PRIME'],
  'st-08': ['SANTO ANDRE', 'HD', 'HD CENTRO'],
  'st-09': ['REI DO MODULO', 'MODULO'],
  '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f': ['MAUA', 'MHE', 'REI DO OLEO'],
};

function isSalaryBill(b: any): boolean {
  if (b.category === 'retirada_socios') return true;
  const txt = `${b.title || ''} ${b.description || ''} ${b.recipient_name || ''}`.toUpperCase();
  return /SALARIO|SALÁRIO|RESCISAO|RESCISÃO|FERIAS|FÉRIAS|PREMIO|PRÊMIO|VALE/i.test(txt);
}

/**
 * Busca combinatória exata (Subset Sum) para encontrar subconjunto de 1 até maxK itens
 * cuja soma bata com targetAmount com a tolerância especificada.
 */
function findSubsetSumCombination(
  items: any[],
  targetAmount: number,
  tolerance = 0.05,
  maxK = 6
): any[] | null {
  if (!items || items.length === 0 || targetAmount <= 0) return null;

  const maxLen = Math.min(maxK, items.length);

  function backtrack(startIdx: number, current: any[], currentSum: number, k: number): any[] | null {
    if (current.length === k) {
      if (Math.abs(currentSum - targetAmount) <= tolerance) {
        return current;
      }
      return null;
    }

    for (let i = startIdx; i < items.length; i++) {
      const item = items[i];
      const val = Math.abs(Number(item.amount || 0));
      const nextSum = currentSum + val;
      const res = backtrack(i + 1, [...current, item], nextSum, k);
      if (res) return res;
    }
    return null;
  }

  // Ordena decrescente para testar valores maiores primeiro
  const sorted = [...items].sort((a, b) => Math.abs(Number(b.amount || 0)) - Math.abs(Number(a.amount || 0)));

  for (let k = 1; k <= maxLen; k++) {
    const found = backtrack(0, [], 0, k);
    if (found) return found;
  }

  return null;
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

  // 1. Descompactar todas as transações com contexto de filial
  const allDebits: any[] = [];
  const allCredits: any[] = [];

  (ofxResults || []).forEach(ofx => {
    const storeId = mapping[ofx.alias] || '';
    const storeName = storeMap.get(storeId) || ofx.alias || 'Loja';

    (ofx.transactions || []).forEach((tx: any, txIdx: number) => {
      const txAmount = Math.abs(Number(tx.amount || 0));
      const txDesc = `${tx.title || ''} ${tx.counterpart_name || ''}`.trim();
      const txFitid = tx.fitid || `ofx-${tx.type}-${txAmount}-${txIdx}`;
      const enriched = {
        ...tx,
        storeId,
        storeName,
        txAmount,
        txDesc,
        txFitid,
        rawTx: tx,
      };

      if (tx.type === 'out' || Number(tx.amount || 0) < 0) {
        allDebits.push(enriched);
      } else {
        allCredits.push(enriched);
      }
    });
  });

  const usedDebitKeys = new Set<string>();
  const usedCreditKeys = new Set<string>();

  // ──────────────────────────────────────────────────────────────────────────
  // FASE A: AUTO-CANCELAMENTO DE BLOQUEIO / DESBLOQUEIO PIX (Efeito Nulo)
  // ──────────────────────────────────────────────────────────────────────────
  allDebits.forEach(d => {
    if (usedDebitKeys.has(d.txFitid)) return;
    const norm = normalizeText(d.txDesc);
    if (/bloqueio pix/i.test(norm)) {
      const matchCredit = allCredits.find(c =>
        !usedCreditKeys.has(c.txFitid) &&
        c.storeId === d.storeId &&
        Math.abs(c.txAmount - d.txAmount) <= TOLERANCE &&
        /desbloqueio pix/i.test(normalizeText(c.txDesc))
      );
      if (matchCredit) {
        usedDebitKeys.add(d.txFitid);
        usedCreditKeys.add(matchCredit.txFitid);
        d.rawTx.match_status = 'auto_cancelled';
        d.rawTx.manual_category = 'Estorno / Ajuste [Apenas Conciliar]';
        d.rawTx.manual_justification = 'Bloqueio e Desbloqueio PIX simultâneo (Efeito Nulo)';
        matchCredit.rawTx.match_status = 'auto_cancelled';
        matchCredit.rawTx.manual_category = 'Estorno / Ajuste [Apenas Conciliar]';
        matchCredit.rawTx.manual_justification = 'Bloqueio e Desbloqueio PIX simultâneo (Efeito Nulo)';
      }
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // FASE B: PAREAMENTO DETERMINÍSTICO INTERCOMPANY (Transferências Entre Lojas)
  // ──────────────────────────────────────────────────────────────────────────
  allDebits.forEach(d => {
    if (usedDebitKeys.has(d.txFitid)) return;
    const norm = normalizeText(d.txDesc);
    if (/irrf|iof|estorno tarifa/i.test(norm)) return;

    for (const [targetStoreId, keywords] of Object.entries(STORE_KEYWORDS_MAP)) {
      if (targetStoreId === d.storeId) continue;
      const mentionsTarget = keywords.some(k => norm.includes(normalizeText(k)));
      if (mentionsTarget) {
        const matchCredit = allCredits.find(c =>
          !usedCreditKeys.has(c.txFitid) &&
          c.storeId === targetStoreId &&
          Math.abs(c.txAmount - d.txAmount) <= TOLERANCE
        );
        if (matchCredit) {
          usedDebitKeys.add(d.txFitid);
          usedCreditKeys.add(matchCredit.txFitid);
          const targetStoreName = storeMap.get(targetStoreId) || targetStoreId;
          const originStoreName = d.storeName;

          d.rawTx.match_status = 'intercompany_paired';
          d.rawTx.manual_category = 'Transferência Entre Lojas [Apenas Conciliar]';
          d.rawTx.manual_justification = `Transferência Intercompany de ${originStoreName} para ${targetStoreName}`;
          d.rawTx.contabilizar_no_subtotal = false;

          matchCredit.rawTx.match_status = 'intercompany_paired';
          matchCredit.rawTx.manual_category = 'Transferência Entre Lojas [Apenas Conciliar]';
          matchCredit.rawTx.manual_justification = `Transferência Intercompany recebida de ${originStoreName} em ${targetStoreName}`;
          matchCredit.rawTx.contabilizar_no_subtotal = false;
          matchCredit.rawTx.impacts_revenue = false;

          matchedPairs.push({
            ofxFitid: d.txFitid,
            recipientName: `Transferência: ${originStoreName} -> ${targetStoreName}`,
            amount: d.txAmount,
            storeId: d.storeId,
            confidence: 0.99,
            layer: 99,
          });
          break;
        }
      }
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // FASE C: IDENTIFICAÇÃO E BLINDAGEM DE SAQUES EM DINHEIRO / ATM
  // ──────────────────────────────────────────────────────────────────────────
  allDebits.forEach(d => {
    if (usedDebitKeys.has(d.txFitid)) return;
    const norm = normalizeText(d.txDesc);
    const isAtm = /saque din|saque atm|cart00/i.test(norm);
    if (isAtm) {
      d.isAtm = true;
      d.rawTx.is_atm_withdrawal = true;
      d.rawTx.manual_category = 'Retirada de Sócios / Sangria / Saque em Dinheiro';
      d.rawTx.contabilizar_no_subtotal = false;
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // FASE D: MOTOR DE BATIMENTO 1-PARA-N DE LOTES SISPAG SALÁRIOS
  // ──────────────────────────────────────────────────────────────────────────
  allDebits.forEach(d => {
    if (usedDebitKeys.has(d.txFitid) || d.isAtm) return;
    const norm = normalizeText(d.txDesc);
    if (/sispag|salario/i.test(norm)) {
      const storeSalaryBills = allBills.filter(b => !matchedBillKeys.has(b._key) && b.store_id === d.storeId && isSalaryBill(b));
      const storeSum = storeSalaryBills.reduce((acc, b) => acc + b.amount, 0);

      // D1: Todos os salários em aberto da loja somam exatamente o débito SISPAG
      if (Math.abs(storeSum - d.txAmount) <= 0.10 && storeSalaryBills.length > 0) {
        storeSalaryBills.forEach(b => matchedBillKeys.add(b._key));
        usedDebitKeys.add(d.txFitid);
        d.rawTx.matched_bill_id = 'BATCH_SISPAG';
        d.rawTx.match_status = 'matched_batch';
        matchedPairs.push({
          ofxFitid: d.txFitid,
          recipientName: `Folha SISPAG (${storeSalaryBills.length} colaboradores)`,
          amount: d.txAmount,
          storeId: d.storeId,
          confidence: 0.99,
          layer: 10,
        });
        return;
      }

      // D2: Subconjunto combinatório (1 a 6 salários) na mesma loja
      const subsetMatch = findSubsetSumCombination(storeSalaryBills, d.txAmount, TOLERANCE, 6);
      if (subsetMatch && subsetMatch.length > 0) {
        subsetMatch.forEach(b => matchedBillKeys.add(b._key));
        usedDebitKeys.add(d.txFitid);
        if (subsetMatch.length === 1) {
          d.rawTx.matched_bill_id = subsetMatch[0]._key;
          d.rawTx.match_status = 'matched';
          matchedPairs.push({
            ofxFitid: d.txFitid,
            billExternalCode: subsetMatch[0].external_code,
            recipientName: subsetMatch[0].recipient_name,
            amount: d.txAmount,
            storeId: d.storeId,
            confidence: 0.95,
            layer: 11,
          });
        } else {
          d.rawTx.matched_bill_id = 'BATCH_SISPAG';
          d.rawTx.match_status = 'matched_batch';
          matchedPairs.push({
            ofxFitid: d.txFitid,
            recipientName: `Folha SISPAG (${subsetMatch.length} colaboradores)`,
            amount: d.txAmount,
            storeId: d.storeId,
            confidence: 0.99,
            layer: 11,
          });
        }
        return;
      }

      // D3: Salários da loja + Colaboradores da Matriz/Holding rateados via Subset Sum
      const masterSalaryBills = allBills.filter(b => !matchedBillKeys.has(b._key) && b.store_id === 'master' && isSalaryBill(b));
      const poolStoreAndMaster = [...storeSalaryBills, ...masterSalaryBills];
      const masterSubsetMatch = findSubsetSumCombination(poolStoreAndMaster, d.txAmount, TOLERANCE, 6);
      if (masterSubsetMatch && masterSubsetMatch.length > 0) {
        masterSubsetMatch.forEach(b => matchedBillKeys.add(b._key));
        usedDebitKeys.add(d.txFitid);
        d.rawTx.matched_bill_id = 'BATCH_SISPAG';
        d.rawTx.match_status = 'matched_batch';
        matchedPairs.push({
          ofxFitid: d.txFitid,
          recipientName: `Folha SISPAG Loja+Holding (${masterSubsetMatch.length} colaboradores)`,
          amount: d.txAmount,
          storeId: d.storeId,
          confidence: 0.98,
          layer: 12,
        });
        return;
      }

      // D4: Colaborador com valor único em qualquer loja (ex: Dom Pedro pagando título de outra filial)
      const anySalary = allBills.find(b => !matchedBillKeys.has(b._key) && isSalaryBill(b) && Math.abs(b.amount - d.txAmount) <= TOLERANCE);
      if (anySalary) {
        matchedBillKeys.add(anySalary._key);
        usedDebitKeys.add(d.txFitid);
        d.rawTx.matched_bill_id = anySalary._key;
        d.rawTx.match_status = 'matched';
        matchedPairs.push({
          ofxFitid: d.txFitid,
          billExternalCode: anySalary.external_code,
          recipientName: anySalary.recipient_name,
          amount: d.txAmount,
          storeId: d.storeId,
          confidence: 0.90,
          layer: 13,
        });
        return;
      }
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // FASE E: MATCHING 1-PARA-1 PADRÃO (CAMADAS 1 A 4)
  // ──────────────────────────────────────────────────────────────────────────
  allDebits.forEach(d => {
    if (usedDebitKeys.has(d.txFitid)) return;
    const normTx = normalizeText(d.txDesc);
    if (/irrf|iof|estorno tarifa/i.test(normTx)) return;

    // Saques ATM não casam com contas de fornecedores
    if (d.isAtm) {
      orphanOutflows.push({
        id: d.id || d.txFitid,
        fitid: d.txFitid,
        storeId: d.storeId,
        storeName: d.storeName,
        amount: d.txAmount,
        description: d.txDesc || 'Saque em Dinheiro ATM',
        date: d.date || new Date().toISOString().slice(0, 10),
      });
      return;
    }

    let matchedBill: any = null;
    let matchConfidence = 0;
    let layer = 0;

    // Camada 1: FITID / External code
    if (d.fitid) {
      const found = allBills.find(b =>
        !matchedBillKeys.has(b._key) &&
        b.external_code &&
        (d.fitid.includes(b.external_code) || b.external_code.includes(d.fitid)) &&
        Math.abs(Number(b.amount || 0) - d.txAmount) <= TOLERANCE
      );
      if (found) {
        matchedBill = found;
        matchConfidence = 1.0;
        layer = 1;
      }
    }

    // Camada 2: Valor exato + Mesma Loja + Token Favorecido
    if (!matchedBill && d.storeId) {
      const storeBills = allBills.filter(b => !matchedBillKeys.has(b._key) && b.store_id === d.storeId && Math.abs(Number(b.amount || 0) - d.txAmount) <= TOLERANCE);
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

    // Camada 3: Valor único na loja
    if (!matchedBill && d.storeId) {
      const storeBills = allBills.filter(b => !matchedBillKeys.has(b._key) && b.store_id === d.storeId && Math.abs(Number(b.amount || 0) - d.txAmount) <= TOLERANCE);
      if (storeBills.length === 1) {
        matchedBill = storeBills[0];
        matchConfidence = 0.90;
        layer = 3;
      }
    }

    // Camada 4: Global / Matriz
    if (!matchedBill) {
      const candidateBills = allBills.filter(b => !matchedBillKeys.has(b._key) && Math.abs(Number(b.amount || 0) - d.txAmount) <= TOLERANCE);
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
      usedDebitKeys.add(d.txFitid);
      d.rawTx.matched_bill_id = matchedBill._key;
      d.rawTx.match_status = 'matched';
      matchedPairs.push({
        ofxFitid: d.txFitid,
        billExternalCode: matchedBill.external_code,
        recipientName: matchedBill.recipient_name || matchedBill.title || '',
        amount: d.txAmount,
        storeId: d.storeId || matchedBill.store_id || '',
        confidence: matchConfidence,
        layer
      });
    } else {
      orphanOutflows.push({
        id: d.id || d.txFitid,
        fitid: d.txFitid,
        storeId: d.storeId,
        storeName: d.storeName,
        amount: d.txAmount,
        description: d.txDesc || 'Débito Bancário',
        date: d.date || new Date().toISOString().slice(0, 10),
      });
    }
  });

  return {
    matchedCount: matchedPairs.length,
    matchedPairs,
    orphanOutflows
  };
}

