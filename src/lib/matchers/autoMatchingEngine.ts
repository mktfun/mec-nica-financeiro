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
  }>;
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
function matchClientTokens(clientName: string | null | undefined, counterpartText: string | null | undefined): boolean {
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

  if (clientTokens.length === 0 || counterTokens.length === 0) return false;

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

        // Tier 4: Match único e inequívoco por valor na filial (sem colisão)
        if (!matchedOs) {
          const candidateOss = storeOss.filter(os => {
            if (matchedOsNumbers.has(String(os.os_number))) return false;
            const paid = Number(os.paid_value || 0);
            const total = Number(os.total_value || 0);
            const matchesGross = Math.abs(paid - gross) <= TOLERANCE || Math.abs(total - gross) <= TOLERANCE;
            const matchesNet = Math.abs(paid - net) <= TOLERANCE || Math.abs(total - net) <= TOLERANCE;
            return matchesGross || matchesNet;
          });

          if (candidateOss.length === 1) {
            matchedOs = candidateOss[0];
          }
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

        // Ignorar créditos de adquirentes e rendimentos financeiros
        const isAdquirente = /REDE|REDECARD|CIELO|GETNET|STONE|PAGSEGURO|BIN|ADQ|MAST|VISA|ELO/i.test(upperText);
        const isRendimento = /REND|APLIC|RESG|CDB|LCI|LCA|JUROS|POUP|AUT APR/i.test(upperText);
        if (isAdquirente || isRendimento) return;

        const txId = tx.fitid || `ofx-${tx.amount}-${tx.date}-${Math.random()}`;
        const txAmount = Number(tx.amount || 0);
        const storeOss = osByStore.get(storeId) || [];
        const storeReceivables = receivablesByStore.get(storeId) || [];

        // Tier 1: Match por Nome / CNPJ do Cliente + Valor Exato (em parsed_pix, paid_value, total_value ou receivables)
        let matchedOs = storeOss.find(os => {
          if (matchedOsNumbers.has(String(os.os_number))) return false;
          const osPix = Number(os.parsed_pix_transfer || 0);
          const osPaid = Number(os.paid_value || 0);
          const osTotal = Number(os.total_value || 0);

          const valueMatches = Math.abs(osPix - txAmount) <= TOLERANCE ||
                               Math.abs(osPaid - txAmount) <= TOLERANCE ||
                               Math.abs(osTotal - txAmount) <= TOLERANCE;

          if (!valueMatches) return false;

          return matchClientTokens(os.client_name, fullOfxText);
        });

        // Tier 2: Match via receivablesArray de Transferência/PIX da Loja (BLINDAGEM: Boletos futuros NÃO entram aqui)
        if (!matchedOs) {
          const matchedReceivable = storeReceivables.find(rec => {
            if (!rec.os_number || matchedOsNumbers.has(String(rec.os_number))) return false;
            // Se for boleto com vencimento futuro, NÃO casar com PIX à vista do dia
            if (rec.type === 'Boleto') return false;

            const recVal = Number(rec.value || 0);
            const isTransferOrPix = /TRANSF|PIX|TED|DOC|CONTA/i.test(rec.type || '') || /TRANSF|PIX|TED|DOC/i.test(rec.description || '');
            if (!isTransferOrPix) return false;
            return Math.abs(recVal - txAmount) <= TOLERANCE;
          });

          if (matchedReceivable && matchedReceivable.os_number) {
            matchedOs = storeOss.find(os => String(os.os_number) === String(matchedReceivable.os_number));
          }
        }

        // Tier 3: Match por parsed_pix_transfer ou payment_method contendo PIX/Transf
        if (!matchedOs) {
          matchedOs = storeOss.find(os => {
            if (matchedOsNumbers.has(String(os.os_number))) return false;
            const osPix = Number(os.parsed_pix_transfer || 0);
            if (osPix > 0 && Math.abs(osPix - txAmount) <= TOLERANCE) return true;

            const pm = String(os.payment_method || '').toLowerCase();
            const isPixTagged = pm.includes('pix') || pm.includes('transf') || pm.includes('ted') || pm.includes('doc') || pm.includes('dep') || pm.includes('conta');
            const osVal = Number(os.paid_value || 0) || Number(os.total_value || 0);

            return isPixTagged && Math.abs(osVal - txAmount) <= TOLERANCE;
          });
        }

        // Tier 4: Match único e inequívoco por valor na filial (sem colisão de múltiplas OSs)
        if (!matchedOs) {
          const candidateOss = storeOss.filter(os => {
            if (matchedOsNumbers.has(String(os.os_number))) return false;
            const paid = Number(os.paid_value || 0);
            const total = Number(os.total_value || 0);
            return Math.abs(paid - txAmount) <= TOLERANCE || Math.abs(total - txAmount) <= TOLERANCE;
          });

          if (candidateOss.length === 1) {
            matchedOs = candidateOss[0];
          }
        }

        if (matchedOs) {
          matchedOsNumbers.add(String(matchedOs.os_number));
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

  return {
    matchedCount: resolvedMatches.length,
    unmatchedTransactions,
    resolvedMatches
  };
}
