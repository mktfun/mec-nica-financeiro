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

  const browser = await chromium.launch({ 
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }); 
  const context = await browser.newContext();

  try {
    const page = await loginOI(context, { username: oiCreds.username, password: oiCreds.password });
    await page.waitForTimeout(3000);
    
    console.log('Navigating to wfOrdemDeServicoBusca.aspx...');
    await page.goto('https://sistemaoficinainteligente.com.br/wfOrdemDeServicoBusca.aspx', { waitUntil: 'networkidle' });
    
    console.log('Filling search form with OS 1763...');
    await page.fill('#ctl00_cph_txtOrdemDeServicoID', '1763');
    
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle' }),
      page.click('#ctl00_cph_btnBuscar')
    ]);

    console.log('Search completed, extracting table data...');
    // The grid is likely a table with class containing "GridView" or id containing "gdv"
    const gridHtml = await page.evaluate(() => {
       const grid = document.querySelector('table[id*="gdv"]');
       return grid ? grid.outerHTML : 'Table not found';
    });

    fs.writeFileSync(path.join(__dirname, 'oi-os-result.html'), gridHtml);
    console.log('Saved oi-os-result.html');

  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    await browser.close();
  }
}

testOsQuery();
