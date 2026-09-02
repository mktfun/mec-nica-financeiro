const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function setupTestFiles() {
  const tmpDir = path.join(__dirname, '..', 'tmp_test_imports');
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  // Create a clean sample OFX file (No OS .xls file)
  const sampleOfx = `OFXHEADER:100
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
<DTSERVER>20260902100000[-03:EST]
<LANGUAGE>POR
</SONRS>
</SIGNONMSGSRSV1>
<BANKMSGSRSV1>
<STMTTRNRS>
<TRNUID>1001
<STATUS><CODE>0<SEVERITY>INFO</STATUS>
<STMTRS>
<CURDEF>BRL
<BANKACCTFROM>
<BANKID>0341
<ACCTID>7386166586
<ACCTTYPE>CHECKING
</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>20260901100000[-03:EST]
<DTEND>20260902100000[-03:EST]
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260901100000[-03:EST]
<TRNAMT>50000.00
<FITID>20260901001
<CHECKNUM>20260901001
<MEMO>SALDO ANTERIOR
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260902100000[-03:EST]
<TRNAMT>2620.00
<FITID>20260902001
<CHECKNUM>20260902001
<MEMO>PIX CLIENTE EGIDIO AMARO OS 22593
</STMTTRN>
</BANKTRANLIST>
<LEDGERBAL>
<BALAMT>52620.00
<DTASOF>20260902100000[-03:EST]
</LEDGERBAL>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;

  const ofxFilePath = path.join(tmpDir, 'Extrato_Maua.ofx');
  fs.writeFileSync(ofxFilePath, sampleOfx, 'utf8');

  return { ofxFilePath };
}

async function run() {
  const { ofxFilePath } = await setupTestFiles();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1100 }
  });

  const page = await context.newPage();
  console.log('1. Navigating to http://localhost:8080/login ...');
  await page.goto('http://localhost:8080/login', { waitUntil: 'networkidle' });

  // Fill login form
  console.log('2. Logging in...');
  await page.fill('input[type="email"]', 'admin@mecanicapopular.com.br');
  await page.fill('input[type="password"]', 'Admin@123456');
  await page.click('button[type="submit"]');

  await page.waitForTimeout(2000);

  // Navigate to importacoes
  console.log('3. Navigating to /importacoes ...');
  await page.goto('http://localhost:8080/importacoes', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  console.log('4. Uploading OFX file ONLY (No OS .xls)...');
  const fileInput = await page.$('input[type="file"]');
  if (fileInput) {
    await fileInput.setInputFiles([ofxFilePath]);
    console.log('File dropped! Waiting for automatic zero-click transition to Step 1.5...');
    await page.waitForTimeout(4000);
  }

  // Upload test print in the embedded OCR dropzone
  const testImgPath = 'C:/Users/admin/.gemini/antigravity/brain/f121c45f-bbee-4df6-95ae-a4e20b3c90d9/.user_uploaded/media_1788351234756.png';
  console.log('5. Uploading test print in embedded OCR dropzone...');
  const ocrFileInput = await page.$('input[type="file"][accept="image/*"]');
  if (ocrFileInput) {
    await ocrFileInput.setInputFiles(testImgPath);
    await page.waitForTimeout(1000);

    const processBtn = await page.$('button:has-text("Processar")');
    if (processBtn) {
      await processBtn.click();
      console.log('Processing print with Mistral Vision...');
      await page.waitForTimeout(9000);
    }
  }

  // Click "Salvar e Avançar Fluxo"
  console.log('6. Clicking on "Salvar e Avançar Fluxo" to trigger atomic DB persistence & pipeline transition...');
  const advanceBtn = await page.$('button:has-text("Salvar e Avançar Fluxo")');
  if (advanceBtn) {
    await advanceBtn.click();
    await page.waitForTimeout(4000);
  }

  // Verify Step 3: Single Action Button and Carried Cash (Dinheiro MP)
  console.log('7. Verifying Step 3 (Single CTA and Dinheiro MP Carryover)...');
  const step3Screenshot = 'C:/Users/admin/.gemini/antigravity/brain/f121c45f-bbee-4df6-95ae-a4e20b3c90d9/screenshot_step3_single_cta_and_cash.png';
  await page.screenshot({ path: step3Screenshot, fullPage: true });
  console.log('Step 3 Screenshot saved to', step3Screenshot);

  // Check if "Gravar Direto (sem Wizard)" exists
  const oldBypassBtn = await page.$('button:has-text("Gravar Direto")');
  if (oldBypassBtn) {
    console.error('FAIL: Old bypass button "Gravar Direto" still found in DOM!');
  } else {
    console.log('PASS: Old bypass button "Gravar Direto" successfully removed.');
  }

  // Check if single CTA button exists
  const singleCtaBtn = await page.$('button:has-text("Processar e Avançar Conciliação")');
  if (singleCtaBtn) {
    console.log('PASS: Single primary CTA "Processar e Avançar Conciliação →" found!');
    
    // Click single CTA to advance to Step 4
    console.log('8. Clicking single CTA to advance to Step 4 (Vínculo de Pagamentos)...');
    await singleCtaBtn.click();
    await page.waitForTimeout(5000);

    const step4Screenshot = 'C:/Users/admin/.gemini/antigravity/brain/f121c45f-bbee-4df6-95ae-a4e20b3c90d9/screenshot_step4_advanced_from_single_cta.png';
    await page.screenshot({ path: step4Screenshot, fullPage: true });
    console.log('Step 4 Screenshot saved to', step4Screenshot);
  } else {
    console.error('FAIL: Single CTA button not found in Step 3!');
  }

  await browser.close();
}

run().catch(console.error);
