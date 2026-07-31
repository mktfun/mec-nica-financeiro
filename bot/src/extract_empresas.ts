import { chromium } from '@playwright/test';
import { loginOI } from './scrapers/oficina';
import { getBotCredentials } from './sync/supabaseUploader';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function run() {
  console.log('🔄 Buscando credenciais...');
  const oiCreds = await getBotCredentials('oficina_inteligente');
  if (!oiCreds?.username) {
    throw new Error('Credenciais do Oficina Inteligente não configuradas.');
  }

  console.log('🌐 Iniciando navegador...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  
  console.log('🔑 Fazendo login no Oficina Inteligente...');
  const page = await loginOI(context, { username: oiCreds.username, password: oiCreds.password });

  console.log('Navegando para Contas a Pagar para garantir que o menu superior renderize...');
  await page.goto('https://sistemaoficinainteligente.com.br/wfContaBuscaPagar.aspx', { waitUntil: 'networkidle' });

  console.log('🔎 Localizando dropdown de empresas...');
  // O dropdown pode ter um ID dinâmico, vamos buscar qualquer select que tenha a palavra "Empresa" no ID ou class
  // Ou simplesmente buscar todos os selects e ver qual tem as lojas.
  const selects = await page.$$('select');
  let empresasOptions: {value: string, text: string}[] = [];
  
  for (const select of selects) {
      const options = await select.$$eval('option', opts => opts.map(o => ({ value: (o as HTMLOptionElement).value, text: (o as HTMLOptionElement).textContent?.trim() || '' })));
      if (options.some(o => o.text.toUpperCase().includes('JABAQUARA') || o.text.toUpperCase().includes('BRASICAR'))) {
          empresasOptions = options;
          break;
      }
  }

  if (empresasOptions.length === 0) {
      console.log('Salvando snapshot da tela...');
      await page.screenshot({ path: 'debug_dropdown.png' });
      const html = await page.content();
      fs.writeFileSync('debug_dropdown.html', html, 'utf8');
      throw new Error('Não foi possível encontrar o dropdown de empresas.');
  }

  console.log(`✅ Encontradas ${empresasOptions.length} empresas no dropdown.`);
  console.log(empresasOptions);

  const jsonPath = path.join(__dirname, 'config/empresas.json');
  const empresasJson = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  let updatedCount = 0;
  for (const storeId of Object.keys(empresasJson)) {
    const config = empresasJson[storeId];
    // Tenta encontrar a empresa pelo nome
    const match = empresasOptions.find(opt => 
      opt.text.toUpperCase().includes(config.nome_display.toUpperCase()) ||
      config.aliases.some((alias: string) => opt.text.toUpperCase().includes(alias.toUpperCase()))
    );

    if (match) {
      console.log(`  -> Match: ${config.nome_display} => ID: ${match.value} (${match.text})`);
      config.id_empresa_oi = match.value;
      updatedCount++;
    } else {
      console.log(`  -> SEM MATCH: ${config.nome_display}`);
    }
  }

  if (updatedCount > 0) {
    fs.writeFileSync(jsonPath, JSON.stringify(empresasJson, null, 2), 'utf8');
    console.log(`\n💾 ${updatedCount} empresas atualizadas e salvas em empresas.json`);
  }

  await browser.close();
  console.log('🏁 Finalizado com sucesso.');
}

run().catch(err => {
  console.error('❌ Erro:', err);
  process.exit(1);
});
