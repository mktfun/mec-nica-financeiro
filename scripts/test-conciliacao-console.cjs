const { chromium } = require('playwright');

async function testConsole() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1600, height: 1100 } });
  const page = await context.newPage();

  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.error('BROWSER ERROR:', err));

  console.log('1. Login...');
  await page.goto('http://localhost:8080/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await page.fill('input[type="email"]', 'admin@mecanicapopular.com.br');
  await page.fill('input[type="password"]', 'Admin@123456');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);

  console.log('2. Navegando para /conciliacao?date=2026-09-01 ...');
  await page.goto('http://localhost:8080/conciliacao?date=2026-09-01', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);

  // Check text content on page
  const bodyText = await page.innerText('body');
  console.log('Body preview (first 400 chars):', bodyText.substring(0, 400));

  const screenPath = 'C:/Users/admin/.gemini/antigravity/brain/f121c45f-bbee-4df6-95ae-a4e20b3c90d9/screenshot_conciliacao_live.png';
  await page.screenshot({ path: screenPath, fullPage: true });
  console.log('Screenshot saved to:', screenPath);

  await browser.close();
}

testConsole().catch(console.error);
