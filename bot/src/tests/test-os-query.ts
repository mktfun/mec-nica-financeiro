import { chromium } from 'playwright';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
dotenv.config({ path: path.join(__dirname, '../../../.env') }); // Carrega o .env principal do projeto

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

  const browser = await chromium.launch({ headless: false }); // Headed para ver o fluxo!
  const context = await browser.newContext();

  try {
    console.log(`Logando com usuário: ${oiCreds.username}`);
    const page = await loginOI(context, { username: oiCreds.username, password: oiCreds.password });
    
    console.log('Login successful, URL:', page.url());

    console.log('Aguardando 10 segundos para carregar o painel inicial...');
    await page.waitForTimeout(10000);
    
    const screenshotPath = path.join(__dirname, 'oi-home.png');
    await page.screenshot({ path: screenshotPath });
    console.log('Screenshot of home page saved to oi-home.png');

    const html = await page.content();
    fs.writeFileSync(path.join(__dirname, 'oi-home.html'), html);
    console.log('HTML of home page saved to oi-home.html');

  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    await browser.close();
  }
}

testOsQuery();
