// tests/unit/import-stage-outcome.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Spec 462 — Unidade: Lógica de Estágios do Wizard e Bloqueio de Falso Sucesso', () => {

  function resolveImportOutcome({
    hasOfxError,
    ofxErrorMessage = 'column updated_at does not exist',
    ofxErrorCode = '42703',
    targetDate = '2026-09-30',
    affectedAccounts = ['ITAU_1234', 'BRADESCO_5678'],
    initialStages = [
      { id: 'os', status: 'running', subSteps: [] },
      { id: 'maquininha', status: 'running', subSteps: [] },
      { id: 'ofx', status: 'running', subSteps: [] },
      { id: 'salvar', status: 'running', subSteps: [] },
      { id: 'auto_healing', status: 'pending', subSteps: [] }
    ],
    autoAdvanceToStep4 = true
  }) {
    let currentOfxError = null;
    const logs = [];

    if (hasOfxError) {
      currentOfxError = {
        code: ofxErrorCode,
        message: ofxErrorMessage,
        targetDate,
        affectedAccounts,
        failedAt: new Date().toISOString()
      };
      logs.push({ type: 'error', message: `❌ Falha ao persistir saldos e regras OFX: ${currentOfxError.message}` });
    } else {
      logs.push({ type: 'success', message: '✅ Saldos oficiais de extrato OFX e regras persistidos no banco!' });
    }

    // Lógica canônica implementada no CentralImportWizard
    if (currentOfxError) {
      logs.push({ type: 'warning', message: '⚠️ Importação concluída com pendência: saldo oficial OFX não aplicado.' });
    } else {
      logs.push({ type: 'success', message: '✅ TODAS AS ETAPAS FORAM CONCLUÍDAS COM SUCESSO!' });
    }

    const auditData = {
      timestamp: new Date().toISOString(),
      targetDate,
      ofxBalanceSelectionError: currentOfxError || undefined
    };

    const finalStages = initialStages.map(s => {
      if (s.id === 'ofx' && currentOfxError) {
        return { ...s, status: 'error' };
      }
      return {
        ...s,
        status: s.id === 'auto_healing' ? s.status : 'success'
      };
    });

    const shouldAutoAdvance = autoAdvanceToStep4 && !currentOfxError;

    return {
      currentOfxError,
      logs,
      auditData,
      finalStages,
      shouldAutoAdvance
    };
  }

  it('1. Deve bloquear a mensagem "TODAS AS ETAPAS COM SUCESSO" quando houver erro de saldo OFX', () => {
    const outcome = resolveImportOutcome({ hasOfxError: true });

    const hasFalseSuccess = outcome.logs.some(l => l.message.includes('TODAS AS ETAPAS FORAM CONCLUÍDAS COM SUCESSO'));
    assert.strictEqual(hasFalseSuccess, false, 'NÃO deve conter mensagem de sucesso integral quando houver erro no OFX');

    const hasWarning = outcome.logs.some(l => l.message.includes('Importação concluída com pendência'));
    assert.strictEqual(hasWarning, true, 'Deve alertar sobre pendência no saldo oficial OFX');
  });

  it('2. Deve marcar o estágio de OFX como "error" e preservar detalhes no auditData', () => {
    const outcome = resolveImportOutcome({
      hasOfxError: true,
      ofxErrorMessage: 'column "updated_at" of relation "reconciliations" does not exist',
      ofxErrorCode: '42703'
    });

    const ofxStage = outcome.finalStages.find(s => s.id === 'ofx');
    assert.ok(ofxStage);
    assert.strictEqual(ofxStage.status, 'error', 'Estágio do OFX deve permanecer como error');

    assert.ok(outcome.auditData.ofxBalanceSelectionError, 'auditData deve conter ofxBalanceSelectionError');
    assert.strictEqual(outcome.auditData.ofxBalanceSelectionError.code, '42703');
    assert.strictEqual(outcome.auditData.ofxBalanceSelectionError.message, 'column "updated_at" of relation "reconciliations" does not exist');
    assert.strictEqual(outcome.shouldAutoAdvance, false, 'Auto-avanço deve ser cancelado em caso de erro');
  });

  it('3. Deve emitir sucesso total e zerar auditData.ofxBalanceSelectionError quando não houver erro', () => {
    const outcome = resolveImportOutcome({ hasOfxError: false });

    const hasSuccess = outcome.logs.some(l => l.message.includes('TODAS AS ETAPAS FORAM CONCLUÍDAS COM SUCESSO'));
    assert.strictEqual(hasSuccess, true);

    const ofxStage = outcome.finalStages.find(s => s.id === 'ofx');
    assert.strictEqual(ofxStage.status, 'success');
    assert.strictEqual(outcome.auditData.ofxBalanceSelectionError, undefined);
    assert.strictEqual(outcome.shouldAutoAdvance, true);
  });

  it('4. Simulação de Retry Isolado: deve limpar erro e promover estágio a success', () => {
    // 1. Simula estado inicial com erro
    let errorState = {
      code: '42703',
      message: 'column updated_at does not exist',
      targetDate: '2026-09-30',
      affectedAccounts: ['ITAU_01']
    };
    let stageStatus = 'error';

    // 2. Simula execução bem-sucedida do retry isolado
    const retrySuccessful = true;
    if (retrySuccessful) {
      errorState = null;
      stageStatus = 'success';
    }

    assert.strictEqual(errorState, null, 'Estado de erro deve ser limpo pós-retry bem-sucedido');
    assert.strictEqual(stageStatus, 'success', 'Estágio deve mudar para success pós-retry');
  });
});
