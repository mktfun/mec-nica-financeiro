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
  await page.waitForTimeout(3000);

  await page.screenshot({ path: 'tela_agente_ui_fix.png', fullPage: true });
  console.log('Screenshot saved to tela_agente_ui_fix.png');

  console.log('4. Clicking Prompt Input to test focus colors...');
  await page.focus('textarea');
  await page.waitForTimeout(1000);

  await page.screenshot({ path: 'tela_agente_ui_fix_focus.png', fullPage: true });
  console.log('Focus Screenshot saved to tela_agente_ui_fix_focus.png');

  console.log('5. Navigating to /custos...');
  await page.goto('http://localhost:8080/custos');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'tela_custos.png', fullPage: true });
  console.log('Screenshot saved to tela_custos.png');

  console.log('6. Navigating to /logs/motor...');
  await page.goto('http://localhost:8080/logs/motor');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'tela_logs_motor.png', fullPage: true });
  console.log('Screenshot saved to tela_logs_motor.png');

  await browser.close();
})();
