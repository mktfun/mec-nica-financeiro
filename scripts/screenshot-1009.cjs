const { chromium } = require('playwright');
const path = require('path');

async function capture() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1600, height: 1200 } });
  const page = await context.newPage();

  console.log('1. Login via form submit...');
  await page.goto('http://localhost:8080/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await page.locator('input[type="email"]').fill('admin@mecanicapopular.com.br');
  await page.locator('input[type="password"]').fill('Admin@123456');
  await page.locator('button[type="submit"]').click();
  
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 10000 }).catch(() => console.log('URL não mudou...'));
  await page.waitForTimeout(2000);

  console.log('2. Navegando para /conciliacao?date=2026-09-10 ...');
  await page.goto('http://localhost:8080/conciliacao?date=2026-09-10', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  const screenshotPath = 'C:/Users/User/.gemini/antigravity/brain/27159d9d-f687-4f7e-8328-add0bfd11cf4/tela-conciliacao-1009-sincronizada.png';
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log('📸 Screenshot salvo em:', screenshotPath);

  await browser.close();
}

capture().catch(console.error);
