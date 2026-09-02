const { chromium } = require('playwright');
require('dotenv').config();

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1100 }
  });

  const page = await context.newPage();
  console.log('Navigating to http://localhost:8080/login ...');
  await page.goto('http://localhost:8080/login', { waitUntil: 'networkidle' });

  // Fill login form
  console.log('Logging in...');
  await page.fill('input[type="email"]', 'admin@mecanicapopular.com.br');
  await page.fill('input[type="password"]', 'Admin@123456');
  await page.click('button[type="submit"]');

  await page.waitForTimeout(2000);

  // Navigate to importacoes
  console.log('Navigating to /importacoes ...');
  await page.goto('http://localhost:8080/importacoes', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Click on "Ingestão Visual OCR (Prints)" button
  console.log('Clicking on OCR button...');
  const ocrBtn = await page.$('button:has-text("Ingestão Visual OCR")');
  if (ocrBtn) {
    await ocrBtn.click();
    console.log('Clicked OCR button, waiting for pending OSs to render...');
    await page.waitForTimeout(3000);
  }

  // Take screenshot of the Active Store Patio Guide
  const outputPath = 'C:/Users/admin/.gemini/antigravity/brain/f121c45f-bbee-4df6-95ae-a4e20b3c90d9/screenshot_active_patio_guide.png';
  await page.screenshot({ path: outputPath, fullPage: true });
  console.log('Screenshot saved to', outputPath);

  // Upload test image to see match
  const testImgPath = 'C:/Users/admin/.gemini/antigravity/brain/f121c45f-bbee-4df6-95ae-a4e20b3c90d9/.user_uploaded/media_1788351234756.png';
  console.log('Uploading test image...');
  const fileInput = await page.$('input[type="file"][accept="image/*"]');
  if (fileInput) {
    await fileInput.setInputFiles(testImgPath);
    await page.waitForTimeout(1000);

    const processBtn = await page.$('button:has-text("Processar")');
    if (processBtn) {
      await processBtn.click();
      console.log('Processing print with Mistral Vision...');
      await page.waitForTimeout(8000);
    }
  }

  const outputPathMatch = 'C:/Users/admin/.gemini/antigravity/brain/f121c45f-bbee-4df6-95ae-a4e20b3c90d9/screenshot_active_patio_guide_matched.png';
  await page.screenshot({ path: outputPathMatch, fullPage: true });
  console.log('Matched Screenshot saved to', outputPathMatch);

  await browser.close();
}

run().catch(console.error);
