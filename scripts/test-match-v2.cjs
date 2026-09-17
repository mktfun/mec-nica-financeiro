const assert = require('assert');

// Implementação espelho para teste direto no runtime Node CJS
const STOPWORDS = new Set([
  'LTDA', 'ME', 'EPP', 'EIRELI', 'SA', 'S/A', 'DE', 'DA', 'DO', 'DOS', 'DAS', 'E', 'EM',
  'POSTO', 'AUTO', 'MECANICA', 'SERVICOS', 'COMERCIO', 'ENTRADA', 'PIX', 'TRANSF', 'QRS',
  'TRANSFERENCIA', 'CLIENTE', 'PAGTO', 'PAGAMENTO', 'BANCO', 'BRADESCO', 'ITAU', 'SANTANDER',
  'CAIXA', 'NUBANK', 'INTER', 'C6', 'MERCADO', 'PAGO', 'ENVIADO', 'RECEBIDO', 'TED', 'DOC',
  'TEF', 'CONTA', 'EXTRATO', 'DEPOSITO'
]);

const COMMON_SURNAMES = new Set([
  'SILVA', 'SANTOS', 'SOUZA', 'OLIVEIRA', 'PEREIRA', 'LIMA', 'CARVALHO', 'FERREIRA',
  'RODRIGUES', 'ALVES', 'GOMES', 'MARTINS', 'RIBEIRO', 'ALMEIDA', 'COSTA', 'ROCHA'
]);

