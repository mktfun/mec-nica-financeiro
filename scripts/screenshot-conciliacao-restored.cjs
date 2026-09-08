const { chromium } = require('playwright');
const path = require('path');

async function testConciliacao() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1600, height: 1100 } });
  const page = await context.newPage();

  console.log('1. Login via form submit...');
  await page.goto('http://localhost:8080/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.locator('input[type="email"]').fill('admin@mecanicapopular.com.br');
  await page.locator('input[type="password"]').fill('Admin@123456');
  await page.locator('button[type="submit"]').click();
  
  // Aguardar redirecionamento pós-login
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 10000 }).catch(() => console.log('URL não mudou...'));
  await page.waitForTimeout(2000);
  console.log('URL após login:', page.url());

  console.log('2. Navegando para /conciliacao?date=2026-09-01 ...');
  await page.goto('http://localhost:8080/conciliacao?date=2026-09-01', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  console.log('URL da conciliação:', page.url());

  const screen0109 = 'C:/Users/admin/.gemini/antigravity/brain/f121c45f-bbee-4df6-95ae-a4e20b3c90d9/screenshot_conciliacao_0109_restaurada.png';
  await page.screenshot({ path: screen0109, fullPage: true });
  console.log('📸 Screenshot 01/09 salvo!');

  console.log('3. Navegando para /conciliacao?date=2026-08-31 ...');
  await page.goto('http://localhost:8080/conciliacao?date=2026-08-31', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);

  const screen3108 = 'C:/Users/admin/.gemini/antigravity/brain/f121c45f-bbee-4df6-95ae-a4e20b3c90d9/screenshot_conciliacao_3108_restaurada.png';
  await page.screenshot({ path: screen3108, fullPage: true });
  console.log('📸 Screenshot 31/08 salvo!');

  await browser.close();
}

testConciliacao().catch(console.error);
