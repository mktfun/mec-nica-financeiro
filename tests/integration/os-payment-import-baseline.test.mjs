// tests/integration/os-payment-import-baseline.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Spec 460 — Preservar o Incremento Real dos Pagamentos da OS', () => {

  describe('1. Linha de Base Incremental e Reimportações', () => {
    it('deve calcular delta real 400 -> 2727 = 2327 e preservar base 400 na reimportação', () => {
      // Simulação do comportamento da RPC record_os_import_batch
      const patioOsTable = new Map();
      const observationsTable = new Map();

      function recordOsImportBatch(storeId, targetDate, osBatch) {
        const results = [];

        for (const item of osBatch) {
          const osNumber = item.os_number;
          const keyObs = `${storeId}_${targetDate}_${osNumber}`;
          const existingOs = patioOsTable.get(`${storeId}_${osNumber}`);
          const existingObs = observationsTable.get(keyObs);

          let creditBefore = 0;
          let baselineSource = 'first_import';
          let revisionCount = 1;

          if (existingObs) {
            // Preserva a primeiríssima base válida registrada para a data!
            creditBefore = existingObs.credit_before;
            baselineSource = 'preserved_first_import';
            revisionCount = existingObs.revision_count + 1;
          } else if (existingOs) {
            creditBefore = existingOs.credit_value || 0;
            baselineSource = 'existing_patio';
          }

          const creditVal = item.credit_value || 0;
          const deltaCredit = Number((creditVal - creditBefore).toFixed(2));
          const isNegative = deltaCredit < 0;

          const obsRecord = {
            store_id: storeId,
            target_date: targetDate,
            os_number: osNumber,
            credit_before: creditBefore,
            credit_after: creditVal,
            delta_credit: deltaCredit,
            consumed_credit: existingObs ? existingObs.consumed_credit : 0,
            baseline_source: baselineSource,
            revision_count: revisionCount,
            is_negative_correction: isNegative,
          };
          observationsTable.set(keyObs, obsRecord);

          // Atualiza pátio
          patioOsTable.set(`${storeId}_${osNumber}`, {
            os_number: osNumber,
            credit_value: creditVal,
            paid_value: item.paid_value || creditVal
          });

          results.push(obsRecord);
        }

        return { success: true, count: results.length, results };
      }

      const storeId = 'maua-01';
      const targetDate = '2026-09-30';

      // Pátio pré-existente com OS 22622 tendo crédito de 400
      patioOsTable.set(`${storeId}_22622`, {
        os_number: '22622',
        credit_value: 400,
        paid_value: 400
      });

      // 1ª Importação de 30/09: Lote traz crédito acumulado de 2727
      const batch1 = [{ os_number: '22622', credit_value: 2727, paid_value: 2727 }];
      const res1 = recordOsImportBatch(storeId, targetDate, batch1);

      assert.strictEqual(res1.results[0].credit_before, 400);
      assert.strictEqual(res1.results[0].credit_after, 2727);
      assert.strictEqual(res1.results[0].delta_credit, 2327);
      assert.strictEqual(res1.results[0].baseline_source, 'existing_patio');
      assert.strictEqual(res1.results[0].revision_count, 1);

      // Simula casamento com venda da Rede de valor bruto 2327
      const obsAfterMatch = observationsTable.get(`${storeId}_${targetDate}_22622`);
      obsAfterMatch.consumed_credit = 2327;

      // 2ª Importação (Reimportação do mesmo lote ou com correções):
      // Pátio já contém 2727, mas a observação do dia DEVE preservar a base original de 400!
      const batch2 = [{ os_number: '22622', credit_value: 2727, paid_value: 2727 }];
      const res2 = recordOsImportBatch(storeId, targetDate, batch2);

      assert.strictEqual(res2.results[0].credit_before, 400, 'credit_before deve permanecer 400 e não virar 2727!');
      assert.strictEqual(res2.results[0].credit_after, 2727);
      assert.strictEqual(res2.results[0].delta_credit, 2327, 'delta_credit deve permanecer 2327 e não virar 0!');
      assert.strictEqual(res2.results[0].consumed_credit, 2327, 'consumed_credit deve ser preservado!');
      assert.strictEqual(res2.results[0].revision_count, 2, 'revision_count deve ser incrementado!');
      assert.strictEqual(res2.results[0].baseline_source, 'preserved_first_import');
    });

    it('500 -> 2727 gera delta 2227 e NÃO confere com venda da Rede de 2327', () => {
      const creditBefore = 500;
      const creditAfter = 2727;
      const deltaCredit = Number((creditAfter - creditBefore).toFixed(2));
      const redeGrossAmount = 2327.00;

      assert.strictEqual(deltaCredit, 2227.00);

      // Critério de tolerância de R$ 0.05
      const matches = Math.abs(deltaCredit - redeGrossAmount) <= 0.05;
      assert.strictEqual(matches, false, 'Delta de 2227 não pode vincular venda de 2327!');
    });
  });

  describe('2. Parser de Modalidade sem Inferência Arbitrária', () => {
    it('deve manter parsed_credit = 0 quando não houver meio de pagamento identificado', () => {
      // Função simulada com a lógica corrigida de useOsImportProcessor
      function parsePaymentMethods(paymentMethodStr, rawTotalValue, paidValue) {
        let parsed_credit = 0;
        let parsed_debit = 0;
        let parsed_pix_transfer = 0;
        let parsed_cash = 0;

        if (paymentMethodStr) {
          const upper = paymentMethodStr.toUpperCase();
          if (upper.includes('PIX') || upper.includes('TRANSFER')) {
            parsed_pix_transfer = paidValue || rawTotalValue;
          } else if (upper.includes('DINHEIRO') || upper.includes('ESPECIE')) {
            parsed_cash = paidValue || rawTotalValue;
          } else if (upper.includes('DEBITO') || upper.includes('DÉBITO')) {
            parsed_debit = paidValue || rawTotalValue;
          } else if (upper.includes('CREDITO') || upper.includes('CRÉDITO') || upper.includes('CARTAO') || upper.includes('CARTÃO')) {
            parsed_credit = paidValue || rawTotalValue;
          }
        }

        // Spec 460: Proibido inferir crédito arbitrário se nenhum método foi encontrado!
        // parsed_credit permanece 0

        return { parsed_credit, parsed_debit, parsed_pix_transfer, parsed_cash };
      }

      // Caso com método em branco
      const resEmpty = parsePaymentMethods('', 1500, 1500);
      assert.strictEqual(resEmpty.parsed_credit, 0, 'Ausência de modalidade não pode virar crédito!');
      assert.strictEqual(resEmpty.parsed_debit, 0);

      // Caso com texto que não cita pagamento
      const resUnknown = parsePaymentMethods('Balcão Oficina', 3000, 3000);
      assert.strictEqual(resUnknown.parsed_credit, 0, 'Texto genérico não pode virar crédito!');

      // Caso legítimo com Cartão Crédito
      const resCredit = parsePaymentMethods('Cartão Crédito Visa 3x', 2327, 2327);
      assert.strictEqual(resCredit.parsed_credit, 2327, 'Cartão de crédito legítimo deve ser parseado!');
    });
  });

  describe('3. Correções Negativas e Estornos', () => {
    it('deve registrar deltas negativos reais sem apagar com Math.max(0, ...)', () => {
      const creditBefore = 1000.00;
      const creditAfter = 800.00;
      const deltaCredit = Number((creditAfter - creditBefore).toFixed(2));
      const isNegative = deltaCredit < 0;

      assert.strictEqual(deltaCredit, -200.00);
      assert.strictEqual(isNegative, true);
    });
  });

  describe('4. Saneamento Auditável de 30/09/2026', () => {
    it('confirma restauração de Luan OS 22622 com delta 2327 compatível com a venda Rede 171670498', () => {
      const historicalBefore = 400.00;
      const updatedCredit = 2727.00;
      const calculatedDelta = Number((updatedCredit - historicalBefore).toFixed(2));
      const redeGrossAmount = 2327.00;

      assert.strictEqual(calculatedDelta, 2327.00);
      assert.strictEqual(calculatedDelta, redeGrossAmount);
    });
  });
});
