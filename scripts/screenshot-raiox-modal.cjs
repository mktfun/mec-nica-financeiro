const { chromium } = require('playwright');
const path = require('path');
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

  await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(2000);

  // Navigate directly to conciliacao for 2026-09-09
  console.log('Navigating to /conciliacao?date=2026-09-09 ...');
  await page.goto('http://localhost:8080/conciliacao?date=2026-09-09', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // Click on "Ver Lojas ↗"
  console.log('Opening Raio-X modal via text=Ver Lojas...');
  await page.click('text=Ver Lojas ↗');
  console.log('Clicked Ver Lojas ↗!');

  await page.waitForTimeout(2000);

  const outputPath = 'C:/Users/admin/.gemini/antigravity/brain/a14b1dab-59eb-462c-963a-30ba5cc3d95f/screenshot_raiox_modal.png';
  await page.screenshot({ path: outputPath, fullPage: false });
  console.log('Screenshot saved to', outputPath);

  await browser.close();
}

run().catch(console.error);
