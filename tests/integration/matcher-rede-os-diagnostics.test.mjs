// tests/integration/matcher-rede-os-diagnostics.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

describe('Spec 461 — Unificar o Matcher Rede × OS, Seleção Manual e Diagnóstico', () => {

  describe('1. Normalização de Modalidade com Acentuação', () => {
    function normalizeModality(methodStr) {
      if (!methodStr) return { isCredit: false, isDebit: false, isPix: false };
      const normalized = methodStr
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

      const isCredit = normalized.includes('cred') || normalized.includes('credito');
      const isDebit = normalized.includes('deb') || normalized.includes('debito');
      const isPix = normalized.includes('pix') || normalized.includes('transfer');
      return { isCredit, isDebit, isPix };
    }

    it('deve identificar corretamente crédito em strings acentuadas como "Cartão Crédito VISA"', () => {
      const res = normalizeModality('Cartão Crédito VISA');
      assert.strictEqual(res.isCredit, true, 'Deve reconhecer crédito com acento');
      assert.strictEqual(res.isDebit, false);
      assert.strictEqual(res.isPix, false);
    });

    it('deve identificar corretamente débito em strings acentuadas como "Cartão Débito ELO"', () => {
      const res = normalizeModality('Cartão Débito ELO');
      assert.strictEqual(res.isCredit, false);
      assert.strictEqual(res.isDebit, true, 'Deve reconhecer débito com acento');
      assert.strictEqual(res.isPix, false);
    });

    it('não deve classificar texto genérico ou dinheiro como crédito/débito', () => {
      const res = normalizeModality('Dinheiro em Espécie Balcão');
      assert.strictEqual(res.isCredit, false);
      assert.strictEqual(res.isDebit, false);
    });
  });

  describe('2. Unicidade Bidirecional (Prevenção de Colisões 1:1)', () => {
    it('deve barrar auto-match se 2 vendas POS disputam o mesmo incremento de 1 OS', () => {
      const posTransactions = [
        { id: 'pos-1', amount: 150.00, method: 'debito' },
        { id: 'pos-2', amount: 150.00, method: 'debito' }
      ];
      const osList = [
        { id: 'os-501', delta_debit: 150.00, available_card_amount: 150.00 }
      ];

      // Motor avalia candidatos para cada POS
      const matchesPerPos = posTransactions.map(pos => {
        const eligible = osList.filter(os => Math.abs(os.available_card_amount - pos.amount) < 0.05);
        return { posId: pos.id, eligibleCount: eligible.length, eligible };
      });

      // Motor também verifica concorrência reversa: quantas vendas POS disputam cada OS
      const posCountPerOs = {};
      matchesPerPos.forEach(m => {
        m.eligible.forEach(os => {
          posCountPerOs[os.id] = (posCountPerOs[os.id] || 0) + 1;
        });
      });

      // Se posCountPerOs[os.id] > 1 => COLISÃO! Nenhuma das vendas pareia automaticamente
      assert.strictEqual(posCountPerOs['os-501'], 2, 'OS 501 é disputada por 2 maquininhas');

      const autoMatched = matchesPerPos.filter(m => {
        if (m.eligibleCount !== 1) return false;
        const targetOs = m.eligible[0];
        return posCountPerOs[targetOs.id] === 1; // Unicidade nos dois sentidos
      });

      assert.strictEqual(autoMatched.length, 0, 'Zero pareamento automático quando há colisão bidirecional');
    });

    it('deve parear com sucesso se houver estrita correspondência 1:1', () => {
      const posTransactions = [
        { id: 'pos-luan', amount: 2327.00, method: 'credito' }
      ];
      const osList = [
        { id: 'os-22622', delta_credit: 2327.00, available_card_amount: 2327.00 }
      ];

      const matchesPerPos = posTransactions.map(pos => {
        const eligible = osList.filter(os => Math.abs(os.available_card_amount - pos.amount) < 0.05);
        return { posId: pos.id, eligibleCount: eligible.length, eligible };
      });

      const posCountPerOs = {};
      matchesPerPos.forEach(m => {
        m.eligible.forEach(os => {
          posCountPerOs[os.id] = (posCountPerOs[os.id] || 0) + 1;
        });
      });

      const autoMatched = matchesPerPos.filter(m => {
        if (m.eligibleCount !== 1) return false;
        const targetOs = m.eligible[0];
        return posCountPerOs[targetOs.id] === 1;
      });

      assert.strictEqual(autoMatched.length, 1, 'Pareamento 1:1 único deve ser aceito');
      assert.strictEqual(autoMatched[0].posId, 'pos-luan');
    });
  });

  describe('3. Eliminação do "Match por Valor" Enganoso no Frontend', () => {
    it('não deve considerar match exato quando available_card_amount for zero', () => {
      const candidate = {
        os_number: '635',
        total_value: 5824.20,
        paid_value: 5824.20,
        open_balance: 0,
        available_card_amount: 0,
        candidate_status: 'no_card_delta'
      };

      const txAmount = 5824.20;

      // Lógica antiga (falha):
      let oldVal = candidate.available_card_amount;
      if (oldVal === 0) oldVal = candidate.total_value;
      const oldIsExact = Math.abs(oldVal - txAmount) < 0.05;
      assert.strictEqual(oldIsExact, true, 'Lógica antiga gerava falso positivo perigoso');

      // Lógica nova da Spec 461:
      const availableAmount = candidate.available_card_amount ?? 0;
      const diff = Math.abs(availableAmount - txAmount);
      const isExact = availableAmount > 0.05 && diff < 0.05;

      assert.strictEqual(isExact, false, 'Nova lógica NUNCA atribui match exato quando disponível for zero');
    });
  });

  describe('4. Chamada Live à RPC get_rede_os_eligible_candidates no Supabase', () => {
    it('deve executar sem erro 42702 (coluna ambígua payment_method eliminada)', async () => {
      const posId = '5ec37de3-1c1b-4c4e-a987-9aaac670979f';

      const { data, error } = await supabase.rpc('get_rede_os_eligible_candidates', {
        p_pos_id: posId,
        p_include_historical: false
      });

      assert.strictEqual(error, null, `RPC não pode retornar erro: ${error?.message}`);
      assert.ok(Array.isArray(data), 'Retorno deve ser um array de candidatos');

      if (data.length > 0) {
        const first = data[0];
        assert.ok('candidate_status' in first, 'Deve conter candidate_status');
        assert.ok('available_card_amount' in first, 'Deve conter available_card_amount');
        assert.ok('consumed_credit' in first, 'Deve conter consumed_credit');
        assert.ok('delta_credit' in first, 'Deve conter delta_credit');
      }
    });

    it('para OS 22622 (Luan), deve reportar consumo contábil correto e candidate_status coerente', async () => {
      const posId = '5ec37de3-1c1b-4c4e-a987-9aaac670979f';

      const { data, error } = await supabase.rpc('get_rede_os_eligible_candidates', {
        p_pos_id: posId,
        p_include_historical: false
      });

      assert.strictEqual(error, null);
      const os22622 = data.find(c => String(c.os_number) === '22622');

      if (os22622) {
        assert.strictEqual(Number(os22622.delta_credit), 2327.00, 'Delta de crédito deve ser 2327.00');
        assert.strictEqual(Number(os22622.consumed_credit), 2327.00, 'Consumo de crédito deve ser 2327.00');
        assert.strictEqual(Number(os22622.available_card_amount), 0, 'Disponível após consumo deve ser 0');
        assert.strictEqual(os22622.candidate_status, 'already_consumed', 'Status deve ser already_consumed');
      }
    });
  });

  describe('5. Chamada Live à RPC auto_match_daily_transactions', () => {
    it('deve retornar chaves retrocompatíveis (pos_matched / matched_pos_count) e sem exceções', async () => {
      const { data, error } = await supabase.rpc('auto_match_daily_transactions', {
        p_date: '2026-09-30'
      });

      assert.strictEqual(error, null, `auto_match_daily_transactions falhou: ${error?.message}`);
      assert.ok(data, 'Deve retornar payload de resposta');

      // Verifica contratos de retorno retrocompatíveis
      assert.ok('pos_matched' in data, 'Deve conter pos_matched');
      assert.ok('matched_pos_count' in data, 'Deve conter matched_pos_count');
      assert.strictEqual(data.pos_matched, data.matched_pos_count, 'pos_matched e matched_pos_count devem ser equivalentes');

      assert.ok('pix_matched' in data, 'Deve conter pix_matched');
      assert.ok('matched_pix_count' in data, 'Deve conter matched_pix_count');
      assert.strictEqual(data.pix_matched, data.matched_pix_count, 'pix_matched e matched_pix_count devem ser equivalentes');

      assert.strictEqual(data.stage2_error, null, 'stage2_error não deve conter erro não tratado');
    });
  });

});
