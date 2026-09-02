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
  await page.fill('input[type="email"]', 'admin@mecanicapopular.com.br');
  await page.fill('input[type="password"]', 'Admin@123456');
  await page.click('button[type="submit"]');

  await page.waitForURL('http://localhost:8080/', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(2000);

  // Click on "31/08" button
  console.log('Clicking on 31/08...');
  const btn31 = await page.$('button:has-text("31/08")');
  if (btn31) {
    await btn31.click();
    await page.waitForTimeout(2500);
  }

  const outputPath = 'C:/Users/admin/.gemini/antigravity/brain/f121c45f-bbee-4df6-95ae-a4e20b3c90d9/screenshot_executive_dashboard_3108.png';
  await page.screenshot({ path: outputPath, fullPage: true });
  console.log('Screenshot 31/08 saved to', outputPath);

  await browser.close();
}

run().catch(console.error);
