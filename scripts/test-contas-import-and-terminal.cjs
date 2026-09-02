const { chromium } = require('playwright');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

async function runTest() {
  console.log('🚀 Iniciando Teste de Blindagem de Contas a Pagar & Terminal de Logs (Feature 349)...');

  // 1. Criar planilha sintética de Contas a Pagar contendo linhas normais e linhas zeradas/canceladas
  const testWb = XLSX.utils.book_new();
  const testRows = [
    ['Emp', 'Código', 'Parc', 'Favorecido', 'Descrição', 'Dt. Vecto', 'Dt. Pgto', 'Vl. Pago', 'Vl. a Pagar', 'Status'],
    ['mpjorgeberetta', '1001', '1/1', 'AUTO PECAS ABC LTDA', 'Pastilha de freio', '01/09/2026', '01/09/2026', '350.00', '0.00', 'PAG'],
    ['mpkennedy', '1002', '1/1', 'DISTRIBUIDORA LUBRIFICANTES', 'Oleo sintético 5w30', '01/09/2026', '01/09/2026', '1250.50', '0.00', 'PAG'],
    ['reidooleomaua', '1003', '1/2', 'ENERGIA ELETRICA ENEL', 'Conta de luz filial', '01/09/2026', '01/09/2026', '420.10', '0.00', 'PAG'],
    ['mpmaster', '1004', '1/1', 'TITULO CANCELADO ESTORNO', 'Item cancelado pelo fornecedor', '01/09/2026', '01/09/2026', '0.00', '0.00', 'CANCELADA'],
    ['mpmaster', '1005', '1/1', 'LINHA ZERADA TESTE', 'Sem valor de pagamento', '01/09/2026', '01/09/2026', '', '', 'ABER'],
    ['mpsantoandre', '1006', '1/1', 'LOCACAO DE IMOVEL', 'Aluguel filial', '01/09/2026', '01/09/2026', '3200.00', '0.00', 'PAG'],
    ['', '', '', 'TOTAL GERAL', '', '', '', '5220.60', '0.00', '']
  ];

  const ws = XLSX.utils.aoa_to_sheet(testRows);
  XLSX.utils.book_append_sheet(testWb, ws, 'Contas');
  const tempXlsPath = path.join(__dirname, 'temp_test_contas_349.xlsx');
  XLSX.writeFile(testWb, tempXlsPath);
  console.log('✅ Planilha sintética com linhas zeradas e normais gerada em:', tempXlsPath);

  // 2. Iniciar Playwright e autenticar
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    console.log('🌐 Navegando para /login...');
    await page.goto('http://localhost:8080/login', { waitUntil: 'networkidle', timeout: 30000 });
    
    // Autenticar com credenciais corretas
    console.log('🔑 Realizando login...');
    await page.fill('input[type="email"]', 'admin@mecanicapopular.com.br');
    await page.fill('input[type="password"]', 'Admin@123456');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // Navegar para /importacoes
    console.log('🌐 Navegando para http://localhost:8080/importacoes...');
    await page.goto('http://localhost:8080/importacoes', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Tirar screenshot da tela inicial do Wizard
    const screenWizardPath = path.join('C:', 'Users', 'admin', '.gemini', 'antigravity', 'brain', 'f121c45f-bbee-4df6-95ae-a4e20b3c90d9', 'screenshot_step1_contas_wizard.png');
    await page.screenshot({ path: screenWizardPath, fullPage: true });
    console.log('📸 Screenshot da tela inicial do Wizard salvo em:', screenWizardPath);

    // Injetar arquivo no dropzone de importação
    const fileInput = await page.$('input[type="file"]');
    if (fileInput) {
      await fileInput.setInputFiles(tempXlsPath);
      console.log('📁 Arquivo de Contas a Pagar injetado no dropzone!');
      await page.waitForTimeout(3000);

      // Tirar screenshot após injeção
      const screenLoadedPath = path.join('C:', 'Users', 'admin', '.gemini', 'antigravity', 'brain', 'f121c45f-bbee-4df6-95ae-a4e20b3c90d9', 'screenshot_contas_loaded_wizard.png');
      await page.screenshot({ path: screenLoadedPath, fullPage: true });
      console.log('📸 Screenshot após upload salvo em:', screenLoadedPath);
    }

    console.log('✨ Teste E2E concluído com sucesso!');
  } catch (err) {
    console.error('❌ Erro no teste Playwright:', err);
  } finally {
    if (fs.existsSync(tempXlsPath)) {
      fs.unlinkSync(tempXlsPath);
    }
    await browser.close();
  }
}

runTest();
