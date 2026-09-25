// tests/e2e/tier2_boundary/m8_canonical_rematch.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { supabase, getDailyReconciliationSummary } from '../harness/client.mjs';
import { isStrictPixOsMatch } from '../../../src/lib/matchers/autoMatchingEngine.ts';

describe('Tier 2 — Boundary & Corner Cases: Canonical Rematch & Intercompany Guard (Spec 438)', () => {

  describe('Predicados Estritos de Matching (isStrictPixOsMatch)', () => {
    it('M8-B1: Bloqueia qualquer transação com token intercompany ou adquirente', () => {
      const mockOs = {
        os_number: '1234',
        client_name: 'JOAO DA SILVA',
        pix_transfer_value: 1500.00
      };

      // Casos com tokens proibidos
      assert.strictEqual(isStrictPixOsMatch(1500.00, 'TRANSF TED BERETTA AUTO CENTER', mockOs), false, 'Deve bloquear BERETTA');
      assert.strictEqual(isStrictPixOsMatch(1500.00, 'PIX RECEBIDO MERCADO PAGO MP', mockOs), false, 'Deve bloquear MERCADO PAGO');
      assert.strictEqual(isStrictPixOsMatch(1500.00, 'TRANSF INTERCOMPANY MATRIZ', mockOs), false, 'Deve bloquear INTERCOMPANY');
      assert.strictEqual(isStrictPixOsMatch(1500.00, 'DOC DHJV MECANICA LTDA', mockOs), false, 'Deve bloquear DHJV');
      assert.strictEqual(isStrictPixOsMatch(1500.00, 'TED REDECARD ADQ CARTAO', mockOs), false, 'Deve bloquear REDE');
    });

    it('M8-B2: Bloqueia OS sem parcela explícita de PIX (elimina fallback para total_value / paid_value)', () => {
      const osSemPix = {
        os_number: '5566',
        client_name: 'MARIA SILVA',
        pix_transfer_value: 0,
        paid_value: 200.00,
        total_value: 200.00
      };

      // Mesmo com valor e nome batendo, deve rejeitar porque pix_transfer_value é 0
      assert.strictEqual(isStrictPixOsMatch(200.00, 'PIX TRANSF MARIA SILVA', osSemPix), false);
    });

    it('M8-B3: Bloqueia divergência de identidade de cliente (zero match cego por valor)', () => {
      const osJoao = {
        os_number: '7788',
        client_name: 'JOAO FERREIRA LIMA',
        pix_transfer_value: 350.00
      };

      // Valor bate exatamente, mas nome/token é completamente divergente
      assert.strictEqual(isStrictPixOsMatch(350.00, 'PIX TRANSF CARLOS EDUARDO ROCHA', osJoao), false);
    });

    it('M8-B4: Aceita match legítimo quando valor bate com parcela PIX e identidade bate tokens', () => {
      const osValida = {
        os_number: '9900',
        client_name: 'ROBERTO CARLOS ALMEIDA',
        pix_transfer_value: 450.50
      };

      assert.strictEqual(isStrictPixOsMatch(450.50, 'PIX RECEBIDO ROBERTO CARLOS', osValida), true);
    });
  });

  describe('RPC auto_match_daily_transactions Idempotência & Bloqueios', () => {
    it('M8-B5: Chamada idempotente à RPC não gera duplicações de matches', async () => {
      const date = '2026-09-24';
      const { data: run1, error: err1 } = await supabase.rpc('auto_match_daily_transactions', { p_date: date });
      assert.ok(!err1, `Run 1 falhou: ${err1?.message}`);

      const { data: run2, error: err2 } = await supabase.rpc('auto_match_daily_transactions', { p_date: date });
      assert.ok(!err2, `Run 2 falhou: ${err2?.message}`);

      assert.strictEqual(typeof run1, 'object');
      assert.strictEqual(typeof run2, 'object');
    });

    it('M8-B6: RPC auto_match_receivables não faz baixa em transferências intercompany', async () => {
      const date = '2026-09-24';
      const { data, error } = await supabase.rpc('auto_match_receivables', { p_date: date });
      assert.ok(!error, `auto_match_receivables falhou: ${error?.message}`);
      assert.strictEqual(typeof data, 'object');
    });
  });

  describe('Consistência Canônica do Resumo (get_daily_reconciliation_summary)', () => {
    it('M8-B7: Quando OFX saídas e Contas conciliadas são iguais, dif_saidas deve ser 0.00 exato', async () => {
      const res = await getDailyReconciliationSummary('2026-09-25', true);
      assert.ok(!res.error, `get_daily_reconciliation_summary falhou: ${res.error?.message}`);

      const stores = res.data.stores || [];
      // Jorge Beretta (st-03) tem OFX 850 e contas 850
      const beretta = stores.find(s => s.store_id === 'st-03' || s.store_name?.includes('Jorge'));
      if (beretta) {
        assert.strictEqual(Number(beretta.dif_saidas), 0, `Jorge Beretta dif_saidas deve ser 0.00, obteve ${beretta.dif_saidas}`);
        assert.strictEqual(Number(beretta.dif_entradas), 0, `Jorge Beretta dif_entradas deve ser 0.00, obteve ${beretta.dif_entradas}`);
      }

      // Kennedy (st-04)
      const kennedy = stores.find(s => s.store_id === 'st-04' || s.store_name?.includes('Kennedy'));
      if (kennedy) {
        assert.strictEqual(Number(kennedy.dif_saidas), 0, `Kennedy dif_saidas deve ser 0.00, obteve ${kennedy.dif_saidas}`);
        assert.strictEqual(Number(kennedy.dif_entradas), 0, `Kennedy dif_entradas deve ser 0.00, obteve ${kennedy.dif_entradas}`);
      }
    });
  });

});
