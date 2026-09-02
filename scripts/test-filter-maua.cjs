const { chromium } = require('playwright');
require('dotenv').config();

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1100 }
  });

  const page = await context.newPage();
  await page.goto('http://localhost:8080/login', { waitUntil: 'networkidle' });

  // Fill login form
  await page.fill('input[type="email"]', 'admin@mecanicapopular.com.br');
  await page.fill('input[type="password"]', 'Admin@123456');
  await page.click('button[type="submit"]');

  await page.waitForTimeout(2000);

  // Navigate to importacoes
  await page.goto('http://localhost:8080/importacoes', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Open OCR modal
  const ocrBtn = await page.$('button:has-text("Ingestão Visual OCR")');
  if (ocrBtn) {
    await ocrBtn.click();
    await page.waitForTimeout(2000);
  }

  // Click on Maua store pill
  console.log('Clicking on Maua pill...');
  const mauaPill = await page.$('button:has-text("Maua")');
  if (mauaPill) {
    await mauaPill.click();
    await page.waitForTimeout(1000);
  }

  const outputPath = 'C:/Users/admin/.gemini/antigravity/brain/f121c45f-bbee-4df6-95ae-a4e20b3c90d9/screenshot_maua_filtered_guide.png';
  await page.screenshot({ path: outputPath, fullPage: true });
  console.log('Maua Filtered Screenshot saved to', outputPath);

  await browser.close();
}

run().catch(console.error);
