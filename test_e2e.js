import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  console.log('1. Navigating to login...');
  await page.goto('http://localhost:8080/login');
  await page.waitForTimeout(1000);
  
  console.log('2. Logging in...');
  await page.fill('input[type="email"]', 'mktfunil1@gmail.com');
  await page.fill('input[type="password"]', 'Mktfunil8563*');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);

  console.log('3. Navigating to /agente...');
  await page.goto('http://localhost:8080/agente');
  await page.waitForTimeout(2000);

  console.log('4. Sending question to Oficina GPT...');
  await page.focus('textarea');
  await page.fill('textarea', 'quais os detalhes da OS no rei do oleo maua?');
  await page.keyboard.press('Enter');
  
  console.log('5. Waiting 15s for AI response streaming...');
  await page.waitForTimeout(15000);

  await page.screenshot({ path: 'tela_agente_e2e.png', fullPage: true });
  console.log('Screenshot saved to tela_agente_e2e.png');
  await browser.close();
})();