function normalizeText(text) {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanCustomerName(rawName) {
  if (!rawName) return '';
  return normalizeText(rawName)
    .replace(/[-–—]\s*(?:LTDA|ME|EPP|EIRELI|S\/A|SA)\b/g, '')
    .replace(/\b(?:LTDA|ME|EPP|EIRELI|S\/A|SA)\b/g, '')
    .replace(/\bDE VEICULOS\b/g, '')
    .replace(/\bCOMERCIO DE\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractOfxCounterpart(title, counterpartName) {
  if (counterpartName && counterpartName.trim().length > 2) {
    return cleanCustomerName(counterpartName);
  }
  if (!title) return '';
  let cleaned = normalizeText(title);
  cleaned = cleaned.replace(/\b\d{2}\s*\d{3}\s*\d{3}\s*\d{4}\s*\d{2}\b/g, '');
  cleaned = cleaned.replace(/\b\d{3}\s*\d{3}\s*\d{3}\s*\d{2}\b/g, '');
  cleaned = cleaned.replace(/\b\d{11,14}\b/g, '');
  cleaned = cleaned
    .replace(/\b(?:PIX\s+QRS|PIX\s+RECEBIDO|PIX\s+ENVIADO|PIX\s+TRANSF|PIX|TED|DOC|TEF|TRANSF\s+BANC)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleanCustomerName(cleaned);
}

function levenshteinDistance(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function computeCompositeSimilarity(clientName, ofxText) {
  const normClient = cleanCustomerName(clientName);
  const normOfx = extractOfxCounterpart(ofxText);
  if (!normClient || !normOfx) return 0;
  if (normClient === normOfx) return 1.0;

  const maxLen = Math.max(normClient.length, normOfx.length);
  const levDist = levenshteinDistance(normClient, normOfx);
  const levSim = Math.max(0, 1 - (levDist / maxLen));

  const clientTokens = normClient.split(' ').filter(t => t.length >= 2 && !STOPWORDS.has(t));
  const ofxTokens = normOfx.split(' ').filter(t => t.length >= 2 && !STOPWORDS.has(t));

  if (clientTokens.length === 0 || ofxTokens.length === 0) return levSim;

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
  let penalty = 1.0;
  if (!hasSpecificNameMatch && matchedTokens > 0) {
    penalty = 0.5;
  }
  const score = ((levSim * 0.4) + (tokenOverlap * 0.6)) * penalty;
  return Math.min(1.0, Math.max(0, Number(score.toFixed(3))));
}

function isWithinDateTolerance(date1Str, date2Str, toleranceDays = 1) {
  if (!date1Str || !date2Str) return true;
  const d1 = new Date(date1Str.split('T')[0] + 'T12:00:00Z');
  const d2 = new Date(date2Str.split('T')[0] + 'T12:00:00Z');
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return true;
  const diffDays = Math.abs((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays <= toleranceDays;
}

function matchTransactionsV2(params) {
  const {
    ofxTransactions,
    osList,
    targetDate,
    dateToleranceDays = 1,
    valueToleranceCents = 0.05
  } = params;

  const matches_confirmados = [];
  const falsos_positivos_evitados = [];
  const matchedOsNumbers = new Set();
  const matchedOfxIds = new Set();

  const incomingOfx = (ofxTransactions || []).filter(tx => tx.type === 'in' && Math.abs(tx.amount || 0) > 0);

  incomingOfx.forEach((ofx, idx) => {
    const ofxId = ofx.fitid || `ofx-${idx}-${ofx.amount}`;
    const ofxAmount = Math.abs(Number(ofx.amount || 0));
    const ofxDate = ofx.date ? ofx.date.split('T')[0] : (targetDate || '');
    const fullOfxText = `${ofx.title || ''} ${ofx.counterpart_name || ''}`.trim();

    // STEP 1: Hard Match
    const candidateOss = (osList || []).filter(os => {
      if (matchedOsNumbers.has(String(os.os_number))) return false;

      const osDate = os.opened_at ? os.opened_at.split('T')[0] : (os.closed_at ? os.closed_at.split('T')[0] : '');
      if (ofxDate && osDate && !isWithinDateTolerance(ofxDate, osDate, dateToleranceDays)) {
        return false;
      }

      const pixVal = Number(os.parsed_pix_transfer || 0);
      const totalVal = Number(os.total_value || 0);
      const paidVal = Number(os.paid_value || 0);

      const matchesPix = pixVal > 0 && Math.abs(pixVal - ofxAmount) <= valueToleranceCents;
      const matchesTotal = totalVal > 0 && Math.abs(totalVal - ofxAmount) <= valueToleranceCents;
      const matchesPaid = paidVal > 0 && Math.abs(paidVal - ofxAmount) <= valueToleranceCents;

      return matchesPix || matchesTotal || matchesPaid;
    });

    if (candidateOss.length === 0) {
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
            details: `Cliente '${os.client_name}' rejeitado (PIX R$ ${ofxAmount} vs OS R$ ${os.total_value})`,
            similarityScore: simScore
          });
        }
      });
      return;
    }

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
        similarityScore: simScore
      });
      return;
    }

    // STEP 2: Tie-breaker
    const scoredCandidates = candidateOss.map(os => ({
      os,
      score: computeCompositeSimilarity(os.client_name, fullOfxText)
    })).sort((a, b) => b.score - a.score);

    const topCandidate = scoredCandidates[0];
    const secondCandidate = scoredCandidates[1];
    const isDecisiveWinner = topCandidate.score >= 0.50 && (topCandidate.score > (secondCandidate?.score || 0) + 0.10);

    if (isDecisiveWinner) {
      matchedOsNumbers.add(String(topCandidate.os.os_number));
      matchedOfxIds.add(ofxId);
      matches_confirmados.push({
        ofx,
        os: topCandidate.os,
        matchedAmount: ofxAmount,
        matchReason: 'exact_value_tie_broken_by_name',
        similarityScore: topCandidate.score
      });
      scoredCandidates.slice(1).forEach(rejected => {
        falsos_positivos_evitados.push({
          ofx,
          rejectedOs: rejected.os,
          reason: 'tie_breaker_rejected',
          details: `OS #${rejected.os.os_number} (${rejected.os.client_name}) perdeu no desempate`,
          similarityScore: rejected.score
        });
      });
    }
  });

  const unmatchedOfx = incomingOfx.filter((tx, idx) => {
    const id = tx.fitid || `ofx-${idx}-${tx.amount}`;
    return !matchedOfxIds.has(id);
  });
  const unmatchedOs = (osList || []).filter(os => !matchedOsNumbers.has(String(os.os_number)));

  return {
    matches_confirmados,
    falsos_positivos_evitados,
    orphans: { unmatchedOfx, unmatchedOs }
  };
}

