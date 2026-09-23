import { UnifiedImportResult } from '@/hooks/useCentralImport';
import { ParsedOS, ParsedReceivable } from '@/hooks/useImportProcessor';

export interface PendingUnmatchedTransaction {
  id: string;
  source: 'rede' | 'ofx_pix' | 'ofx_other';
  storeId: string;
  storeName: string;
  date: string;
  description: string;
  paymentMethod: string;
  amount: number;
  status: 'pendente' | 'vinculada';
  matchedOsNumber?: string;
}

export const KNOWN_POS_RENTAL_FEES = [119.00, 119.90, 120.00, 238.00, 239.80, 240.00, 357.00, 476.00];

export interface AutoMatchingResult {
  matchedCount: number;
  unmatchedTransactions: PendingUnmatchedTransaction[];
  resolvedMatches: Array<{
    storeId: string;
    osNumber: string;
    sourceId: string;
    type: string;
    amount: number;
    paymentMethod: string;
    ofxId?: string;
    feeDeducted?: number;
  }>;
  settledBatches?: Array<{
    storeId: string;
    creditDate: string;
    modality: string;
    batchNumber?: string;
    totalNet: number;
    ofxAmount: number;
    feeDeducted: number;
    txCount: number;
    ofxId: string;
  }>;
  cardSettledAmount?: number;
  cardPendingAmount?: number;
}

/**
 * Verifica se uma data de transação está dentro da janela retroativa permitida (ex: D-3 a D)
 */
