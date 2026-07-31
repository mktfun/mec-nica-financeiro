const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Indo para login...');
  await page.goto('http://localhost:8080/login', { timeout: 60000 });
  
  await page.fill('input[type="email"]', 'mktfunil1@gmail.com');
  await page.fill('input[type="password"]', 'Mktfunil8563*');
  
  console.log('Tirando screenshot antes de clicar...');
  await page.screenshot({ path: 'tela_login_antes.png' });

  await page.click('button[type="submit"]');

  console.log('Aguardando 5s...');
  await page.waitForTimeout(5000);

  console.log('Tirando screenshot do resultado do login...');
  await page.screenshot({ path: 'tela_login_depois.png' });
  
  // Try to force navigation if it didn't redirect automatically
  // (In case the app is just broken or we need to go to agente manually after login)
  console.log('Indo para agente diretamente...');
  await page.goto('http://localhost:8080/agente', { timeout: 30000 });
  
  await page.waitForSelector('text=Oficina GPT', { timeout: 15000 });
  
  // Wait a bit for animations
  await page.waitForTimeout(2000);

  console.log('Tirando screenshot do estado inicial...');
  await page.screenshot({ path: 'tela_inicial.png', fullPage: true });

  console.log('Enviando mensagem para a IA...');
  await page.fill('textarea, input[type="text"]', 'quais os detalhes da OS 22549 no rei do oleo');
  await page.keyboard.press('Enter');

  console.log('Aguardando resposta da IA (15s)...');
  await page.waitForTimeout(15000);

  console.log('Tirando screenshot do chat...');
  await page.screenshot({ path: 'tela_chat.png', fullPage: true });

  await browser.close();
  console.log('Concluido.');
})();
