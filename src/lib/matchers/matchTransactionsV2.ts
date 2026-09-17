import { OfxTransaction } from '@/lib/parsers/ofxParser';
import { ParsedOS } from '@/hooks/useImportProcessor';

export interface MatchTransactionsV2Params {
  ofxTransactions: OfxTransaction[];
  osList: ParsedOS[];
  targetDate?: string;
  dateToleranceDays?: number; // Padrão: 1 (D-1 a D+1)
  valueToleranceCents?: number; // Padrão: 0.05 (R$ 0,05)
}

export interface MatchV2Confirmed {
  ofx: OfxTransaction;
  os: ParsedOS;
  matchedAmount: number;
  matchReason: 'exact_value_unique_period' | 'exact_value_tie_broken_by_name';
  similarityScore: number;
  extractedClientName: string;
  extractedOfxName: string;
  notes?: string;
}

export interface FalsePositiveAvoided {
  ofx: OfxTransaction;
  rejectedOs: ParsedOS;
  reason: 'name_matched_but_value_mismatched' | 'name_matched_but_date_out_of_window' | 'tie_breaker_rejected';
  details: string;
  similarityScore: number;
}

export interface MatchTransactionsV2Result {
  matches_confirmados: MatchV2Confirmed[];
  falsos_positivos_evitados: FalsePositiveAvoided[];
  orphans: {
    unmatchedOfx: OfxTransaction[];
    unmatchedOs: ParsedOS[];
  };
  stats: {
    totalOfx: number;
    totalOs: number;
    confirmedMatchesCount: number;
    avoidedFalsePositivesCount: number;
    orphanOfxCount: number;
    orphanOsCount: number;
    totalMatchedAmount: number;
  };
}

// Stopwords bancárias e empresariais que não devem contar para similaridade
const STOPWORDS = new Set([
  'LTDA', 'ME', 'EPP', 'EIRELI', 'SA', 'S/A', 'DE', 'DA', 'DO', 'DOS', 'DAS', 'E', 'EM',
  'POSTO', 'AUTO', 'MECANICA', 'SERVICOS', 'COMERCIO', 'ENTRADA', 'PIX', 'TRANSF', 'QRS',
  'TRANSFERENCIA', 'CLIENTE', 'PAGTO', 'PAGAMENTO', 'BANCO', 'BRADESCO', 'ITAU', 'SANTANDER',
  'CAIXA', 'NUBANK', 'INTER', 'C6', 'MERCADO', 'PAGO', 'ENVIADO', 'RECEBIDO', 'TED', 'DOC',
  'TEF', 'CONTA', 'EXTRATO', 'DEPOSITO'
]);

// Sobrenomes muito comuns que sozinhos NÃO podem fechar match
const COMMON_SURNAMES = new Set([
  'SILVA', 'SANTOS', 'SOUZA', 'OLIVEIRA', 'PEREIRA', 'LIMA', 'CARVALHO', 'FERREIRA',
  'RODRIGUES', 'ALVES', 'GOMES', 'MARTINS', 'RIBEIRO', 'ALMEIDA', 'COSTA', 'ROCHA'
]);

/**
 * Normaliza textos removendo acentos, pontuação e múltiplos espaços.
 */
