import { chromium, Browser, Page } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';
import { STORES_CANONICAL_MAP, getStoreByOI } from '../config/storesMap';

export interface OSPartItem {
  tipo: 'PRODUTO' | 'SERVICO';
  codigo?: string;
  referencia?: string;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  executor?: string;
}

export interface OSDeepDetail {
  numero_os: string;
  data_os: string;
  data_fechamento?: string;
  cliente: string;
  veiculo: string;
  placa: string;
  status: string;
  valor_total: number;
  valor_pago: number;
  valor_pecas: number;
  valor_servicos: number;
  itens: OSPartItem[];
  laudo_cliente?: string;
  store_id: string;
  store_name: string;
  id_oi: string;
}

function parseDinheiro(txt: string): number {
  if (!txt) return 0;
  const clean = txt.replace('R$', '').replace(/\./g, '').replace(',', '.').replace('%', '').trim();
  return parseFloat(clean) || 0;
}

export async function trocarEmpresa(page: Page, targetValue: string): Promise<boolean> {
  const ok = await page.evaluate(`
    ((val) => {
      const lbl = document.getElementById('lblSiglaEmpresa');
      if (lbl) lbl.click();
      const select = document.getElementById('ddlTrocarEmpresa');
      if (!select) return false;
      select.value = val;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      const btn = document.getElementById('ctl00_btnTrocarEmpresa');
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    })('${targetValue}')
  `);
  if (ok) {
    await page.waitForTimeout(3000);
    return true;
  }
  return false;
}