// ─────────────────────────────────────────────────────────────
// EXECUÇÃO DOS TESTES
// ─────────────────────────────────────────────────────────────
console.log('=== TEST SUITE: matchTransactionsV2 Funnel Algorithm ===\n');

// Mock Data
const MOCK_OFX = [
  { amount: 450.00, type: 'in', date: '2026-09-16T14:20:00Z', title: 'PIX QRS RENATO PEREIRA', counterpart_name: 'RENATO PEREIRA', fitid: '1' },
  { amount: 350.00, type: 'in', date: '2026-09-16T15:10:00Z', title: 'PIX RECEBIDO CARLOS EDUARDO', counterpart_name: 'CARLOS EDUARDO SILVA', fitid: '2' },
  { amount: 350.00, type: 'in', date: '2026-09-16T16:00:00Z', title: 'PIX ENVIADO MARCOS A SOUZA', counterpart_name: 'MARCOS ANTONIO SOUZA', fitid: '3' },
  { amount: 50.00, type: 'in', date: '2026-09-16T11:00:00Z', title: 'PIX QRS MARIA SILVA', counterpart_name: 'MARIA SILVA', fitid: '4' },
  { amount: 180.00, type: 'in', date: '2026-09-16T10:30:00Z', title: 'PIX TRANSF JOAO SILVA', counterpart_name: 'JOAO SILVA', fitid: '5' },
  { amount: 720.00, type: 'in', date: '2026-09-16T09:15:00Z', title: 'PIX RECEBIDO LUCAS MARTINS', counterpart_name: 'LUCAS MARTINS', fitid: '6' },
  { amount: 600.00, type: 'in', date: '2026-09-16T12:00:00Z', title: 'PIX QRS ROBERTO COSTA', counterpart_name: 'ROBERTO COSTA', fitid: '7' },
  { amount: 289.98, type: 'in', date: '2026-09-16T17:00:00Z', title: 'PIX ENVIADO JULIANA ALVES', counterpart_name: 'JULIANA ALVES', fitid: '8' },
  { amount: 95.50, type: 'in', date: '2026-09-16T13:45:00Z', title: 'PIX RECEBIDO CLIENTE AVULSO BANCO INTER', counterpart_name: 'CLIENTE AVULSO', fitid: '9' },
  { amount: 512.40, type: 'in', date: '2026-09-16T18:30:00Z', title: 'PIX QRS THIAGO ROCHA', counterpart_name: 'THIAGO ROCHA', fitid: '10' }
];

const MOCK_OS = [
  { os_number: '1001', client_name: 'RENATO PEREIRA', opened_at: '2026-09-16', total_value: 450.00, parsed_pix_transfer: 450.00 },
  { os_number: '1002', client_name: 'CARLOS EDUARDO SILVA', opened_at: '2026-09-16', total_value: 350.00, parsed_pix_transfer: 350.00 },
  { os_number: '1003', client_name: 'MARCOS ANTONIO SOUZA', opened_at: '2026-09-16', total_value: 350.00, parsed_pix_transfer: 350.00 },
  { os_number: '1004', client_name: 'MARIA SILVA', opened_at: '2026-09-16', total_value: 1250.00, parsed_pix_transfer: 0 },
  { os_number: '1005', client_name: 'PEDRO SILVA', opened_at: '2026-09-16', total_value: 890.00, parsed_pix_transfer: 890.00 },
  { os_number: '1006', client_name: 'LUCAS MARTINS', opened_at: '2026-09-15', total_value: 720.00, parsed_pix_transfer: 720.00 },
  { os_number: '1007', client_name: 'ROBERTO COSTA', opened_at: '2026-09-10', total_value: 600.00, parsed_pix_transfer: 600.00 }, // D-6 (fora)
  { os_number: '1008', client_name: 'JULIANA ALVES', opened_at: '2026-09-16', total_value: 290.00, parsed_pix_transfer: 290.00 }, // delta 0.02
  { os_number: '1009', client_name: 'THIAGO ROCHA', opened_at: '2026-09-16', total_value: 512.40, parsed_pix_transfer: 512.40 },
  { os_number: '1010', client_name: 'FERNANDO GOMES', opened_at: '2026-09-16', total_value: 1100.00, parsed_pix_transfer: 1100.00 }
];

