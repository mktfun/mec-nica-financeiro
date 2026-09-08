const { chromium } = require('playwright');

async function capture0209() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1600, height: 1100 } });
  const page = await context.newPage();

  console.log('1. Fazendo login...');
  await page.goto('http://localhost:8080/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.locator('input[type="email"]').fill('admin@mecanicapopular.com.br');
  await page.locator('input[type="password"]').fill('Admin@123456');
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(2000);

  console.log('2. Acessando /conciliacao?date=2026-09-02 ...');
  await page.goto('http://localhost:8080/conciliacao?date=2026-09-02', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6000);

  const screenPath = 'C:/Users/admin/.gemini/antigravity/brain/f121c45f-bbee-4df6-95ae-a4e20b3c90d9/screenshot_conciliacao_0209_live.png';
  await page.screenshot({ path: screenPath, fullPage: true });
  console.log('📸 Screenshot de 02/09/2026 salvo com sucesso!');

  await browser.close();
}

capture0209().catch(console.error);