export async function extractStoreDeepOS(page: Page, id_oi: string, storeName: string): Promise<OSDeepDetail[]> {
  const mapping = getStoreByOI(id_oi);
  const store_id = mapping ? mapping.store_id : `st-${id_oi}`;

  console.log(`[Crawler] Acessando busca de OS para ${storeName} (ID ${id_oi})...`);
  await page.goto('https://sistemaoficinainteligente.com.br/os/busca', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Filtrar por Abertas
  await page.evaluate(`
    (() => {
      const ddl = document.getElementById('ctl00_cphConteudo_ddlStatus');
      if (ddl) {
        ddl.value = '1'; // Abertas
        ddl.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const btn = document.getElementById('ctl00_cphConteudo_btnBuscar');
      if (btn) btn.click();
    })()
  `);
  await page.waitForTimeout(3500);

  // Extrai lista básica
  const rawList: any[] = await page.evaluate(`
    (() => {
      const rows = Array.from(document.querySelectorAll('#ctl00_cphConteudo_gvOrdensServico tr')).slice(1);
      return rows.map(r => {
        const cols = Array.from(r.querySelectorAll('td')).map(c => c.innerText.trim());
        const linkElem = r.querySelector('a[href*="os/detalhe"]');
        const href = linkElem ? linkElem.getAttribute('href') : null;
        return {
          numero_os: cols[0] || '',
          data_os: cols[1] || '',
          cliente: cols[2] || '',
          veiculo: cols[3] || '',
          placa: cols[4] || '',
          status: cols[5] || 'Aberta',
          valor_total: cols[6] || '0',
          href: href
        };
      }).filter(x => x.numero_os && x.numero_os !== '');
    })()
  `);

  console.log(`[Crawler] Loja ${storeName}: ${rawList.length} OSs abertas na grade.`);
  const fullDetails: OSDeepDetail[] = [];

  for (const basic of rawList) {
    let targetUrl = basic.href 
      ? `https://sistemaoficinainteligente.com.br${basic.href.startsWith('/') ? '' : '/'}${basic.href}`
      : `https://sistemaoficinainteligente.com.br/os/detalhe?id=${basic.numero_os}`;

    try {
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(1800);

      const osData: any = await page.evaluate(`
        (() => {
          const getVal = (id) => {
            const el = document.getElementById(id);
            return el ? el.innerText.trim() : '';
          };
          const getInp = (id) => {
            const el = document.getElementById(id);
            return el ? el.value.trim() : '';
          };

          const laudo = getVal('ctl00_cphConteudo_txtDefeitoReclamado') || getInp('ctl00_cphConteudo_txtDefeitoReclamado');
          const totalPecas = getVal('ctl00_cphConteudo_lblTotalProdutos') || getVal('ctl00_cphConteudo_lblTotalPecas');
          const totalServicos = getVal('ctl00_cphConteudo_lblTotalServicos');
          const totalGeral = getVal('ctl00_cphConteudo_lblValorTotal') || getVal('ctl00_cphConteudo_lblTotalOS');

          const extractGrid = (tableId, tipo) => {
            const tbl = document.getElementById(tableId);
            if (!tbl) return [];
            const rows = Array.from(tbl.querySelectorAll('tr')).slice(1);
            return rows.map(r => {
              const cells = Array.from(r.querySelectorAll('td')).map(c => c.innerText.trim());
              if (cells.length < 4) return null;
              return {
                tipo: tipo,
                codigo: cells[0] || '',
                referencia: cells[1] || '',
                descricao: cells[2] || '',
                quantidade: cells[3] || '1',
                valor_unitario: cells[4] || '0',
                valor_total: cells[5] || cells[4] || '0',
                executor: cells[6] || cells[7] || ''
              };
            }).filter(Boolean);
          };

          const produtos = extractGrid('ctl00_cphConteudo_gvProdutos', 'PRODUTO');
          const servicos = extractGrid('ctl00_cphConteudo_gvServicos', 'SERVICO');

          return {
            laudo,
            totalPecas,
            totalServicos,
            totalGeral,
            itens: [...produtos, ...servicos]
          };
        })()
      `);

      const parsedItens: OSPartItem[] = (osData.itens || []).map((it: any) => ({
        tipo: it.tipo,
        codigo: it.codigo,
        referencia: it.referencia,
        descricao: it.descricao,
        quantidade: parseFloat(it.quantidade.replace(',', '.')) || 1,
        valor_unitario: parseDinheiro(it.valor_unitario),
        valor_total: parseDinheiro(it.valor_total),
        executor: it.executor || undefined
      }));

      fullDetails.push({
        numero_os: basic.numero_os,
        data_os: basic.data_os,
        cliente: basic.cliente,
        veiculo: basic.veiculo,
        placa: basic.placa,
        status: basic.status,
        valor_total: parseDinheiro(osData.totalGeral) || parseDinheiro(basic.valor_total),
        valor_pago: 0,
        valor_pecas: parseDinheiro(osData.totalPecas),
        valor_servicos: parseDinheiro(osData.totalServicos),
        itens: parsedItens,
        laudo_cliente: osData.laudo || undefined,
        store_id: store_id,
        store_name: storeName,
        id_oi: id_oi
      });

    } catch (err) {
      console.warn(`[Crawler] Erro ao carregar detalhe da OS ${basic.numero_os}:`, err);
    }
  }

  return fullDetails;
}

export async function extractAllStoresLive(): Promise<OSDeepDetail[]> {
  const OI_USER = process.env.OI_USER || process.env.OFICINA_USER || 'mvinyciusp@gmail.com';
  const OI_PASS = process.env.OI_PASS || process.env.OFICINA_PASSWORD || 'Vinymark005@';

  console.log('[Crawler] Iniciando navegador Chromium para extração de toda a rede...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36'
  });

  const page = await context.newPage();
  await page.goto('https://sistemaoficinainteligente.com.br', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Login se necessário
  const needLogin = await page.evaluate(`(() => !!document.getElementById('Login1_UserName'))()`);
  if (needLogin) {
    console.log('[Crawler] Efetuando login...');
    await page.fill('#Login1_UserName', OI_USER);
    await page.fill('#Login1_Password', OI_PASS);
    await page.click('#Login1_LoginButton');
    await page.waitForTimeout(4000);
  }

  const allNetworkOS: OSDeepDetail[] = [];
  const storeEntries = Object.entries(STORES_CANONICAL_MAP);

  for (const [id_oi, storeInfo] of storeEntries) {
    if (id_oi === '2040') continue; // Skip master internal

    console.log(`\n======================================================`);
    console.log(`🏬 Alternando para loja: ${storeInfo.nome_loja} (${id_oi})`);
    console.log(`======================================================`);

    const switched = await trocarEmpresa(page, id_oi);
    if (!switched) {
      console.warn(`[Crawler] Não foi possível alternar para ${storeInfo.nome_loja}`);
      continue;
    }

    const storeOSs = await extractStoreDeepOS(page, id_oi, storeInfo.nome_loja);
    allNetworkOS.push(...storeOSs);
    console.log(`[Crawler] ✅ ${storeInfo.nome_loja}: ${storeOSs.length} OSs extraídas com itens.`);
  }

  await browser.close();
  return allNetworkOS;
}
