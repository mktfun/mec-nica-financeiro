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

  console.log('3.1 Clicking Nova Conversa...');
  await page.click('button:has-text("Nova Conversa")');
  await page.waitForTimeout(1000);

  console.log('4. Sending question with OS 22551 to Oficina GPT...');
  await page.focus('textarea');
  await page.fill('textarea', 'quais os detalhes da OS 22551 no rei do oleo maua?');
  await page.keyboard.press('Enter');
  
  console.log('5. Waiting 10s for first AI response...');
  await page.waitForTimeout(10000);

  console.log('6. Asking follow-up question: de onde vc puxou essa informação??...');
  await page.focus('textarea');
  await page.fill('textarea', 'de onde vc puxou essa informação??');
  await page.keyboard.press('Enter');

  console.log('7. Waiting 10s for provenance AI response...');
  await page.waitForTimeout(10000);

  await page.screenshot({ path: 'tela_agente_e2e.png', fullPage: true });
  console.log('Screenshot 1 (Data Provenance) saved to tela_agente_e2e.png');

  console.log('8. Clicking Nova Conversa to test history isolation...');
  await page.click('button:has-text("Nova Conversa")');
  await page.waitForTimeout(2000);

  await page.screenshot({ path: 'tela_agente_f5_e2e.png', fullPage: true });
  console.log('Screenshot 2 (Nova Conversa Isolated) saved to tela_agente_f5_e2e.png');

  await browser.close();
})();
