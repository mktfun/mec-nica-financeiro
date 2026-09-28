// tests/ofxBalanceCandidates.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { 
  parseOFXContent, 
  normalizeMemoText, 
  isClosingDayBalanceMemo, 
  isPreviousBalanceMemo 
} from '../src/lib/parsers/ofxParser.ts';

describe('Spec 439 — Unit Tests: Candidatos de Saldo OFX por Conta e Data', () => {

  describe('1. Classificação e Exclusividade Mútua de Rótulos de Saldo', () => {
    it('Garante que SALDO ANTERIOR é sempre abertura e nunca fechamento', () => {
      const norm = normalizeMemoText('SALDO ANTERIOR');
      assert.strictEqual(isPreviousBalanceMemo(norm), true);
      assert.strictEqual(isClosingDayBalanceMemo(norm), false);
    });

    it('Garante que SALDO DO DIA é fechamento e nunca abertura', () => {
      const norm = normalizeMemoText('SALDO DO DIA');
      assert.strictEqual(isPreviousBalanceMemo(norm), false);
      assert.strictEqual(isClosingDayBalanceMemo(norm), true);
    });

    it('Garante que SALDO DO DIA ANTERIOR é abertura por contexto e não fechamento', () => {
      const norm = normalizeMemoText('SALDO DO DIA ANTERIOR');
      assert.strictEqual(isPreviousBalanceMemo(norm), true);
      assert.strictEqual(isClosingDayBalanceMemo(norm), false);
    });

    it('Garante que SALDO TOTAL DISPONÍVEL DIA é fechamento', () => {
      const norm = normalizeMemoText('SALDO TOTAL DISPONÍVEL DIA');
      assert.strictEqual(isPreviousBalanceMemo(norm), false);
      assert.strictEqual(isClosingDayBalanceMemo(norm), true);
    });
  });

  describe('2. Quatro Padrões Reais Sintéticos (Planalto, Rudge Ramos, Mauá, Piraporinha)', () => {

    it('Planalto (7386 / 166586): MEMO -R$ 66.094,98 (25/09) vs LEDGERBAL -R$ 62.894,98 (27/09) [Diff +R$ 3.200,00]', () => {
      const ofx = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
<OFX>
<BANKMSGSRSV1><STMTTRNRS><STMTRS>
<BANKACCTFROM>
<BANKID>0341
<BRANCHID>7386
<ACCTID>166586
</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>20260925000000[-03:EST]
<DTEND>20260925235959[-03:EST]
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260924100000[-03:EST]
<TRNAMT>-68094.98
<FITID>20260924001
<MEMO>SALDO ANTERIOR
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260925110000[-03:EST]
<TRNAMT>2000.00
<FITID>20260925002
<MEMO>PIX RECEBIDO CLIENTE
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260925100000[-03:EST]
<TRNAMT>-66094.98
<FITID>20260925003
<MEMO>SALDO TOTAL DISPONÍVEL DIA
</STMTTRN>
</BANKTRANLIST>
<LEDGERBAL>
<BALAMT>-62894.98
<DTASOF>20260927100000[-03:EST]
</LEDGERBAL>
</STMTRS></STMTTRNRS></BANKMSGSRSV1>
</OFX>`;

      const res = parseOFXContent(ofx, 'Extrato_7386_166586_27-09-2026.ofx');

      assert.strictEqual(res.accountKey, '7386_166586');
      assert.strictEqual(res.transactions.length, 1, 'Somente o PIX operacional deve constar em transactions');
      assert.strictEqual(res.transactions[0].amount, 2000.00);

      // Conferir candidatos extraídos
      assert.ok(Array.isArray(res.balanceCandidates), 'balanceCandidates deve ser um array');
      const candidates = res.balanceCandidates;

      // 1. Saldo Anterior
      const opening = candidates.find(c => c.balanceRole === 'OPENING');
      assert.ok(opening, 'Candidato de abertura encontrado');
      assert.strictEqual(opening.postedDate, '2026-09-24');
      assert.strictEqual(opening.amount, -68094.98);
      assert.strictEqual(opening.amountCents, -6809498);

      // 2. Saldo do Dia (MEMO 25/09)
      const closing = candidates.find(c => c.sourceKind === 'STMTTRN_MEMO' && c.balanceRole === 'CLOSING');
      assert.ok(closing, 'Candidato CLOSING por MEMO encontrado');
      assert.strictEqual(closing.postedDate, '2026-09-25');
      assert.strictEqual(closing.amount, -66094.98);
      assert.strictEqual(closing.amountCents, -6609498);

      // 3. LEDGERBAL (27/09)
      const ledger = candidates.find(c => c.sourceKind === 'LEDGERBAL');
      assert.ok(ledger, 'Candidato LEDGERBAL encontrado');
      assert.strictEqual(ledger.postedDate, '2026-09-27');
      assert.strictEqual(ledger.amount, -62894.98);
      assert.strictEqual(ledger.amountCents, -6289498);

      // Validação do delta entre as duas fontes (-62894.98 - (-66094.98) = +3200.00)
      const diff = Math.round((ledger.amount - closing.amount) * 100) / 100;
      assert.strictEqual(diff, 3200.00);
    });

    it('Rudge Ramos (0263 / 811531): MEMO R$ 2.328,05 (25/09) e LEDGERBAL R$ 2.328,05 (27/09) [Diff R$ 0,00]', () => {
      const ofx = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
<OFX>
<BANKMSGSRSV1><STMTTRNRS><STMTRS>
<BANKACCTFROM>
<BANKID>0341
<BRANCHID>0263
<ACCTID>811531
</BANKACCTFROM>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260924100000[-03:EST]
<TRNAMT>1000.00
<FITID>20260924001
<MEMO>SALDO ANTERIOR
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260925100000[-03:EST]
<TRNAMT>2328.05
<FITID>20260925002
<MEMO>SALDO TOTAL DISPONÍVEL DIA
</STMTTRN>
</BANKTRANLIST>
<LEDGERBAL>
<BALAMT>2328.05
<DTASOF>20260927100000[-03:EST]
</LEDGERBAL>
</STMTRS></STMTTRNRS></BANKMSGSRSV1>
</OFX>`;

      const res = parseOFXContent(ofx, 'Extrato_0263_811531_27-09-2026.ofx');
      assert.strictEqual(res.accountKey, '0263_811531');
      assert.strictEqual(res.transactions.length, 0, 'Nenhuma transação operacional');

      const closingMemo = res.balanceCandidates.find(c => c.sourceKind === 'STMTTRN_MEMO' && c.balanceRole === 'CLOSING');
      const ledger = res.balanceCandidates.find(c => c.sourceKind === 'LEDGERBAL');

      assert.strictEqual(closingMemo.postedDate, '2026-09-25');
      assert.strictEqual(closingMemo.amount, 2328.05);
      assert.strictEqual(ledger.postedDate, '2026-09-27');
      assert.strictEqual(ledger.amount, 2328.05);
      assert.strictEqual(ledger.amount - closingMemo.amount, 0);
    });

    it('Mauá (2783 / 070820): MEMO -R$ 2.827,77 (25/09) vs LEDGERBAL -R$ 2.509,97 (27/09) [Diff +R$ 317,80]', () => {
      const ofx = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
<OFX>
<BANKMSGSRSV1><STMTTRNRS><STMTRS>
<BANKACCTFROM>
<BANKID>0341
<BRANCHID>2783
<ACCTID>070820
</BANKACCTFROM>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260925100000[-03:EST]
<TRNAMT>-2827.77
<FITID>20260925001
<MEMO>SALDO TOTAL DISPONÍVEL DIA
</STMTTRN>
</BANKTRANLIST>
<LEDGERBAL>
<BALAMT>-2509.97
<DTASOF>20260927100000[-03:EST]
</LEDGERBAL>
</STMTRS></STMTTRNRS></BANKMSGSRSV1>
</OFX>`;

      const res = parseOFXContent(ofx, 'Extrato_2783_070820_27-09-2026.ofx');
      assert.strictEqual(res.accountKey, '2783_070820');

      const closingMemo = res.balanceCandidates.find(c => c.sourceKind === 'STMTTRN_MEMO');
      const ledger = res.balanceCandidates.find(c => c.sourceKind === 'LEDGERBAL');

      assert.strictEqual(closingMemo.amount, -2827.77);
      assert.strictEqual(closingMemo.postedDate, '2026-09-25');
      assert.strictEqual(ledger.amount, -2509.97);
      assert.strictEqual(ledger.postedDate, '2026-09-27');

      const diff = Math.round((ledger.amount - closingMemo.amount) * 100) / 100;
      assert.strictEqual(diff, 317.80);
    });

    it('Piraporinha (7386 / 162601): MEMO R$ 6.634,36 (25/09) vs LEDGERBAL R$ 6.634,38 (27/09) [Diff +R$ 0,02]', () => {
      const ofx = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
<OFX>
<BANKMSGSRSV1><STMTTRNRS><STMTRS>
<BANKACCTFROM>
<BANKID>0341
<BRANCHID>7386
<ACCTID>162601
</BANKACCTFROM>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260925100000[-03:EST]
<TRNAMT>6634.36
<FITID>20260925001
<MEMO>SALDO TOTAL DISPONÍVEL DIA
</STMTTRN>
</BANKTRANLIST>
<LEDGERBAL>
<BALAMT>6634.38
<DTASOF>20260927100000[-03:EST]
</LEDGERBAL>
</STMTRS></STMTTRNRS></BANKMSGSRSV1>
</OFX>`;

      const res = parseOFXContent(ofx, 'Extrato_7386_162601_27-09-2026.ofx');
      assert.strictEqual(res.accountKey, '7386_162601');

      const closingMemo = res.balanceCandidates.find(c => c.sourceKind === 'STMTTRN_MEMO');
      const ledger = res.balanceCandidates.find(c => c.sourceKind === 'LEDGERBAL');

      assert.strictEqual(closingMemo.amount, 6634.36);
      assert.strictEqual(ledger.amount, 6634.38);

      const diff = Math.round((ledger.amount - closingMemo.amount) * 100) / 100;
      assert.strictEqual(diff, 0.02, 'Diferença de 2 centavos deve ser preservada com exatidão');
    });

    it('Suporta saldo zero (R$ 0,00) como valor de saldo válido e não o descarta', () => {
      const ofx = `OFXHEADER:100
DATA:OFXSGML
<OFX>
<BANKMSGSRSV1><STMTTRNRS><STMTRS>
<BANKACCTFROM><BANKID>0341<BRANCHID>1234<ACCTID>56789</BANKACCTFROM>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>OTHER
<DTPOSTED>20260925100000[-03:EST]
<TRNAMT>0.00
<FITID>20260925000
<MEMO>SALDO FINAL
</STMTTRN>
</BANKTRANLIST>
<LEDGERBAL>
<BALAMT>0.00
<DTASOF>20260925100000[-03:EST]
</LEDGERBAL>
</STMTRS></STMTTRNRS></BANKMSGSRSV1>
</OFX>`;

      const res = parseOFXContent(ofx, 'Extrato_Zero.ofx');
      const ledger = res.balanceCandidates.find(c => c.sourceKind === 'LEDGERBAL');
      assert.ok(ledger, 'LEDGERBAL de zero deve ser mantido');
      assert.strictEqual(ledger.amount, 0);
      assert.strictEqual(ledger.amountCents, 0);
    });

    it('Extrai AVAILBAL e PRVBAL nativos quando presentes no cabeçalho/rodapé do OFX', () => {
      const ofx = `OFXHEADER:100
DATA:OFXSGML
<OFX>
<BANKMSGSRSV1><STMTTRNRS><STMTRS>
<BANKACCTFROM><BANKID>0341<BRANCHID>1111<ACCTID>22222</BANKACCTFROM>
<PRVBAL>
<BALAMT>1500.50
<DTASOF>20260924000000[-03:EST]
</PRVBAL>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260925120000[-03:EST]
<TRNAMT>500.00
<FITID>20260925001
<MEMO>DEPOSITO EM CONTA
</STMTTRN>
</BANKTRANLIST>
<LEDGERBAL>
<BALAMT>2000.50
<DTASOF>20260925235959[-03:EST]
</LEDGERBAL>
<AVAILBAL>
<BALAMT>7000.50
<DTASOF>20260925235959[-03:EST]
</AVAILBAL>
</STMTRS></STMTTRNRS></BANKMSGSRSV1>
</OFX>`;

      const res = parseOFXContent(ofx, 'Extrato_AvailPrv.ofx');
      const prv = res.balanceCandidates.find(c => c.sourceKind === 'PRVBAL');
      const avail = res.balanceCandidates.find(c => c.sourceKind === 'AVAILBAL');

      assert.ok(prv, 'PRVBAL deve ser extraído');
      assert.strictEqual(prv.amount, 1500.50);
      assert.strictEqual(prv.postedDate, '2026-09-24');

      assert.ok(avail, 'AVAILBAL deve ser extraído');
      assert.strictEqual(avail.amount, 7000.50);
      assert.strictEqual(avail.postedDate, '2026-09-25');
    });

  });

});
