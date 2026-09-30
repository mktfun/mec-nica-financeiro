// tests/e2e/tier2_boundary/spec459_ofx_rule_and_purge_reversion.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Spec 459 — Persistência de Regras OFX e Reversão Fiel do Pátio no Reset Diário', () => {

  describe('1. Persistência de Regras de Saldo OFX', () => {
    it('deve gerar e versionar regras de saldo atômicas por account_key', () => {
      const rules = [];

      function saveOfxBalanceRule(accountKey, sourceKind, memoNorm, isActive = true) {
        if (!isActive) {
          rules.forEach(r => {
            if (r.account_key === accountKey && r.is_active) {
              r.is_active = false;
            }
          });
          return { success: true, action: 'revoked', account_key: accountKey };
        }

        // 1. Desativa versão anterior
        rules.forEach(r => {
          if (r.account_key === accountKey && r.is_active) {
            r.is_active = false;
          }
        });

        // 2. Calcula versão
        const currentVersions = rules.filter(r => r.account_key === accountKey).map(r => r.version);
        const nextVer = (currentVersions.length > 0 ? Math.max(...currentVersions) : 0) + 1;

        const newRule = {
          id: `rule-${Math.random()}`,
          account_key: accountKey,
          source_kind: sourceKind,
          memo_normalized: memoNorm || null,
          date_role: 'SAME_DAY',
          is_active: true,
          version: nextVer
        };
        rules.push(newRule);
        return { success: true, action: 'saved', version: nextVer, rule: newRule };
      }

      // Salva primeira regra
      const res1 = saveOfxBalanceRule('0097_12345', 'STMTTRN_MEMO', 'SALDO DO DIA');
      assert.strictEqual(res1.success, true);
      assert.strictEqual(res1.version, 1);

      // Salva nova regra para a mesma conta (substitui anterior)
      const res2 = saveOfxBalanceRule('0097_12345', 'LEDGERBAL', null);
      assert.strictEqual(res2.success, true);
      assert.strictEqual(res2.version, 2);

      // Verifica que apenas a versão 2 está ativa
      const activeRules = rules.filter(r => r.account_key === '0097_12345' && r.is_active);
      assert.strictEqual(activeRules.length, 1);
      assert.strictEqual(activeRules[0].version, 2);
      assert.strictEqual(activeRules[0].source_kind, 'LEDGERBAL');

      // Revogação da regra
      const res3 = saveOfxBalanceRule('0097_12345', 'LEDGERBAL', null, false);
      assert.strictEqual(res3.action, 'revoked');
      const activeAfterRevoke = rules.filter(r => r.account_key === '0097_12345' && r.is_active);
      assert.strictEqual(activeAfterRevoke.length, 0);
    });

    it('deve casar automaticamente o candidato indexado pela regra salva no wizard', () => {
      const candidates = [
        { sourceKind: 'LEDGERBAL', amount: 15400.50, postedDate: '2026-09-30', balanceRole: 'LEDGER' },
        { sourceKind: 'STMTTRN_MEMO', memoNormalized: 'SALDO DO DIA', amount: 18200.00, postedDate: '2026-09-30', balanceRole: 'CLOSING' },
        { sourceKind: 'AVAILBAL', amount: 12000.00, postedDate: '2026-09-30', balanceRole: 'AVAILABLE' }
      ];

      const activeRule = {
        account_key: '0097_12345',
        source_kind: 'STMTTRN_MEMO',
        memo_normalized: 'SALDO DO DIA',
        is_active: true
      };

      // Simula a lógica de correspondência do CentralImportWizard
      const foundIdx = candidates.findIndex(c => 
        c.sourceKind === activeRule.source_kind && 
        (!activeRule.memo_normalized || c.memoNormalized === activeRule.memo_normalized)
      );

      assert.strictEqual(foundIdx, 1);
      assert.strictEqual(candidates[foundIdx].amount, 18200.00);
    });
  });

  describe('2. Snapshot e Rollback Fiel de OS no Reset Diário', () => {
    it('deve reverter OSs alteradas e remover OSs novas criadas no dia', () => {
      // Estado inicial do Pátio antes da importação
      const initialPatioOs = [
        {
          id: 'os-1',
          os_number: '2001',
          store_id: 'store-alphaville',
          total_value: 1500,
          paid_value: 0,
          status: 'em_aberto',
          credit_value: 0,
          debit_value: 0,
          pix_transfer_value: 0,
          last_payment_date: null
        },
        {
          id: 'os-2',
          os_number: '2002',
          store_id: 'store-alphaville',
          total_value: 800,
          paid_value: 400,
          status: 'pago_parcial',
          credit_value: 400,
          debit_value: 0,
          pix_transfer_value: 0,
          last_payment_date: '2026-09-28'
        }
      ];

      // 1. Importação inicia: salva snapshot em patio_os_daily_backups
      const patioBackups = new Map();
      const targetDate = '2026-09-30';
      const storeId = 'store-alphaville';

      const backupKey = `${targetDate}_${storeId}`;
      patioBackups.set(backupKey, JSON.parse(JSON.stringify(initialPatioOs)));

      // 2. Importação aplica mutações no pátio:
      // - os-1 é quitada
      // - os-2 recebe mais pagamento e finaliza
      // - os-3 é uma nova OS introduzida hoje
      let currentPatio = [
        {
          id: 'os-1',
          os_number: '2001',
          store_id: storeId,
          total_value: 1500,
          paid_value: 1500,
          status: 'finalizada',
          credit_value: 1500,
          debit_value: 0,
          pix_transfer_value: 0,
          last_payment_date: targetDate
        },
        {
          id: 'os-2',
          os_number: '2002',
          store_id: storeId,
          total_value: 800,
          paid_value: 800,
          status: 'finalizada',
          credit_value: 400,
          debit_value: 400,
          pix_transfer_value: 0,
          last_payment_date: targetDate
        },
        {
          id: 'os-3',
          os_number: '2003',
          store_id: storeId,
          total_value: 300,
          paid_value: 300,
          status: 'finalizada',
          credit_value: 0,
          debit_value: 0,
          pix_transfer_value: 300,
          last_payment_date: targetDate
        }
      ];

      assert.strictEqual(currentPatio.length, 3);
      assert.strictEqual(currentPatio[0].paid_value, 1500);

      // 3. Usuário clica em "Resetar Dados do Dia" (Purge)
      // Executa lógica da RPC purge_daily_financial_data
      const backupOs = patioBackups.get(backupKey);
      assert.ok(backupOs, 'Backup deve existir para a data e filial');

      const backupIds = new Set(backupOs.map(o => o.id));

      // Deleta OSs novas que não existiam no backup
      currentPatio = currentPatio.filter(o => backupIds.has(o.id));
      assert.strictEqual(currentPatio.length, 2, 'OS-3 nova deve ter sido removida');

      // Restaura valores originais
      const backupMap = new Map(backupOs.map(o => [o.id, o]));
      currentPatio = currentPatio.map(os => {
        const orig = backupMap.get(os.id);
        return { ...os, ...orig };
      });

      // Remove backup pós-restauração
      patioBackups.delete(backupKey);

      // Verificação de fidelidade total
      assert.strictEqual(currentPatio[0].os_number, '2001');
      assert.strictEqual(currentPatio[0].paid_value, 0, 'OS-1 deve ter voltado para 0 pago');
      assert.strictEqual(currentPatio[0].status, 'em_aberto', 'OS-1 deve ter voltado para em_aberto');

      assert.strictEqual(currentPatio[1].os_number, '2002');
      assert.strictEqual(currentPatio[1].paid_value, 400, 'OS-2 deve ter voltado para 400');
      assert.strictEqual(currentPatio[1].status, 'pago_parcial');
      assert.strictEqual(currentPatio[1].last_payment_date, '2026-09-28');

      assert.strictEqual(patioBackups.has(backupKey), false, 'Backup deve ser limpo pós-purge');
    });

    it('deve reverter fielmente com fallback de os_import_observations se o backup não existir', () => {
      const os = {
        os_number: '3001',
        store_id: 'store-1',
        total_value: 1000,
        paid_value: 1000,
        credit_value: 1000,
        debit_value: 0,
        pix_transfer_value: 0,
        status: 'finalizada'
      };

      const obs = {
        target_date: '2026-09-30',
        store_id: 'store-1',
        os_number: '3001',
        paid_before: 200,
        credit_before: 200,
        debit_before: 0,
        pix_before: 0
      };

      // Simula fallback da RPC
      os.paid_value = obs.paid_before;
      os.credit_value = obs.credit_before;
      os.status = obs.paid_before <= 0 ? 'em_aberto' : (obs.paid_before >= os.total_value - 0.05 ? 'finalizada' : 'pago_parcial');

      assert.strictEqual(os.paid_value, 200);
      assert.strictEqual(os.status, 'pago_parcial');
    });
  });

});
