import { chromium } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';

import { loginOI } from '../scrapers/oficina';
import { getBotCredentials } from '../sync/supabaseUploader';

async function testOsQuery() {
  let oiCreds: any = null;
  try {
    oiCreds = await getBotCredentials('oficina_inteligente');
  } catch(e) {
    console.error('Erro ao buscar credenciais:', e);
    process.exit(1);
  }

  if (!oiCreds || !oiCreds.username) {
    console.error('Error: Credenciais da OI não encontradas no Supabase.');
    process.exit(1);
  }

  const browser = await chromium.launch({ 
    headless: true, // Must be true in docker
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }); 
  const context = await browser.newContext();

  try {
    console.log(`Logando com usuário: ${oiCreds.username}`);
    const page = await loginOI(context, { username: oiCreds.username, password: oiCreds.password });
    
    console.log('Login successful, URL:', page.url());

    console.log('Aguardando painel inicial...');
    await page.waitForTimeout(5000);
    
    console.log('Buscando OS 1763 na Busca Rápida...');
    await page.fill('#ctl00_txtMenuBuscaRapida', '1763');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle' }),
      page.click('#ctl00_btnMenuBuscaRapida')
    ]);

    console.log('Navegação concluída! URL atual:', page.url());

    const screenshotPath = path.join(__dirname, 'oi-os-1763.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log('Screenshot saved to oi-os-1763.png');

    const html = await page.content();
    fs.writeFileSync(path.join(__dirname, 'oi-os-1763.html'), html);
    console.log('HTML saved to oi-os-1763.html');

  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    await browser.close();
  }
}

testOsQuery();
