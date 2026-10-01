// @ts-nocheck
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
  rejectionReason?: string;
  candidateCount?: number;
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
    'CAIXA', 'NUBANK', 'INTER', 'C6', 'MERCADO', 'PAGO',
    'RECEBIMENTO', 'RECEBIMENTOS', 'AUTOMOTIVO', 'AUTOMOVEIS', 'OFICINA', 'CENTRO'
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
 * 2. O valor do PIX deve bater com:
 *    a) Parcela declarada em PIX da OS (pix_transfer_value / parsed_pix_transfer); OU
 *    b) Saldo em aberto da OS (total_value - paid_value); OU
 *    c) Valor total da OS quando ainda totalmente em aberto (paid_value == 0).
 * 3. Correspondência inequívoca de Identidade do Cliente (CPF/CNPJ exato ou Tokens de Nome fortes).
 *    (Zero Match Cego por Valor).
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
  if (/REDE|REDECARD|CIELO|GETNET|STONE|PAGSEGURO|BIN|ADQ|MAST|VISA|ELO|REND\s*PAGO|APLIC|RESG|CDB|LCI|LCA|JUROS|POUP|AUT\s*APR|TRANSF\s*ENTRE\s*LOJAS|INTERCOMPANY|MERCADOPAGO|MERCADO\s*PAGO|BERETTA|DHJV|MECANICA|AUTO\s*CENTER|PNEUS|MATRIZ|FILIAL/i.test(upper)) {
    return false;
  }

  // 2. Avaliação de Valor Elegível (Parcela Pix, Saldo em Aberto ou Total da OS)
  const osPix = Number(os.parsed_pix_transfer ?? os.pix_transfer_value ?? 0);
  const totalVal = Number(os.total_value ?? os.totalValue ?? os.valor_total ?? 0);
  const paidVal = Number(os.paid_value ?? os.paidValue ?? 0);
  const openBalance = Math.max(0, totalVal - paidVal);

  let valueMatches = false;
  if (osPix > 0 && Math.abs(osPix - txAmount) <= tolerance) {
    valueMatches = true;
  } else if (openBalance > 0 && Math.abs(openBalance - txAmount) <= tolerance) {
    valueMatches = true;
  } else if (paidVal <= 0.05 && totalVal > 0 && Math.abs(totalVal - txAmount) <= tolerance) {
    valueMatches = true;
  }

  if (!valueMatches) {
    return false;
  }

  // 3. Identidade do Cliente DEVE ter correspondência (Zero Match Cego por Valor)
  // 3.1 Guard: se documentos (CPF/CNPJ) constarem em ambos e divergirem -> rejeitar
  const txDoc = extractDocDigits(fullOfxText);
  const osDoc = extractDocDigits(os.client_name || os.client_cpf_cnpj || os.cnpj_cpf || '');
  if (txDoc && osDoc && txDoc !== osDoc) {
    return false;
  }

  // 3.2 Guard: se remetente bancário for PJ (CNPJ 14 dígitos), exige match estrito de tokens
  if (txDoc && txDoc.length === 14) {
    if (!matchClientTokens(os.client_name, fullOfxText)) {
      return false;
    }
  }

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

  // Mapa de todas as vendas Rede por loja para validação de unicidade bidirecional (1:1)
  const allRedeTxsByStore = new Map<string, Array<{ gross: number; isDebit: boolean; isCredit: boolean }>>();
  results.redeResults
    .filter(r => r.success)
    .forEach(r => {
      r.transactions.forEach(tx => {
        if (targetDate && tx.date && !isWithinDateWindow(tx.date, targetDate, 3)) return;
        const storeId = mapping[tx.storeName];
        if (!storeId || storeId === 'GLOBAL') return;
        const gross = Number(tx.grossAmount || 0);
        const norm = String(tx.method || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const isDeb = norm.includes('deb');
        const isCred = norm.includes('cred');
        if (!allRedeTxsByStore.has(storeId)) allRedeTxsByStore.set(storeId, []);
        allRedeTxsByStore.get(storeId)!.push({ gross, isDebit: isDeb, isCredit: isCred });
      });
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
        const amount = gross > 0 ? gross : net;

        const methodRaw = String(tx.method || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const isDebit = methodRaw.includes('deb');
        const isCredit = methodRaw.includes('cred');
        const methodDesc = isDebit
          ? 'Cartão de Débito'
          : isCredit
          ? 'Cartão de Crédito'
          : 'Cartão / POS';

        const storeOss = osByStore.get(storeId) || [];
        const storeReceivables = receivablesByStore.get(storeId) || [];

        // Tier 1: Match direto em parsed_credit / parsed_debit por modalidade estrita
        let tier1Candidates = storeOss.filter(os => {
          if (matchedOsNumbers.has(String(os.os_number))) return false;
          if (!isDebit && !isCredit) return false;
          const credit = Number(os.parsed_credit || 0);
          const debit = Number(os.parsed_debit || 0);
          if (isDebit && Math.abs(debit - gross) <= TOLERANCE) return true;
          if (isCredit && Math.abs(credit - gross) <= TOLERANCE) return true;
          return false;
        });

        // Contagem de transações POS concorrentes pelo mesmo valor e modalidade na mesma loja
        const storeAllTxs = allRedeTxsByStore.get(storeId) || [];
        const competingTxsCount = storeAllTxs.filter(t =>
          Math.abs(t.gross - gross) <= TOLERANCE &&
          ((isDebit && t.isDebit) || (isCredit && t.isCredit))
        ).length;

        let matchedOs: ParsedOS | undefined;
        let isCollision = false;

        if (tier1Candidates.length === 1 && competingTxsCount === 1) {
          matchedOs = tier1Candidates[0];
        } else if (tier1Candidates.length > 1 || (tier1Candidates.length === 1 && competingTxsCount > 1)) {
          isCollision = true;
        }

        // Tier 2: Match via receivablesArray de Cartão da Loja com verificação estrita de modalidade
        if (!matchedOs && !isCollision && (isDebit || isCredit)) {
          const matchedReceivables = storeReceivables.filter(rec => {
            if (!rec.os_number || matchedOsNumbers.has(String(rec.os_number))) return false;
            const recVal = Number(rec.value || 0);
            const recDesc = String(rec.description || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const recType = String(rec.type || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const isRecDebit = recDesc.includes('deb') || recType.includes('deb');
            const isRecCredit = recDesc.includes('cred') || recType.includes('cred');
            const isCardRec = isRecDebit || isRecCredit || /cart|outr|pos/i.test(rec.type || '') || /cart/i.test(rec.description || '');
            if (!isCardRec) return false;
            if (isDebit && !isRecDebit && isRecCredit) return false;
            if (isCredit && !isRecCredit && isRecDebit) return false;
            return Math.abs(recVal - gross) <= TOLERANCE;
          });

          if (matchedReceivables.length === 1 && competingTxsCount === 1 && matchedReceivables[0].os_number) {
            matchedOs = storeOss.find(os => String(os.os_number) === String(matchedReceivables[0].os_number));
          } else if (matchedReceivables.length > 1 || (matchedReceivables.length === 1 && competingTxsCount > 1)) {
            isCollision = true;
          }
        }

        if (matchedOs && !isCollision) {
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
          let reason = `Nenhuma OS com delta de ${isDebit ? 'débito' : isCredit ? 'crédito' : 'cartão'} no valor bruto de R$ ${gross.toFixed(2)} encontrada na filial.`;
          if (isCollision) {
            if (competingTxsCount > 1) {
              reason = `Colisão bidirecional: ${competingTxsCount} vendas de maquininha de R$ ${gross.toFixed(2)} disputam a mesma OS. Requer seleção manual.`;
            } else {
              const count = tier1Candidates.length > 1 ? tier1Candidates.length : 2;
              reason = `Colisão ambígua: ${count} OSs com o mesmo valor bruto de R$ ${gross.toFixed(2)} na filial. Requer seleção manual.`;
            }
          }

          unmatchedTransactions.push({
            id: txId,
            source: 'rede',
            storeId,
            storeName: store?.name || tx.storeName,
            date: tx.date || targetDate,
            description: `NSU ${tx.nsu || 'S/N'} — ${tx.method || 'Cartão'} ${tx.authorization ? '(' + tx.authorization + ')' : ''}`.trim(),
            paymentMethod: methodDesc,
            amount,
            status: 'pendente',
            candidateCount: isCollision ? (tier1Candidates.length || competingTxsCount || 2) : 0,
            rejectionReason: reason
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

        // Tier 1: Match Rigoroso de Duplo Fator (Valor Exato/Aberto + Identidade do Cliente)
        const eligibleCandidates = storeOss.filter(os => {
          if (matchedOsNumbers.has(String(os.os_number))) return false;
          return isStrictPixOsMatch(txAmount, fullOfxText, os, TOLERANCE);
        });

        let matchedOs: ParsedOS | undefined;
        let isCollision = false;

        if (eligibleCandidates.length === 1) {
          matchedOs = eligibleCandidates[0];
        } else if (eligibleCandidates.length > 1) {
          isCollision = true;
        }

        // Tier 2: Match via recebíveis de Transferência/PIX da Loja com validação estrita de identidade
        if (!matchedOs && !isCollision) {
          const matchedReceivables = storeReceivables.filter(rec => {
            if (!rec.os_number || matchedOsNumbers.has(String(rec.os_number))) return false;
            const recVal = Number(rec.value || 0);
            if (Math.abs(recVal - txAmount) > TOLERANCE) return false;
            const isTransferOrPix = /TRANSF|PIX|TED|DOC|CONTA/i.test(rec.type || '') || /TRANSF|PIX|TED|DOC/i.test(rec.description || '');
            if (!isTransferOrPix) return false;
            return matchClientTokens(rec.client_name, fullOfxText);
          });

          if (matchedReceivables.length === 1 && matchedReceivables[0].os_number) {
            matchedOs = storeOss.find(os => String(os.os_number) === String(matchedReceivables[0].os_number));
          } else if (matchedReceivables.length > 1) {
            isCollision = true;
          }
        }

        if (matchedOs && !isCollision) {
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
          let reason = `Nenhuma OS encontrada para o valor de R$ ${txAmount.toFixed(2)} na filial.`;
          if (isCollision) {
            const count = eligibleCandidates.length > 1 ? eligibleCandidates.length : 2;
            reason = `Colisão ambígua: ${count} OSs elegíveis com valor R$ ${txAmount.toFixed(2)} na filial. Requer seleção manual.`;
          } else {
            // Verificar se há OS com o mesmo valor mas nome divergente
            const sameValueOs = storeOss.find(os => {
              const osPix = Number(os.parsed_pix_transfer ?? os.pix_transfer_value ?? 0);
              const totalVal = Number(os.total_value ?? os.totalValue ?? 0);
              const paidVal = Number(os.paid_value ?? os.paidValue ?? 0);
              const openBalance = Math.max(0, totalVal - paidVal);
              return Math.abs(osPix - txAmount) <= TOLERANCE ||
                     Math.abs(openBalance - txAmount) <= TOLERANCE ||
                     (paidVal <= 0.05 && totalVal > 0 && Math.abs(totalVal - txAmount) <= TOLERANCE);
            });

            // Verificar se há OS do mesmo cliente com valor divergente
            const sameClientOs = storeOss.find(os => matchClientTokens(os.client_name, fullOfxText));

            if (sameValueOs && !matchClientTokens(sameValueOs.client_name, fullOfxText)) {
              reason = `OS #${sameValueOs.os_number} tem valor compatível, porém o nome do cliente diverge (${sameValueOs.client_name || 'OS'} vs ${tx.counterpart_name || 'Extrato'}).`;
            } else if (sameClientOs) {
              const osVal = Number(sameClientOs.total_value || 0);
              reason = `Cliente identificado na OS #${sameClientOs.os_number} (${sameClientOs.client_name}), porém o valor diverge (OS R$ ${osVal.toFixed(2)} vs Pix R$ ${txAmount.toFixed(2)}).`;
            }
          }

          unmatchedTransactions.push({
            id: txId,
            source: 'ofx_pix',
            storeId,
            storeName: store?.name || ofx.alias,
            date: tx.date || targetDate,
            description: tx.counterpart_name || tx.title || 'PIX Recebido de Cliente',
            paymentMethod: 'PIX',
            amount: txAmount,
            status: 'pendente',
            candidateCount: isCollision ? (eligibleCandidates.length || 2) : 0,
            rejectionReason: reason
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
