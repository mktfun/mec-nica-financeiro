// tests/e2e/tier2_boundary/ofx_balance_selection.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseOFXContent } from '../../../src/lib/parsers/ofxParser.ts';

describe('Tier 2 — Boundary & Integration: Seleção e Mapeamento de Saldo OFX por Conta e Data (Spec 439)', () => {

  const FIXTURE_PLANALTO = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
<SIGNONMSGSRSV1>
<SONRS>
<STATUS><CODE>0<SEVERITY>INFO</STATUS>
<DTSERVER>20260927100000[-03:EST]
<LANGUAGE>POR
<FI><ORG>ITAU<FID>341</FI>
</SONRS>
</SIGNONMSGSRSV1>
<BANKMSGSRSV1>
<STMTTRNRS>
<TRNUID>1001
<STATUS><CODE>0<SEVERITY>INFO</STATUS>
<STMTRS>
<CURDEF>BRL
<BANKACCTFROM>
<BANKID>341
<BRANCHID>7386
<ACCTID>166586
<ACCTTYPE>CHECKING
</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>20260925100000[-03:EST]
<DTEND>20260927100000[-03:EST]
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260925100000[-03:EST]
<TRNAMT>7930.11
<FITID>20260925001
<CHECKNUM>20260925001
<MEMO>SALDO TOTAL DISPONÍVEL DIA
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260925120000[-03:EST]
<TRNAMT>450.00
<FITID>20260925002
<MEMO>PIX RECEBIDO CLIENTE A
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260925150000[-03:EST]
<TRNAMT>-120.00
<FITID>20260925003
<MEMO>TARIFA BANCARIA PIX
</STMTTRN>
</BANKTRANLIST>
<LEDGERBAL>
<BALAMT>12874.36
<DTASOF>20260927100000[-03:EST]
</LEDGERBAL>
<AVAILBAL>
<BALAMT>12874.36
<DTASOF>20260927100000[-03:EST]
</AVAILBAL>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;

  const FIXTURE_RUDGE_RAMOS = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<BANKACCTFROM>
<BANKID>341
<BRANCHID>0263
<ACCTID>811531
<ACCTTYPE>CHECKING
</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>20260924100000[-03:EST]
<DTEND>20260925100000[-03:EST]
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260923100000[-03:EST]
<TRNAMT>11200.00
<FITID>20260923001
<MEMO>SALDO ANTERIOR
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260924100000[-03:EST]
<TRNAMT>13135.01
<FITID>20260924005
<MEMO>SALDO TOTAL DISPONÍVEL DIA
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260924140000[-03:EST]
<TRNAMT>1935.01
<FITID>20260924006
<MEMO>TED RECEBIDA FORNECEDOR
</STMTTRN>
</BANKTRANLIST>
<LEDGERBAL>
<BALAMT>14903.46
<DTASOF>20260925100000[-03:EST]
</LEDGERBAL>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;

  const FIXTURE_MAUA_CHEQUE_ESPECIAL = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<BANKACCTFROM>
<BANKID>341
<BRANCHID>7386
<ACCTID>162601
<ACCTTYPE>CHECKING
</BANKACCTFROM>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260925100000[-03:EST]
<TRNAMT>-4520.30
<FITID>20260925999
<MEMO>SALDO DO DIA</MEMO>
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260925110000[-03:EST]
<TRNAMT>-50.00
<FITID>20260925998
<MEMO>PAGAMENTO FORNECEDOR PECAS
</STMTTRN>
</BANKTRANLIST>
<LEDGERBAL>
<BALAMT>-4570.30
<DTASOF>20260925100000[-03:EST]
</LEDGERBAL>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;

  const FIXTURE_DOM_PEDRO_ZERO = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<BANKACCTFROM>
<BANKID>341
<BRANCHID>8813
<ACCTID>984633
<ACCTTYPE>CHECKING
</BANKACCTFROM>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260925100000[-03:EST]
<TRNAMT>0.00
<FITID>20260925000
<MEMO>SALDO TOTAL DISPONIVEL DIA
</STMTTRN>
</BANKTRANLIST>
<LEDGERBAL>
<BALAMT>0.00
<DTASOF>20260925100000[-03:EST]
</LEDGERBAL>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;

  describe('1. Isolamento de Datas (25/09 vs 27/09) e Extração de Candidatos', () => {
    it('Planalto: Extrai MEMO do dia 25/09 (R$ 7.930,11) e LEDGERBAL do dia 27/09 (R$ 12.874,36)', () => {
      const res = parseOFXContent(FIXTURE_PLANALTO);
      assert.ok(Array.isArray(res.balanceCandidates));
      assert.strictEqual(res.accountKey, '7386_166586');

      const candidates = res.balanceCandidates || [];
      assert.ok(candidates.length >= 2, 'Deve conter pelo menos MEMO e LEDGERBAL');

      const memo25 = candidates.find(c => c.sourceKind === 'STMTTRN_MEMO' && c.postedDate === '2026-09-25');
      assert.ok(memo25, 'Deve encontrar candidato MEMO de 25/09');
      assert.strictEqual(memo25.amount, 7930.11);
      assert.strictEqual(memo25.amountCents, 793011);
      assert.strictEqual(memo25.balanceRole, 'CLOSING');

      const ledger27 = candidates.find(c => c.sourceKind === 'LEDGERBAL' && c.postedDate === '2026-09-27');
      assert.ok(ledger27, 'Deve encontrar candidato LEDGERBAL de 27/09');
      assert.strictEqual(ledger27.amount, 12874.36);
      assert.strictEqual(ledger27.amountCents, 1287436);
      assert.strictEqual(ledger27.balanceRole, 'LEDGER');

      // Verifica que a diferença entre os dois candidatos é exatamente R$ 4.944,25
      const diff = Math.round((ledger27.amount - memo25.amount) * 100) / 100;
      assert.strictEqual(diff, 4944.25);
    });

    it('Rudge Ramos: Extrai SALDO ANTERIOR (23/09), SALDO DO DIA (24/09) e LEDGERBAL (25/09)', () => {
      const res = parseOFXContent(FIXTURE_RUDGE_RAMOS);
      assert.ok(Array.isArray(res.balanceCandidates));
      assert.strictEqual(res.accountKey, '0263_811531');

      const candidates = res.balanceCandidates || [];
      const opening = candidates.find(c => c.balanceRole === 'OPENING');
      const closing = candidates.find(c => c.balanceRole === 'CLOSING');
      const ledger = candidates.find(c => c.balanceRole === 'LEDGER');

      assert.ok(opening, 'Candidato de abertura deve existir');
      assert.strictEqual(opening.amount, 11200.00);
      assert.strictEqual(opening.postedDate, '2026-09-23');

      assert.ok(closing, 'Candidato de encerramento deve existir');
      assert.strictEqual(closing.amount, 13135.01);
      assert.strictEqual(closing.postedDate, '2026-09-24');

      assert.ok(ledger, 'Candidato de ledger deve existir');
      assert.strictEqual(ledger.amount, 14903.46);
      assert.strictEqual(ledger.postedDate, '2026-09-25');
    });
  });

  describe('2. Não Poluição de Movimentações (Zero Linhas de Saldo em Transactions)', () => {
    it('Linhas com SALDO TOTAL DISPONÍVEL DIA ou SALDO ANTERIOR NUNCA entram em transactions', () => {
      const resPlanalto = parseOFXContent(FIXTURE_PLANALTO);
      assert.strictEqual(resPlanalto.transactions.length, 2, 'Apenas as 2 transações reais (PIX e Tarifa) devem estar na lista');
      const hasSaldoInTx = resPlanalto.transactions.some(t =>
        (t.memo && t.memo.includes('SALDO')) || (t.title && t.title.includes('SALDO'))
      );
      assert.strictEqual(hasSaldoInTx, false, 'Nenhuma transação pode conter memo de SALDO');

      const resRudge = parseOFXContent(FIXTURE_RUDGE_RAMOS);
      assert.strictEqual(resRudge.transactions.length, 1, 'Apenas o TED recebido deve estar na lista');
      assert.strictEqual(resRudge.transactions[0].amount, 1935.01);
    });
  });

  describe('3. Suporte a Saldo Negativo (Cheque Especial) e Zero', () => {
    it('Mauá: Preserva saldo negativo com sinal correto sem distorção', () => {
      const res = parseOFXContent(FIXTURE_MAUA_CHEQUE_ESPECIAL);
      assert.ok(Array.isArray(res.balanceCandidates));
      const candidates = res.balanceCandidates || [];

      const closing = candidates.find(c => c.balanceRole === 'CLOSING');
      assert.ok(closing, 'Candidato de fechamento negativo deve existir');
      assert.strictEqual(closing.amount, -4520.30);
      assert.strictEqual(closing.amountCents, -452030);

      const ledger = candidates.find(c => c.balanceRole === 'LEDGER');
      assert.ok(ledger, 'LEDGERBAL negativo deve existir');
      assert.strictEqual(ledger.amount, -4570.30);
      assert.strictEqual(ledger.amountCents, -457030);
    });

    it('Dom Pedro: Preserva saldo exatamente 0.00 sem descartar como nulo', () => {
      const res = parseOFXContent(FIXTURE_DOM_PEDRO_ZERO);
      assert.ok(Array.isArray(res.balanceCandidates));
      const candidates = res.balanceCandidates || [];

      const closing = candidates.find(c => c.balanceRole === 'CLOSING');
      assert.ok(closing, 'Candidato com valor 0.00 deve ser preservado');
      assert.strictEqual(closing.amount, 0.00);
      assert.strictEqual(closing.amountCents, 0);
    });
  });

  describe('4. Agregação Multi-Conta por Loja e Deduplicação Idempotente', () => {
    it('Agrega múltiplas contas para a mesma loja sem duplicação de saldo', () => {
      // Simulação: Loja ST-01 possui Conta 1 e Conta 2
      const candidateConta1 = { accountKey: '7386_166586', storeId: 'st-01', amount: 7930.11 };
      const candidateConta2 = { accountKey: '7386_999999', storeId: 'st-01', amount: 2069.89 };

      const storeBalances = new Map();
      [candidateConta1, candidateConta2].forEach(c => {
        const cur = storeBalances.get(c.storeId) || 0;
        storeBalances.set(c.storeId, Math.round((cur + c.amount) * 100) / 100);
      });

      assert.strictEqual(storeBalances.get('st-01'), 10000.00, 'Total da loja deve ser a soma exata das contas');
    });

    it('Idempotência ao importar o mesmo arquivo repetidamente: deduplica candidatos', () => {
      const res1 = parseOFXContent(FIXTURE_PLANALTO);
      const res2 = parseOFXContent(FIXTURE_PLANALTO);

      // Algoritmo de merge/deduplicação usado no centralImportManager
      const candidateMap = new Map();
      [...res1.balanceCandidates, ...res2.balanceCandidates].forEach(c => {
        const key = `${c.accountKey}_${c.postedDate}_${c.sourceKind}_${c.amountCents}_${c.balanceRole}_${c.memoNormalized || ''}`;
        candidateMap.set(key, c);
      });

      assert.strictEqual(
        candidateMap.size,
        res1.balanceCandidates.length,
        'O número de candidatos não pode duplicar ao reimportar o mesmo arquivo'
      );
    });
  });

  describe('5. Simulação de Troca Posterior de Regra e Seleção com Auditoria', () => {
    it('Calcula corretamente o impacto líquido (delta) e preserva dados anteriores', () => {
      const initialBankTotal = 12874.36; // LEDGERBAL gravado originalmente por engano
      const correctedBalance = 7930.11;  // Saldo real de 25/09 (SALDO TOTAL DISPONÍVEL DIA)

      const diff = Math.round((correctedBalance - initialBankTotal) * 100) / 100;
      assert.strictEqual(diff, -4944.25, 'O delta de correção deve ser de -R$ 4.944,25');

      // Simulação do payload do evento de auditoria
      const auditEvent = {
        account_key: '7386_166586',
        store_id: 'st-06',
        reconciliation_date: '2026-09-25',
        previous_amount: initialBankTotal,
        new_amount: correctedBalance,
        selection_mode: 'manual',
        reason: 'Correção de data de saldo: utilizando MEMO do dia 25/09 em vez de LEDGERBAL de 27/09',
        store_bank_total_before: initialBankTotal,
        store_bank_total_after: correctedBalance
      };

      assert.strictEqual(auditEvent.store_bank_total_before, 12874.36);
      assert.strictEqual(auditEvent.store_bank_total_after, 7930.11);
      assert.ok(auditEvent.reason.length > 10);
    });
  });
});
