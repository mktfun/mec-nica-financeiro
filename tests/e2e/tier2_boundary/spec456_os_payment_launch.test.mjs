import test from 'node:test';
import assert from 'node:assert/strict';

import { parsePaymentBreakdown } from '../../../src/lib/osPaymentUtils.ts';

// Implementação canônica espelhada de osPaymentPersistence.ts para validação pura em Node.js
function consolidateOsPaymentEntries(entries) {
  let credit_value = 0;
  let debit_value = 0;
  let pix_transfer_value = 0;
  let cash_value = 0;
  let other_value = 0;

  for (const entry of entries) {
    const val = Number(entry.value) || 0;
    if (val <= 0) continue;

    switch (entry.category) {
      case 'credito':
        credit_value += val;
        break;
      case 'debito':
        debit_value += val;
        break;
      case 'pix':
      case 'transferencia':
        pix_transfer_value += val;
        break;
      case 'dinheiro':
        cash_value += val;
        break;
      default:
        other_value += val;
        break;
    }
  }

  credit_value = Number(credit_value.toFixed(2));
  debit_value = Number(debit_value.toFixed(2));
  pix_transfer_value = Number(pix_transfer_value.toFixed(2));
  cash_value = Number(cash_value.toFixed(2));
  other_value = Number(other_value.toFixed(2));

  const paid_value = Number((credit_value + debit_value + pix_transfer_value + cash_value + other_value).toFixed(2));

  let payment_method = 'EM_ABERTO';
  if (paid_value > 0) {
    const parts = [];
    if (credit_value > 0) parts.push(`Credito: ${credit_value.toFixed(2)}`);
    if (debit_value > 0) parts.push(`Debito: ${debit_value.toFixed(2)}`);
    if (pix_transfer_value > 0) parts.push(`PIX: ${pix_transfer_value.toFixed(2)}`);
    if (cash_value > 0) parts.push(`Dinheiro: ${cash_value.toFixed(2)}`);
    if (other_value > 0) parts.push(`Outros: ${other_value.toFixed(2)}`);

    payment_method = parts.length > 0 ? parts.join('; ') : 'Outros';
  }

  return {
    credit_value,
    debit_value,
    pix_transfer_value,
    cash_value,
    other_value,
    paid_value,
    payment_method
  };
}

function extractEntriesFromOs(os) {
  if (!os) return [];

  const cred = Number(os.credit_value || 0);
  const deb = Number(os.debit_value || 0);
  const pix = Number(os.pix_transfer_value || 0);
  const cash = Number(os.cash_value || 0);

  if (cred > 0 || deb > 0 || pix > 0 || cash > 0) {
    const entries = [];
    if (cred > 0) {
      entries.push({ id: 'cred-1', category: 'credito', label: 'Cartão Crédito', value: cred });
    }
    if (deb > 0) {
      entries.push({ id: 'deb-1', category: 'debito', label: 'Cartão Débito', value: deb });
    }
    if (pix > 0) {
      entries.push({ id: 'pix-1', category: 'pix', label: 'PIX', value: pix });
    }
    if (cash > 0) {
      entries.push({ id: 'cash-1', category: 'dinheiro', label: 'Dinheiro', value: cash });
    }
    return entries;
  }

  const breakdown = parsePaymentBreakdown(os);
  if (breakdown.length > 0) {
    return breakdown.map((item, idx) => {
      let cat = 'outro';
      if (item.category === 'credito') cat = 'credito';
      else if (item.category === 'debito') cat = 'debito';
      else if (item.category === 'pix') cat = 'pix';
      else if (item.category === 'dinheiro') cat = 'dinheiro';
      else if (item.category === 'boleto') cat = 'boleto';

      return {
        id: `breakdown-${idx}`,
        category: cat,
        label: item.method,
        value: item.value
      };
    });
  }

  return [];
}

test('Spec 456 — Lançamento Manual e Edição Ágil de Pagamentos de OS', async (t) => {

  await t.test('1. Consolidação de Entradas: Split Payment Misto (Crédito + PIX)', () => {
    const entries = [
      { id: '1', category: 'credito', label: 'Cartão Crédito', value: 1000.00 },
      { id: '2', category: 'pix', label: 'PIX', value: 497.34 }
    ];

    const result = consolidateOsPaymentEntries(entries);

    assert.equal(result.credit_value, 1000.00);
    assert.equal(result.debit_value, 0);
    assert.equal(result.pix_transfer_value, 497.34);
    assert.equal(result.cash_value, 0);
    assert.equal(result.paid_value, 1497.34);
    assert.equal(result.payment_method, 'Credito: 1000.00; PIX: 497.34');
  });

  await t.test('2. Consolidação de Entradas: Débito e Dinheiro com precisão decimal', () => {
    const entries = [
      { id: '1', category: 'debito', label: 'Cartão Débito', value: 350.50 },
      { id: '2', category: 'dinheiro', label: 'Dinheiro Balcão', value: 149.50 }
    ];

    const result = consolidateOsPaymentEntries(entries);

    assert.equal(result.debit_value, 350.50);
    assert.equal(result.cash_value, 149.50);
    assert.equal(result.paid_value, 500.00);
    assert.equal(result.payment_method, 'Debito: 350.50; Dinheiro: 149.50');
  });

  await t.test('3. Consolidação de Entradas vazias ou zeradas', () => {
    const entries = [];
    const result = consolidateOsPaymentEntries(entries);

    assert.equal(result.paid_value, 0);
    assert.equal(result.payment_method, 'EM_ABERTO');
  });

  await t.test('4. Extração de Entradas de OS com colunas numéricas persistidas', () => {
    const mockOs = {
      id: 'os-123',
      os_number: '8779',
      total_value: 1500,
      paid_value: 1500,
      credit_value: 1000,
      debit_value: 0,
      pix_transfer_value: 500,
      cash_value: 0
    };

    const entries = extractEntriesFromOs(mockOs);

    assert.equal(entries.length, 2);
    assert.equal(entries[0].category, 'credito');
    assert.equal(entries[0].value, 1000);
    assert.equal(entries[1].category, 'pix');
    assert.equal(entries[1].value, 500);
  });

  await t.test('5. Extração de Entradas de OS legada com string bruta contendo somatório solto', () => {
    const mockOs = {
      id: 'os-legacy-1',
      os_number: '1906',
      total_value: 1497.34,
      paid_value: 1497.34,
      credit_value: 0,
      debit_value: 0,
      pix_transfer_value: 0,
      cash_value: 0,
      payment_method: 'Credito: 1000.00; PIX: 497.34; 1497.34'
    };

    const entries = extractEntriesFromOs(mockOs);

    assert.equal(entries.length, 2);
    assert.equal(entries[0].category, 'credito');
    assert.equal(entries[0].value, 1000);
    assert.equal(entries[1].category, 'pix');
    assert.equal(entries[1].value, 497.34);

    const sum = entries.reduce((acc, e) => acc + e.value, 0);
    assert.equal(Number(sum.toFixed(2)), 1497.34);
  });

  await t.test('6. Verificação de status projetado para quitação total e parcial', () => {
    const checkStatus = (total, paid) => {
      if (paid >= total - 0.05 && total > 0) return 'finalizado';
      if (paid > 0) return 'pago_parcial';
      return 'em_aberto';
    };

    assert.equal(checkStatus(1000, 1000), 'finalizado');
    assert.equal(checkStatus(1000, 999.98), 'finalizado');
    assert.equal(checkStatus(1000, 500), 'pago_parcial');
    assert.equal(checkStatus(1000, 0), 'em_aberto');
  });

});