export function isWithinDateWindow(dateStr: string | undefined | null, targetDate: string, maxDaysBefore: number = 3): boolean {
  if (!targetDate || !dateStr) return true;
  const dStr = String(dateStr).split('T')[0].trim();
  const tStr = String(targetDate).split('T')[0].trim();
  if (dStr === tStr) return true;
  const d = new Date(dStr + 'T12:00:00Z');
  const t = new Date(tStr + 'T12:00:00Z');
  const diffDays = (t.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= maxDaysBefore;
}

/**
 * Extrai data embutida no texto de PIX (ex: "PIX RECEBIDO ROBERT 05/09")
 */
export function extractDateFromPixText(text: string | null | undefined, defaultDate: string): string {
  if (!text) return defaultDate;
  const m = text.match(/\b(\d{2})[/-](\d{2})(?:[/-](\d{4}))?\b/);
  if (m) {
    const day = m[1];
    const month = m[2];
    const year = m[3] || defaultDate.split('-')[0];
    return `${year}-${month}-${day}`;
  }
  return defaultDate;
}

/**
 * Normaliza strings para cruzamento fonético/textual seguro sem falsos positivos.
 */
function normalizeText(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extrai CNPJ numérico ou tokens relevantes de CPF/CNPJ.
 */
function extractDocDigits(text: string | null | undefined): string | null {
  if (!text) return null;
  const match = text.match(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b|\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/);
  if (match) {
    return match[0].replace(/\D/g, '');
  }
  return null;
}

/**
 * Verifica overlap relevante de tokens entre o nome/CNPJ do cliente e a contraparte bancária.
 * Ignora stopwords comuns para evitar falsos positivos.
 */
export function matchClientTokens(clientName: string | null | undefined, counterpartText: string | null | undefined): boolean {
  const normClient = normalizeText(clientName);
  const normCounter = normalizeText(counterpartText);
  if (!normClient || !normCounter) return false;

  // 1. Checar CNPJ / CPF se presente
  const docClient = extractDocDigits(clientName);
  const docCounter = extractDocDigits(counterpartText);
  if (docClient && docCounter && docClient === docCounter) {
    return true;
  }

  // 2. Stopwords que não contam como match isolado
  const STOPWORDS = new Set([
    'LTDA', 'ME', 'EPP', 'EIRELI', 'SA', 'S/A', 'DE', 'DA', 'DO', 'DOS', 'DAS', 'E', 'EM',
    'POSTO', 'AUTO', 'MECANICA', 'SERVICOS', 'COMERCIO', 'ENTRADA', 'PIX', 'TRANSF', 'QRS',
    'TRANSFERENCIA', 'CLIENTE', 'PAGTO', 'PAGAMENTO', 'BANCO', 'BRADESCO', 'ITAU', 'SANTANDER',
    'CAIXA', 'NUBANK', 'INTER', 'C6', 'MERCADO', 'PAGO'
  ]);

  const clientTokens = normClient.split(' ').filter(t => t.length >= 3 && !STOPWORDS.has(t));
  const counterTokens = normCounter.split(' ').filter(t => t.length >= 3 && !STOPWORDS.has(t));

  if (clientTokens.length === 0 || counterTokens.length === 0) {
    if (clientTokens.length === 0 && normClient.length >= 2) {
      if (normCounter.includes(normClient)) return true;
    }
    return false;
  }

  // Se houver coincidência de pelo menos 1 token forte (comprimento >= 4) ou 2 tokens
  let matchingTokens = 0;
  for (const ct of clientTokens) {
    for (const cot of counterTokens) {
      if (ct === cot) {
        if (ct.length >= 4) return true;
        matchingTokens++;
      } else if (ct.length >= 5 && cot.length >= 5 && (ct.startsWith(cot) || cot.startsWith(ct))) {
        return true;
      }
    }
  }

  return matchingTokens >= 2;
}

function isSameDate(txDate: string | undefined | null, targetDate: string): boolean {
  if (!targetDate) return true;
  if (!txDate) return true;
  const cleanTx = String(txDate).split('T')[0].trim();
  const cleanTarget = String(targetDate).split('T')[0].trim();
  return cleanTx === cleanTarget;
}

/**
 * Validação rigorosa de Duplo Fator para Casamento PIX x OS.
 * Exige CUMULATIVAMENTE:
 * 1. Não ser adquirente, rendimento ou transferência interna / intercompany.
 * 2. A OS DEVE ter registrado forma de pagamento PIX / Transferência.
 * 3. O valor do PIX deve bater com a parcela de PIX da OS (tolerância <= 0.05).
 * 4. Correspondência inequívoca de Identidade do Cliente (CPF/CNPJ exato ou Tokens de Nome fortes).
 */
export function isStrictPixOsMatch(
  txAmount: number,
  fullOfxText: string,
  os: any,
  tolerance: number = 0.05
): boolean {
  if (!os || !fullOfxText || txAmount <= 0) return false;

  // 1. Filtro Negativo Eliminatório
  const upper = fullOfxText.toUpperCase();
  if (/REDE|REDECARD|CIELO|GETNET|STONE|PAGSEGURO|BIN|ADQ|MAST|VISA|ELO|REND\s*PAGO|APLIC|RESG|CDB|LCI|LCA|JUROS|POUP|AUT\s*APR|TRANSF\s*ENTRE\s*LOJAS|INTERCOMPANY/i.test(upper)) {
    return false;
  }

  // 2. A OS DEVE ter registrado recebimento em PIX / Transferência
  const osPix = Number(os.parsed_pix_transfer ?? os.pix_transfer_value ?? 0);
  const pm = String(os.payment_method || os.formOfPayment || '').toLowerCase();
  const isPixTagged = pm.includes('pix') || pm.includes('transf') || pm.includes('ted') || pm.includes('doc') || pm.includes('conta');

  if (osPix <= 0 && !isPixTagged) {
    return false;
  }

  // 3. Valor deve bater com a parcela de PIX (ou paid_value se a OS for 100% PIX)
  const osPaid = Number(os.paid_value ?? os.paidValue ?? 0);
  const osTotal = Number(os.total_value ?? os.totalValue ?? 0);
  const targetOsVal = osPix > 0 ? osPix : osPaid;

  const valueMatches = Math.abs(targetOsVal - txAmount) <= tolerance ||
                       (osTotal > 0 && Math.abs(osTotal - txAmount) <= tolerance);

  if (!valueMatches) {
    return false;
  }

  // 4. Identidade do Cliente DEVE ter correspondência (Zero Match Cego por Valor)
  return matchClientTokens(os.client_name, fullOfxText);
}

export function executeAutoMatchingEngine(
  results: UnifiedImportResult,
  mapping: Record<string, string>,
  stores: { id: string; name: string }[],
  targetDate: string
): AutoMatchingResult {
  const matchedOsNumbers = new Set<string>();
  const resolvedMatches: AutoMatchingResult['resolvedMatches'] = [];
  const unmatchedTransactions: PendingUnmatchedTransaction[] = [];

  const TOLERANCE = 0.05; // Tolerância máxima de 5 centavos para arredondamento contábil estrito

  // 1. Agrupar OSs e Recebíveis em memória por store_id
  const osByStore = new Map<string, ParsedOS[]>();
  const receivablesByStore = new Map<string, ParsedReceivable[]>();

  results.osFiles
    .filter(r => r.success)
    .forEach(r => {
      const storeId = mapping[r.storeAlias];
      if (storeId && storeId !== 'GLOBAL') {
        if (!osByStore.has(storeId)) osByStore.set(storeId, []);
        osByStore.get(storeId)!.push(...r.osArray);

        if (!receivablesByStore.has(storeId)) receivablesByStore.set(storeId, []);
        if (r.receivablesArray && r.receivablesArray.length > 0) {
          receivablesByStore.get(storeId)!.push(...r.receivablesArray);
        }
      }
    });

  // 2. Auto-Match Rede (Vendas de Cartão) x OSs com recebimento em Cartão / Recebíveis de Cartão
  results.redeResults
    .filter(r => r.success)
    .forEach(r => {
      r.transactions.forEach((tx, idx) => {
        // Perna 1 - Operacional: Janela de tolerância D-3 a D ancorada em occurred_at da venda
        if (targetDate && tx.date && !isWithinDateWindow(tx.date, targetDate, 3)) {
          return;
        }

        const storeId = mapping[tx.storeName];
        if (!storeId || storeId === 'GLOBAL') return;
        const store = stores.find(s => s.id === storeId);
        const txId = tx.nsu ? `rede-nsu-${tx.nsu}` : (tx.authorization ? `rede-auth-${tx.authorization}` : `rede-tx-${idx}`);
        const gross = Number(tx.grossAmount || 0);
        const net = Number(tx.netAmount || 0);
        const amount = net > 0 ? net : gross;

        const methodRaw = String(tx.method || '').toLowerCase();
        const methodDesc = methodRaw.includes('debito')
          ? 'Cartão de Débito'
          : methodRaw.includes('credito')
          ? 'Cartão de Crédito'
          : 'Cartão / POS';

        const storeOss = osByStore.get(storeId) || [];
        const storeReceivables = receivablesByStore.get(storeId) || [];

        // Tier 1: Match direto em parsed_credit / parsed_debit (Bruto ou Líquido)
        let matchedOs = storeOss.find(os => {
          if (matchedOsNumbers.has(String(os.os_number))) return false;
          const credit = Number(os.parsed_credit || 0);
          const debit = Number(os.parsed_debit || 0);
          const osCardVal = credit + debit;
          if (osCardVal <= 0) return false;
          return Math.abs(osCardVal - gross) <= TOLERANCE || Math.abs(osCardVal - net) <= TOLERANCE;
        });

        // Tier 2: Match via receivablesArray de Cartão da Loja
        if (!matchedOs) {
          const matchedReceivable = storeReceivables.find(rec => {
            if (!rec.os_number || matchedOsNumbers.has(String(rec.os_number))) return false;
            const recVal = Number(rec.value || 0);
            const isCardRec = /CART|CRED|DEB|OUTR|POS/i.test(rec.type || '') || /CART|CRED|DEB/i.test(rec.description || '');
            if (!isCardRec) return false;
            return Math.abs(recVal - gross) <= TOLERANCE || Math.abs(recVal - net) <= TOLERANCE;
          });

          if (matchedReceivable && matchedReceivable.os_number) {
            matchedOs = storeOss.find(os => String(os.os_number) === String(matchedReceivable.os_number));
          }
        }

        // Tier 3: Match via payment_method tag ou fallback com paid_value / total_value
        if (!matchedOs) {
          matchedOs = storeOss.find(os => {
            if (matchedOsNumbers.has(String(os.os_number))) return false;
            const pm = String(os.payment_method || '').toLowerCase();
            const isCardTagged = pm.includes('cart') || pm.includes('cred') || pm.includes('deb') || pm.includes('visa') || pm.includes('master') || pm.includes('elo') || pm.includes('pos') || pm.includes('rede') || pm.includes('outr');

            const osVal = Number(os.paid_value || 0) || Number(os.total_value || 0);
            if (osVal <= 0) return false;

            if (isCardTagged) {
              return Math.abs(osVal - gross) <= TOLERANCE || Math.abs(osVal - net) <= TOLERANCE;
            }
            return false;
          });
        }

        if (matchedOs) {
          matchedOsNumbers.add(String(matchedOs.os_number));
          resolvedMatches.push({
            storeId,
            osNumber: String(matchedOs.os_number),
            sourceId: txId,
            type: 'REDE_AUTO',
            amount,
            paymentMethod: methodDesc
          });
        } else {
          unmatchedTransactions.push({
            id: txId,
            source: 'rede',
            storeId,
            storeName: store?.name || tx.storeName,
            date: tx.date || targetDate,
            description: `NSU ${tx.nsu || 'S/N'} — ${tx.method || 'Cartão'} ${tx.authorization ? '(' + tx.authorization + ')' : ''}`.trim(),
            paymentMethod: methodDesc,
            amount,
            status: 'pendente'
          });
        }
      });
    });

  // 3. Auto-Match OFX (PIX / Transferências de Clientes) x OSs com recebimento em PIX / Transferência
  results.ofxResults.forEach(ofx => {
    const storeId = mapping[ofx.alias] || Object.values(mapping)[0];
    if (!storeId || storeId === 'GLOBAL') return;
    const store = stores.find(s => s.id === storeId);

    (ofx.transactions || [])
      .filter(tx => tx.type === 'in')
      .forEach(tx => {
        const fullOfxText = `${tx.title || ''} ${tx.counterpart_name || ''}`.trim();
        const upperText = fullOfxText.toUpperCase();

        // Perna 3: Checar data do evento ou data extraída do memo (ex: PIX RECEBIDO ROBERT 05/09)
        const memoDate = extractDateFromPixText(fullOfxText, tx.date || targetDate);
        if (targetDate && tx.date && !isWithinDateWindow(memoDate, targetDate, 3) && !isSameDate(tx.date, targetDate)) {
          return;
        }

        // Ignorar créditos de adquirentes e rendimentos financeiros
        const isAdquirente = /REDE|REDECARD|CIELO|GETNET|STONE|PAGSEGURO|BIN|ADQ|MAST|VISA|ELO/i.test(upperText);
        const isRendimento = /REND|APLIC|RESG|CDB|LCI|LCA|JUROS|POUP|AUT APR/i.test(upperText);
        if (isAdquirente || isRendimento) return;

        const txId = tx.fitid || `ofx-${tx.amount}-${tx.date}-${Math.random()}`;
        const txAmount = Number(tx.amount || 0);
        const storeOss = osByStore.get(storeId) || [];
        const storeReceivables = receivablesByStore.get(storeId) || [];

        // Tier 1: Match Rigoroso de Duplo Fator (Valor Exato + Identidade do Cliente + Forma PIX na OS)
        let matchedOs = storeOss.find(os => {
          if (matchedOsNumbers.has(String(os.os_number))) return false;
          return isStrictPixOsMatch(txAmount, fullOfxText, os, TOLERANCE);
        });

        // Tier 2: Match via recebíveis de Transferência/PIX da Loja com validação estrita de identidade
        if (!matchedOs) {
          const matchedReceivable = storeReceivables.find(rec => {
            if (!rec.os_number || matchedOsNumbers.has(String(rec.os_number))) return false;
            const recVal = Number(rec.value || 0);
            if (Math.abs(recVal - txAmount) > TOLERANCE) return false;
            const isTransferOrPix = /TRANSF|PIX|TED|DOC|CONTA/i.test(rec.type || '') || /TRANSF|PIX|TED|DOC/i.test(rec.description || '');
            if (!isTransferOrPix) return false;
            return matchClientTokens(rec.client_name, fullOfxText);
          });

          if (matchedReceivable && matchedReceivable.os_number) {
            matchedOs = storeOss.find(os => String(os.os_number) === String(matchedReceivable.os_number));
          }
        }

        if (matchedOs) {
          matchedOsNumbers.add(String(matchedOs.os_number));
          (tx as any).matched_os_number = String(matchedOs.os_number);
          (tx as any).match_status = 'matched';
          resolvedMatches.push({
            storeId,
            osNumber: String(matchedOs.os_number),
            sourceId: txId,
            type: 'PIX_AUTO',
            amount: txAmount,
            paymentMethod: 'PIX'
          });
        } else if (/PIX|TRANSF|TED|DOC|DEP|CRED|QRS/i.test(upperText)) {
          unmatchedTransactions.push({
            id: txId,
            source: 'ofx_pix',
            storeId,
            storeName: store?.name || ofx.alias,
            date: tx.date || targetDate,
            description: tx.counterpart_name || tx.title || 'PIX Recebido de Cliente',
            paymentMethod: 'PIX',
            amount: txAmount,
            status: 'pendente'
          });
        }
      });
  });

  // 4. Auto-Match Rede x OFX (Depósitos de Adquirente no Itaú via Baixa de Lote Automática)
  const settledBatches: NonNullable<AutoMatchingResult['settledBatches']> = [];
  let totalCardSettled = 0;
  let totalCardPending = 0;

  // Mapear transações da Rede por storeId (com suporte a PV direto)
  const redeTxsByStore = new Map<string, Array<{ tx: any; idx: number; txId: string }>>();
  results.redeResults
    .filter(r => r.success)
    .forEach(r => {
      r.transactions.forEach((tx, idx) => {
        let storeId = mapping[tx.storeName];
        if (tx.establishment && mapping[tx.establishment]) {
          storeId = mapping[tx.establishment];
        }
        if (!storeId || storeId === 'GLOBAL') return;
        if (!redeTxsByStore.has(storeId)) redeTxsByStore.set(storeId, []);
        const txId = tx.nsu ? `rede-nsu-${tx.nsu}` : (tx.authorization ? `rede-auth-${tx.authorization}` : `rede-tx-${idx}`);
        redeTxsByStore.get(storeId)!.push({ tx, idx, txId });
      });
    });

  // Mapear depósitos de adquirente no OFX por storeId (com extração de PV na descrição)
  const adquirenteOfxByStore = new Map<string, any[]>();
  results.ofxResults.forEach(ofx => {
    const fileStoreId = mapping[ofx.alias] || mapping[ofx.accountKey || ''] || mapping[ofx.storeAlias || ''] || Object.values(mapping)[0];

    (ofx.transactions || [])
      .filter(tx => {
        const isCredit = tx.type === 'in' && Number(tx.amount || 0) > 0;
        const txDate = (tx.date || '').replace(/[-/]/g, '').slice(0, 8);
        const targetD = targetDate.replace(/[-/]/g, '').slice(0, 8);
        const matchesDate = !tx.date || txDate === targetD;
        return isCredit && matchesDate;
      })
      .forEach(tx => {
        const fullOfxText = `${tx.title || ''} ${tx.counterpart_name || ''}`.trim();
        const upperText = fullOfxText.toUpperCase();
        const isAdquirente = /REDE|REDECARD|CIELO|GETNET|STONE|PAGSEGURO|BIN|ADQ|MAST|VISA|ELO/i.test(upperText);
        const isRendimento = /REND|APLIC|RESG|CDB|LCI|LCA|JUROS|POUP|AUT APR/i.test(upperText);
        if (isAdquirente && !isRendimento) {
          // Extrai PV embutido no texto do extrato (ex: RECEBIMENTO REDE VISA DB0102553424 -> PV 102553424)
          let targetStoreId = fileStoreId;
          const pvMatch = upperText.match(/(?:REDE|REDEMULTI|CARTAO|ADQ).*?(?:DB|AT|CRED|PARC)?\s*0*(\d{7,10})/i);
          if (pvMatch && pvMatch[1]) {
            const pvClean = pvMatch[1].replace(/^0+/, '');
            if (mapping[pvClean]) {
              targetStoreId = mapping[pvClean];
            }
          }

          if (!targetStoreId || targetStoreId === 'GLOBAL') return;
          if (!adquirenteOfxByStore.has(targetStoreId)) adquirenteOfxByStore.set(targetStoreId, []);
          adquirenteOfxByStore.get(targetStoreId)!.push(tx);
        }
      });
  });

  // Para cada filial, executa o Hash Grouping e Baixa de Lote Automática
  for (const [storeId, storeRedeList] of redeTxsByStore.entries()) {
    const storeOfxList = adquirenteOfxByStore.get(storeId) || [];
    const matchedOfxIds = new Set<string>();

    // Agrupar transações da Rede por (creditDate + modalidadeCode)
    const batchGroups = new Map<string, {
      creditDate: string;
      modalityCode: 'DB' | 'AT' | 'CRED' | 'OUTROS';
      batchNumber?: string;
      totalNet: number;
      totalGross: number;
      txList: Array<{ tx: any; txId: string }>;
    }>();

    storeRedeList.forEach(item => {
      const tx = item.tx;
      const creditDate = tx.creditDate || tx.date || targetDate;
      const methodNorm = normalizeText(tx.method || '');
      const modalityCode: 'DB' | 'AT' | 'CRED' | 'OUTROS' = 
        methodNorm.includes('DEBITO') ? 'DB' :
        (methodNorm.includes('CREDITO') || methodNorm.includes('ANTECIP')) ? 'AT' : 'OUTROS';

      const key = `${creditDate}_${modalityCode}`;
      if (!batchGroups.has(key)) {
        batchGroups.set(key, {
          creditDate,
          modalityCode,
          batchNumber: tx.batchNumber,
          totalNet: 0,
          totalGross: 0,
          txList: []
        });
      }
      const g = batchGroups.get(key)!;
      const net = Number(tx.netAmount || 0) || Number(tx.grossAmount || 0);
      const gross = Number(tx.grossAmount || 0);
      g.totalNet = Math.round((g.totalNet + net) * 100) / 100;
      g.totalGross = Math.round((g.totalGross + gross) * 100) / 100;
      g.txList.push({ tx, txId: item.txId });
    });

    // Casar lotes com depósitos OFX
    for (const [, batch] of batchGroups.entries()) {
      const isTargetBatch = isWithinDateWindow(batch.creditDate, targetDate, 1);
      let matchedOfx: any = null;
      let matchedFee = 0;

      for (const ofxTx of storeOfxList) {
        const ofxId = ofxTx.id || ofxTx.fitid || `ofx-${ofxTx.amount}`;
        if (matchedOfxIds.has(ofxId)) continue;

        const ofxText = `${ofxTx.title || ''} ${ofxTx.counterpart_name || ''}`;
        const isOfxDb = /DB|DEB/i.test(ofxText);
        const isOfxAt = /AT|CRED|ANTECIP/i.test(ofxText);
        if (batch.modalityCode === 'DB' && isOfxAt && !isOfxDb) continue;
        if (batch.modalityCode === 'AT' && isOfxDb && !isOfxAt) continue;

        const ofxAmt = Number(ofxTx.amount || 0);
        const diff = Math.round((batch.totalNet - ofxAmt) * 100) / 100;

        // Match 1: Exato centesimal (<= 0.10)
        if (Math.abs(diff) <= 0.10) {
          matchedOfx = ofxTx;
          matchedFee = 0;
          break;
        }

        // Match 2: Diferença explicada por tarifa de aluguel de POS da Rede
        const rentalFee = KNOWN_POS_RENTAL_FEES.find(fee => Math.abs(diff - fee) <= 0.10);
        if (rentalFee) {
          matchedOfx = ofxTx;
          matchedFee = rentalFee;
          break;
        }
      }

      if (matchedOfx) {
        const ofxId = matchedOfx.id || matchedOfx.fitid || `ofx-${matchedOfx.amount}`;
        matchedOfxIds.add(ofxId);
        totalCardSettled += Number(matchedOfx.amount || 0);

        settledBatches.push({
          storeId,
          creditDate: batch.creditDate,
          modality: batch.modalityCode,
          batchNumber: batch.batchNumber,
          totalNet: batch.totalNet,
          ofxAmount: Number(matchedOfx.amount || 0),
          feeDeducted: matchedFee,
          txCount: batch.txList.length,
          ofxId
        });

        // Baixa automática de lote em cascata: marca todas as micro-vendas como liquidadas no banco
        batch.txList.forEach(item => {
          (item.tx as any).settlement_status = 'entrou';
          (item.tx as any).matched_ofx_id = ofxId;
          resolvedMatches.push({
            storeId,
            osNumber: item.tx.os_number || 'LOTE_REDE',
            sourceId: item.txId,
            type: 'REDE_LOTE_BAIXADO',
            amount: Number(item.tx.netAmount || item.tx.grossAmount || 0),
            paymentMethod: item.tx.method || 'Cartão',
            ofxId,
            feeDeducted: matchedFee > 0 ? (matchedFee / batch.txList.length) : 0
          });
        });
      } else if (isTargetBatch) {
        // Lote com previsão de crédito até hoje que não caiu no banco = "Cartão Não Entrou" (A Compensar)
        totalCardPending += batch.totalNet;
      }
    }
  }

  return {
    matchedCount: resolvedMatches.length,
    unmatchedTransactions,
    resolvedMatches,
    settledBatches,
    cardSettledAmount: totalCardSettled,
    cardPendingAmount: totalCardPending
  };
}