export function normalizeText(text: string | null | undefined): string {
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
 * Higieniza o nome do cliente da OS.
 */
export function cleanCustomerName(rawName: string | null | undefined): string {
  if (!rawName) return '';
  return normalizeText(rawName)
    .replace(/[-–—]\s*(?:LTDA|ME|EPP|EIRELI|S\/A|SA)\b/g, '')
    .replace(/\b(?:LTDA|ME|EPP|EIRELI|S\/A|SA)\b/g, '')
    .replace(/\bDE VEICULOS\b/g, '')
    .replace(/\bCOMERCIO DE\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extrai o nome da contraparte de títulos OFX (removendo tags de PIX, CPF/CNPJ e prefixos).
 */
export function extractOfxCounterpart(title: string | null | undefined, counterpartName?: string | null): string {
  if (counterpartName && counterpartName.trim().length > 2) {
    return cleanCustomerName(counterpartName);
  }
  if (!title) return '';

  let cleaned = normalizeText(title);

  // Remove CPFs e CNPJs
  cleaned = cleaned.replace(/\b\d{2}\s*\d{3}\s*\d{3}\s*\d{4}\s*\d{2}\b/g, '');
  cleaned = cleaned.replace(/\b\d{3}\s*\d{3}\s*\d{3}\s*\d{2}\b/g, '');
  cleaned = cleaned.replace(/\b\d{11,14}\b/g, '');

  // Remove prefixos bancários
  cleaned = cleaned
    .replace(/\b(?:PIX\s+QRS|PIX\s+RECEBIDO|PIX\s+ENVIADO|PIX\s+TRANSF|PIX|TED|DOC|TEF|TRANSF\s+BANC)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return cleanCustomerName(cleaned);
}

/**
 * Distância Levenshtein padrão entre duas strings.
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substituição
          matrix[i][j - 1] + 1,     // inserção
          matrix[i - 1][j] + 1      // deleção
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calcula similaridade composta entre nome do cliente e texto do OFX [0 a 1].
 */
export function computeCompositeSimilarity(clientName: string | null | undefined, ofxText: string | null | undefined): number {
  const normClient = cleanCustomerName(clientName);
  const normOfx = extractOfxCounterpart(ofxText);

  if (!normClient || !normOfx) return 0;
  if (normClient === normOfx) return 1.0;

  // 1. Similaridade Levenshtein normalizada
  const maxLen = Math.max(normClient.length, normOfx.length);
  const levDist = levenshteinDistance(normClient, normOfx);
  const levSim = Math.max(0, 1 - (levDist / maxLen));

  // 2. Coincidência de tokens não-stopwords
  const clientTokens = normClient.split(' ').filter(t => t.length >= 2 && !STOPWORDS.has(t));
  const ofxTokens = normOfx.split(' ').filter(t => t.length >= 2 && !STOPWORDS.has(t));

  if (clientTokens.length === 0 || ofxTokens.length === 0) {
    return levSim;
  }

  let matchedTokens = 0;
  let hasSpecificNameMatch = false;

  for (const ct of clientTokens) {
    for (const ot of ofxTokens) {
      if (ct === ot) {
        matchedTokens++;
        if (!COMMON_SURNAMES.has(ct) && ct.length >= 3) {
          hasSpecificNameMatch = true;
        }
      } else if (ct.length >= 4 && ot.length >= 4 && (ct.startsWith(ot) || ot.startsWith(ct))) {
        matchedTokens += 0.8;
        if (!COMMON_SURNAMES.has(ct)) {
          hasSpecificNameMatch = true;
        }
      }
    }
  }

  const tokenOverlap = (matchedTokens * 2) / (clientTokens.length + ofxTokens.length);

  // Penalidade se a única coincidência for um sobrenome genérico (ex: "SILVA")
  let penalty = 1.0;
  if (!hasSpecificNameMatch && matchedTokens > 0) {
    penalty = 0.5; // Reduz a confiança drasticamente se coincidiu apenas "Silva"
  }

  const score = ((levSim * 0.4) + (tokenOverlap * 0.6)) * penalty;
  return Math.min(1.0, Math.max(0, Number(score.toFixed(3))));
}

/**
 * Verifica se duas datas estão dentro da janela de tolerância em dias.
 */
export function isWithinDateTolerance(date1Str: string, date2Str: string, toleranceDays: number = 1): boolean {
  if (!date1Str || !date2Str) return true;
  const d1 = new Date(date1Str.split('T')[0] + 'T12:00:00Z');
  const d2 = new Date(date2Str.split('T')[0] + 'T12:00:00Z');
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return true;
  const diffDays = Math.abs((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays <= toleranceDays;
}

/**
 * Função Pura: Executa a Heurística de Funil para Conciliação de PIX x OS
 */
export function matchTransactionsV2(params: MatchTransactionsV2Params): MatchTransactionsV2Result {
  const {
    ofxTransactions,
    osList,
    targetDate,
    dateToleranceDays = 1,
    valueToleranceCents = 0.05
  } = params;

  const matches_confirmados: MatchV2Confirmed[] = [];
  const falsos_positivos_evitados: FalsePositiveAvoided[] = [];
  const matchedOsNumbers = new Set<string>();
  const matchedOfxIds = new Set<string>();

  // Filtra apenas transações de entrada bancária com valor positivo
  const incomingOfx = (ofxTransactions || []).filter(tx => tx.type === 'in' && Math.abs(tx.amount || 0) > 0);

  // Processa cada transação OFX através do Funil
  incomingOfx.forEach((ofx, idx) => {
    const ofxId = ofx.fitid || `ofx-${idx}-${ofx.amount}`;
    const ofxAmount = Math.abs(Number(ofx.amount || 0));
    const ofxDate = ofx.date ? ofx.date.split('T')[0] : (targetDate || '');
    const fullOfxText = `${ofx.title || ''} ${ofx.counterpart_name || ''}`.trim();

    // ─────────────────────────────────────────────────────────────
    // STEP 1: Hard Match (Filtro Numérico Estrito e Janela de Data)
    // ─────────────────────────────────────────────────────────────
    const candidateOss = (osList || []).filter(os => {
      if (matchedOsNumbers.has(String(os.os_number))) return false;

      // Validação de Data (janela de tolerância D-1 a D+1)
      const osDate = os.opened_at ? os.opened_at.split('T')[0] : (os.closed_at ? os.closed_at.split('T')[0] : '');
      if (ofxDate && osDate && !isWithinDateTolerance(ofxDate, osDate, dateToleranceDays)) {
        return false;
      }

      // Validação de Valor: Compara com parsed_pix_transfer, total_value ou paid_value
      const pixVal = Number(os.parsed_pix_transfer || 0);
      const totalVal = Number(os.total_value || 0);
      const paidVal = Number(os.paid_value || 0);

      const matchesPix = pixVal > 0 && Math.abs(pixVal - ofxAmount) <= valueToleranceCents;
      const matchesTotal = totalVal > 0 && Math.abs(totalVal - ofxAmount) <= valueToleranceCents;
      const matchesPaid = paidVal > 0 && Math.abs(paidVal - ofxAmount) <= valueToleranceCents;

      return matchesPix || matchesTotal || matchesPaid;
    });

    // CENÁRIO A: Nenhuma OS bateu valor + data
    if (candidateOss.length === 0) {
      // Checa se alguma OS possui nome semelhante para registrar FALSO POSITIVO EVITADO
      (osList || []).forEach(os => {
        if (matchedOsNumbers.has(String(os.os_number))) return;
        const simScore = computeCompositeSimilarity(os.client_name, fullOfxText);

        if (simScore >= 0.40) {
          const osDate = os.opened_at ? os.opened_at.split('T')[0] : '';
          const isDateIssue = ofxDate && osDate && !isWithinDateTolerance(ofxDate, osDate, dateToleranceDays);

          falsos_positivos_evitados.push({
            ofx,
            rejectedOs: os,
            reason: isDateIssue ? 'name_matched_but_date_out_of_window' : 'name_matched_but_value_mismatched',
            details: isDateIssue
              ? `Cliente '${os.client_name}' (OS #${os.os_number}) tem data divergente (${osDate} vs ${ofxDate}, > ${dateToleranceDays}d).`
              : `Cliente '${os.client_name}' (OS #${os.os_number}) tem valor divergente (PIX: R$ ${ofxAmount.toFixed(2)} vs OS: R$ ${Number(os.total_value || 0).toFixed(2)}).`,
            similarityScore: simScore
          });
        }
      });
      return;
    }

    // CENÁRIO B: Exatamente 1 OS bateu valor + data (Match Unívoco por Valor)
    if (candidateOss.length === 1) {
      const matchedOs = candidateOss[0];
      const simScore = computeCompositeSimilarity(matchedOs.client_name, fullOfxText);

      matchedOsNumbers.add(String(matchedOs.os_number));
      matchedOfxIds.add(ofxId);

      matches_confirmados.push({
        ofx,
        os: matchedOs,
        matchedAmount: ofxAmount,
        matchReason: 'exact_value_unique_period',
        similarityScore: simScore,
        extractedClientName: cleanCustomerName(matchedOs.client_name),
        extractedOfxName: extractOfxCounterpart(ofx.title, ofx.counterpart_name),
        notes: `Valor R$ ${ofxAmount.toFixed(2)} unívoco no período.`
      });
      return;
    }

    // ─────────────────────────────────────────────────────────────
    // STEP 2: Tie-Breaker (Desempate por Similaridade de String Decisivo)
    // Acionado apenas se houver duas ou mais OSs candidatas com idêntico valor
    // ─────────────────────────────────────────────────────────────
    const scoredCandidates = candidateOss.map(os => ({
      os,
      score: computeCompositeSimilarity(os.client_name, fullOfxText)
    })).sort((a, b) => b.score - a.score);

    const topCandidate = scoredCandidates[0];
    const secondCandidate = scoredCandidates[1];

    // O vencedor precisa ter score mínimo de 0.50 e superar o segundo candidato com folga
    const isDecisiveWinner = topCandidate.score >= 0.50 && (topCandidate.score > (secondCandidate?.score || 0) + 0.10);

    if (isDecisiveWinner) {
      matchedOsNumbers.add(String(topCandidate.os.os_number));
      matchedOfxIds.add(ofxId);

      matches_confirmados.push({
        ofx,
        os: topCandidate.os,
        matchedAmount: ofxAmount,
        matchReason: 'exact_value_tie_broken_by_name',
        similarityScore: topCandidate.score,
        extractedClientName: cleanCustomerName(topCandidate.os.client_name),
        extractedOfxName: extractOfxCounterpart(ofx.title, ofx.counterpart_name),
        notes: `Desempate entre ${candidateOss.length} OSs de mesmo valor R$ ${ofxAmount.toFixed(2)}. Score: ${(topCandidate.score * 100).toFixed(0)}%.`
      });

      // Registra os candidatos derrotados no desempate
      scoredCandidates.slice(1).forEach(rejected => {
        falsos_positivos_evitados.push({
          ofx,
          rejectedOs: rejected.os,
          reason: 'tie_breaker_rejected',
          details: `OS #${rejected.os.os_number} (${rejected.os.client_name}) tinha o mesmo valor (R$ ${ofxAmount.toFixed(2)}), mas perdeu no desempate textual (Score: ${(rejected.score * 100).toFixed(0)}% vs ${(topCandidate.score * 100).toFixed(0)}%).`,
          similarityScore: rejected.score
        });
      });
    } else {
      // Empate ambíguo ou similaridade inconclusiva: NÃO CHUTA!
      scoredCandidates.forEach(ambiguous => {
        falsos_positivos_evitados.push({
          ofx,
          rejectedOs: ambiguous.os,
          reason: 'tie_breaker_rejected',
          details: `Colisão de valor R$ ${ofxAmount.toFixed(2)} entre OS #${ambiguous.os.os_number} (${ambiguous.os.client_name}) e outras ${candidateOss.length - 1} OSs com similaridade inconclusiva (${(ambiguous.score * 100).toFixed(0)}%). Mantido como pendente para decisão humana.`,
          similarityScore: ambiguous.score
        });
      });
    }
  });

  // Identifica órfãos remanescentes
  const unmatchedOfx = incomingOfx.filter((tx, idx) => {
    const id = tx.fitid || `ofx-${idx}-${tx.amount}`;
    return !matchedOfxIds.has(id);
  });

  const unmatchedOs = (osList || []).filter(os => !matchedOsNumbers.has(String(os.os_number)));

  const totalMatchedAmount = matches_confirmados.reduce((acc, m) => acc + m.matchedAmount, 0);

  return {
    matches_confirmados,
    falsos_positivos_evitados,
    orphans: {
      unmatchedOfx,
      unmatchedOs
    },
    stats: {
      totalOfx: incomingOfx.length,
      totalOs: osList.length,
      confirmedMatchesCount: matches_confirmados.length,
      avoidedFalsePositivesCount: falsos_positivos_evitados.length,
      orphanOfxCount: unmatchedOfx.length,
      orphanOsCount: unmatchedOs.length,
      totalMatchedAmount: Number(totalMatchedAmount.toFixed(2))
    }
  };
}