const res = matchTransactionsV2({
  ofxTransactions: MOCK_OFX,
  osList: MOCK_OS,
  targetDate: '2026-09-16',
  dateToleranceDays: 1,
  valueToleranceCents: 0.05
});

// Teste 1: Matches Confirmados
console.log(`[TEST 1] Matches Confirmados: ${res.matches_confirmados.length}`);
res.matches_confirmados.forEach(m => {
  console.log(`  ✓ PIX R$ ${m.matchedAmount} <-> OS #${m.os.os_number} (${m.os.client_name}) [${m.matchReason}]`);
});
assert.ok(res.matches_confirmados.some(m => m.os.os_number === '1001'), 'OS 1001 deve bater (Renato Pereira)');
assert.ok(res.matches_confirmados.some(m => m.os.os_number === '1002'), 'OS 1002 deve bater via desempate (Carlos Eduardo Silva)');
assert.ok(res.matches_confirmados.some(m => m.os.os_number === '1003'), 'OS 1003 deve bater via desempate (Marcos Antonio Souza)');
assert.ok(res.matches_confirmados.some(m => m.os.os_number === '1006'), 'OS 1006 deve bater (Lucas Martins - D-1)');
assert.ok(res.matches_confirmados.some(m => m.os.os_number === '1008'), 'OS 1008 deve bater (Juliana Alves - 2 centavos)');
assert.ok(res.matches_confirmados.some(m => m.os.os_number === '1009'), 'OS 1009 deve bater (Thiago Rocha)');
console.log('-> PASS: Todos os 6 matches válidos foram confirmados!\n');

// Teste 2: Falsos Positivos Evitados
console.log(`[TEST 2] Falsos Positivos Evitados: ${res.falsos_positivos_evitados.length}`);
res.falsos_positivos_evitados.forEach(f => {
  console.log(`  🛡️ ${f.reason}: ${f.details}`);
});
// Valida que Maria Silva (R$ 50 vs R$ 1250) foi evitada
const mariaAvoided = res.falsos_positivos_evitados.find(f => f.rejectedOs.os_number === '1004');
assert.ok(mariaAvoided, 'Maria Silva (R$ 50 vs R$ 1250) DEVE estar em falsos positivos evitados');
assert.strictEqual(mariaAvoided.reason, 'name_matched_but_value_mismatched');

// Valida que Roberto Costa (D-6) foi evitado por data
const robertoAvoided = res.falsos_positivos_evitados.find(f => f.rejectedOs.os_number === '1007');
assert.ok(robertoAvoided, 'Roberto Costa (data D-6) DEVE estar em falsos positivos evitados');
assert.strictEqual(robertoAvoided.reason, 'name_matched_but_date_out_of_window');
console.log('-> PASS: Falsos positivos por nome e data foram bloqueados com sucesso!\n');

// Teste 3: Órfãos
console.log(`[TEST 3] Órfãos identificados:`);
console.log(`  OFX órfãos: ${res.orphans.unmatchedOfx.length} (${res.orphans.unmatchedOfx.map(t => `R$ ${t.amount}`).join(', ')})`);
console.log(`  OS órfãs: ${res.orphans.unmatchedOs.length} (${res.orphans.unmatchedOs.map(o => `OS #${o.os_number}`).join(', ')})`);
assert.ok(res.orphans.unmatchedOfx.some(t => t.fitid === '9'), 'OFX 95.50 deve ser órfão');
assert.ok(res.orphans.unmatchedOs.some(o => o.os_number === '1010'), 'OS 1010 (1100.00) deve ser órfã');
console.log('-> PASS: Órfãos isolados sem falso pareamento!\n');

console.log('🎉 TODOS OS TESTES PASSARAM COM SUCESSO (100% DETERMINÍSTICO)!');
