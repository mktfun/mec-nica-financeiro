import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve('.');

test('Spec 457 — Remoção Completa do Cockpit & Blindagem de Serviços Compartilhados', async (t) => {

  await t.test('1. Confirmação de ausência física dos arquivos e tipos exclusivos do Cockpit', () => {
    const deletedFiles = [
      'src/components/importacoes/wizard/PostMotorDiagnosticCockpit.tsx',
      'src/components/importacoes/wizard/DiagnosticActionCards.tsx',
      'src/components/importacoes/wizard/StoreDiagnosticRow.tsx',
      'src/types/cockpit360.ts',
      'scripts/test-spec-384-cockpit.cjs',
      'scripts/screenshot-cockpit-28.mjs',
      'e2e-results/screenshots/cockpit_dia_28082026_oficial.png',
      'e2e-results/screenshots/step_09_cockpit_resumo_dia_27082026.png',
    ];

    for (const relPath of deletedFiles) {
      const fullPath = path.join(projectRoot, relPath);
      assert.strictEqual(
        fs.existsSync(fullPath),
        false,
        `Arquivo exclusivo do Cockpit ainda existe: ${relPath}`
      );
    }
  });

  await t.test('2. Varredura AST/código: nenhum import ou menção ativa a cockpit360 em src/', () => {
    function scanDir(dir, fileList = []) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanDir(fullPath, fileList);
        } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
          fileList.push(fullPath);
        }
      }
      return fileList;
    }

    const srcFiles = scanDir(path.join(projectRoot, 'src'));
    const invalidMatches = [];

    for (const file of srcFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      if (content.includes('cockpit360') || content.includes('PostMotorDiagnosticCockpit')) {
        invalidMatches.push({
          file: path.relative(projectRoot, file),
          hasCockpit360: content.includes('cockpit360'),
          hasPostMotor: content.includes('PostMotorDiagnosticCockpit'),
        });
      }
    }

    assert.deepStrictEqual(
      invalidMatches,
      [],
      `Encontradas referências ativas a componentes/tipos do Cockpit: ${JSON.stringify(invalidMatches)}`
    );
  });

  await t.test('3. CentralImportWizard.tsx desacoplado e saudável no Step 8', () => {
    const wizardPath = path.join(projectRoot, 'src/components/importacoes/CentralImportWizard.tsx');
    assert.strictEqual(fs.existsSync(wizardPath), true);

    const wizardContent = fs.readFileSync(wizardPath, 'utf-8');

    // Não deve conter o Cockpit
    assert.strictEqual(wizardContent.includes('PostMotorDiagnosticCockpit'), false);

    // Deve conter os fluxos canônicos de conclusão
    assert.strictEqual(wizardContent.includes('setStep(4)'), true, 'Deve manter navegação para Passo 4');
    assert.strictEqual(wizardContent.includes("navigate({ to: '/conciliacao' })"), true, 'Deve manter navegação para Conciliação');
    assert.strictEqual(wizardContent.includes('ImportExecutionTerminal'), true, 'Terminal de logs deve ser preservado');
    assert.strictEqual(wizardContent.includes('autoHealingData'), true, 'Auditoria pericial deve ser preservada');
  });

  await t.test('4. Preservação íntegra dos serviços e tipos compartilhados em useBackendConciliacao.ts', () => {
    const backendPath = path.join(projectRoot, 'src/hooks/useBackendConciliacao.ts');
    assert.strictEqual(fs.existsSync(backendPath), true);

    const backendContent = fs.readFileSync(backendPath, 'utf-8');

    assert.strictEqual(
      backendContent.includes('export function usePosTripleReconciliation'),
      true,
      'usePosTripleReconciliation deve continuar exportado'
    );
    assert.strictEqual(
      backendContent.includes('export interface PosTripleReconciliationResult'),
      true,
      'PosTripleReconciliationResult deve continuar exportada'
    );
    assert.strictEqual(
      backendContent.includes('get_store_pos_triple_reconciliation'),
      true,
      'RPC get_store_pos_triple_reconciliation deve continuar referenciada'
    );
  });

  await t.test('5. Telas ativas de conciliação consomem os serviços compartilhados sem quebras', () => {
    const resumoDiaPath = path.join(projectRoot, 'src/components/conciliacao/ResumoDiaPanel.tsx');
    const maquininhaViewPath = path.join(projectRoot, 'src/components/conciliacao/StoreCartaoMaquininhaView.tsx');

    const resumoContent = fs.readFileSync(resumoDiaPath, 'utf-8');
    const maquininhaContent = fs.readFileSync(maquininhaViewPath, 'utf-8');

    assert.strictEqual(
      resumoContent.includes('usePosTripleReconciliation'),
      true,
      'ResumoDiaPanel deve continuar usando usePosTripleReconciliation'
    );
    assert.strictEqual(
      maquininhaContent.includes('usePosTripleReconciliation'),
      true,
      'StoreCartaoMaquininhaView deve continuar usando usePosTripleReconciliation'
    );
  });
});
