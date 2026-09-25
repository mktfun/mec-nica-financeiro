// tests/e2e/tier2_boundary/ofx_closing_balance_saldo_do_dia.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseOFXFile, normalizeMemoText, isClosingDayBalanceMemo, isPreviousBalanceMemo } from '../../../src/lib/parsers/ofxParser.ts';

describe('Tier 2 — Boundary & Parser: Saldo do Dia (SALDO TOTAL DISPONÍVEL DIA) e Descarte de LEDGERBAL de D+0 (Spec 444)', () => {

  describe('Predicados e Normalização de Memos Bancários', () => {
    it('Normaliza memos com acentos e caracteres de controle em maiúsculas sem acento', () => {
      assert.strictEqual(normalizeMemoText('SALDO TOTAL DISPONÍVEL DIA'), 'SALDO TOTAL DISPONIVEL DIA');
      assert.strictEqual(normalizeMemoText('  SALDO   DO   DIA  '), 'SALDO DO DIA');
      assert.strictEqual(normalizeMemoText('SDO FDO DIA'), 'SDO FDO DIA');
      assert.strictEqual(normalizeMemoText('SALDO ANTERIOR'), 'SALDO ANTERIOR');
    });

    it('Identifica variações brasileiras de Saldo do Dia', () => {
      assert.strictEqual(isClosingDayBalanceMemo('SALDO TOTAL DISPONIVEL DIA'), true);
      assert.strictEqual(isClosingDayBalanceMemo('DISPONIVEL DIA'), true);
      assert.strictEqual(isClosingDayBalanceMemo('SALDO DO DIA'), true);
      assert.strictEqual(isClosingDayBalanceMemo('SDO FIM DIA'), true);
      assert.strictEqual(isClosingDayBalanceMemo('SALDO FINAL'), true);
      assert.strictEqual(isClosingDayBalanceMemo('PIX TRANSF JOAO'), false);
      assert.strictEqual(isClosingDayBalanceMemo('SALDO ANTERIOR'), false);
    });

    it('Identifica variações de Saldo Anterior', () => {
      assert.strictEqual(isPreviousBalanceMemo('SALDO ANTERIOR'), true);
      assert.strictEqual(isPreviousBalanceMemo('SDO ANTERIOR'), true);
      assert.strictEqual(isPreviousBalanceMemo('SALDO INICIAL'), true);
      assert.strictEqual(isPreviousBalanceMemo('DISPONIVEL ANTERIOR'), true);
      assert.strictEqual(isPreviousBalanceMemo('SALDO TOTAL DISPONIVEL DIA'), false);
    });
  });

  describe('Fixtures Reais Itaú Empresas (Spec 444)', () => {
    it('Fixture 1: Extrai Saldo do Dia R$ 13.135,01 e descarta LEDGERBAL R$ 14.903,46 de D+0', async () => {
      const ofxContent = `OFXHEADER:100
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
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<DTSERVER>20260925100000[-03:EST]
<LANGUAGE>POR
<FI>
<ORG>ITAU
<FID>341
</FI>
</SONRS>
</SIGNONMSGSRSV1>
<BANKMSGSRSV1>
<STMTTRNRS>
<TRNUID>1
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<STMTRS>
<CURDEF>BRL
<BANKACCTFROM>
<BANKID>0341
<BRANCHID>0263
<ACCTID>811531
<ACCTTYPE>CHECKING
</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>20260924000000[-03:EST]
<DTEND>20260924235959[-03:EST]
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260924100000[-03:EST]
<TRNAMT>500.00
<FITID>20260924001
<CHECKNUM>20260924001
<MEMO>PIX RECEBIDO CLIENTE A
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260924100000[-03:EST]
<TRNAMT>-200.00
<FITID>20260924002
<CHECKNUM>20260924002
<MEMO>PAG BOLETO FORNECEDOR
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260924100000[-03:EST]
<TRNAMT>13135.01
<FITID>20260924005
<CHECKNUM>20260924005
<MEMO>SALDO TOTAL DISPONÍVEL DIA
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

      const file = new File([ofxContent], 'Extrato_0263_811531_2409.ofx', { type: 'text/plain' });
      const result = await parseOFXFile(file, { targetDate: '2026-09-24' });

      assert.strictEqual(result.bankBalance, 13135.01, 'bankBalance deve ser o saldo do dia R$ 13.135,01');
      assert.strictEqual(result.balanceSource, 'saldo_total_disponivel_dia');
      assert.strictEqual(result.closingDayBalance, 13135.01);
      assert.strictEqual(result.closingDayDate, '2026-09-24');
      assert.strictEqual(result.ledgerBalance, 14903.46, 'ledgerBalance deve registrar os R$ 14.903,46 brutos');
      assert.strictEqual(result.ledgerBalanceDate, '2026-09-25', 'ledgerBalanceDate deve ser 2026-09-25');
      
      // A linha de saldo NÃO deve constar nas transações operacionais
      assert.strictEqual(result.transactions.length, 2, 'Apenas as 2 movimentações reais devem ser importadas');
      assert.strictEqual(result.transactions.some(t => t.title.includes('SALDO TOTAL')), false, 'SALDO TOTAL não deve ser transação');
    });

    it('Fixture 2: Extrai Saldo do Dia R$ 7.930,11 e descarta LEDGERBAL R$ 12.874,36 de D+0', async () => {
      const ofxContent = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252

<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<BANKACCTFROM>
<BANKID>0341
<BRANCHID>0263
<ACCTID>992211
</BANKACCTFROM>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260924100000[-03:EST]
<TRNAMT>1500.00
<FITID>20260924001
<MEMO>PIX CLIENTE B
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260924100000[-03:EST]
<TRNAMT>7930.11
<FITID>20260924004
<CHECKNUM>20260924004
<MEMO>SALDO TOTAL DISPONÍVEL DIA
</STMTTRN>
</BANKTRANLIST>
<LEDGERBAL>
<BALAMT>12874.36
<DTASOF>20260925100000[-03:EST]
</LEDGERBAL>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;

      const file = new File([ofxContent], 'Extrato_0263_992211_2409.ofx', { type: 'text/plain' });
      const result = await parseOFXFile(file, { targetDate: '2026-09-24' });

      assert.strictEqual(result.bankBalance, 7930.11, 'bankBalance deve ser o saldo do dia R$ 7.930,11');
      assert.strictEqual(result.balanceSource, 'saldo_total_disponivel_dia');
      assert.strictEqual(result.closingDayBalance, 7930.11);
      assert.strictEqual(result.ledgerBalance, 12874.36);
      assert.strictEqual(result.transactions.length, 1);
    });

    it('Fixture 3: Resiliência a UTF-8 com Acentos (DISPONÍVEL com Í)', async () => {
      // Simula buffer UTF-8 gravado diretamente com caractere Í multibyte (0xC3 0x8D)
      const utf8Text = `<OFX>
<BANKMSGSRSV1><STMTTRNRS><STMTRS>
<BANKACCTFROM><BANKID>0341<ACCTID>11223344</BANKACCTFROM>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260924100000[-03:EST]
<TRNAMT>4500.00
<FITID>20260924001
<MEMO>SALDO TOTAL DISPONÍVEL DIA
</STMTTRN>
</BANKTRANLIST>
<LEDGERBAL><BALAMT>8900.00<DTASOF>20260925100000[-03:EST]</LEDGERBAL>
</STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;

      const file = new File([Buffer.from(utf8Text, 'utf-8')], 'Extrato_Utf8.ofx');
      const result = await parseOFXFile(file, { targetDate: '2026-09-24' });

      assert.strictEqual(result.bankBalance, 4500.00, 'Deve identificar mesmo em UTF-8 com acento');
      assert.strictEqual(result.balanceSource, 'saldo_total_disponivel_dia');
    });

    it('Fixture 4: Fallback para Saldo Anterior quando Saldo do Dia não existir', async () => {
      const ofxContent = `<OFX>
<BANKMSGSRSV1><STMTTRNRS><STMTRS>
<BANKACCTFROM><BANKID>0341<ACCTID>55443322</BANKACCTFROM>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260923100000[-03:EST]
<TRNAMT>17026.91
<FITID>20260923001
<MEMO>SALDO ANTERIOR
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260924100000[-03:EST]
<TRNAMT>5000.00
<FITID>20260924001
<MEMO>PIX CLIENTE C
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260924100000[-03:EST]
<TRNAMT>-3500.00
<FITID>20260924002
<MEMO>PAGAMENTO FORNECEDOR
</STMTTRN>
</BANKTRANLIST>
<LEDGERBAL><BALAMT>30320.00<DTASOF>20260925100000[-03:EST]</LEDGERBAL>
</STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;

      const file = new File([ofxContent], 'Extrato_SemSaldoDoDia.ofx');
      const result = await parseOFXFile(file, { targetDate: '2026-09-24' });

      // 17026.91 + 5000 - 3500 = 18526.91
      assert.strictEqual(result.bankBalance, 18526.91, 'Deve derivar o saldo a partir do Saldo Anterior + Movimentações');
      assert.strictEqual(result.balanceSource, 'saldo_anterior_plus_tx');
      assert.strictEqual(result.previousBalance, 17026.91);
      assert.strictEqual(result.previousBalanceDate, '2026-09-23');
      assert.strictEqual(result.ledgerBalance, 30320.00, 'LEDGERBAL de D+0 é descartado como bankBalance');
    });
  });
});
