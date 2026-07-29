import { chromium, Browser, BrowserContext, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const TMP_DIR = path.join(__dirname, '../../tmp');

export interface OICredentials {
  username: string;
  password: string;
}

/**
 * Retry wrapper com backoff exponencial.
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 3, label = 'action'): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      if (attempt === retries) throw e;
      const wait = 2000 * attempt;
      console.warn(`[OI] ${label} falhou (tentativa ${attempt}/${retries}). Retry em ${wait}ms...`, e);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw new Error(`[OI] ${label} falhou após ${retries} tentativas`);
}

export async function loginOI(
  context: BrowserContext,
  credentials: OICredentials
): Promise<Page> {
  const page = await context.newPage();

  await page.goto('https://sistemaoficinainteligente.com.br', {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  });

  console.log('[OI] Verificando tela de login...');

  await withRetry(async () => {
    // Tenta encontrar o input de email. Se não achar em 5 segundos, assumimos que já logou
    try {
      await page.waitForSelector('input[name="Login1$UserName"], input[id="Login1_UserName"]', {
        timeout: 5_000,
      });
      console.log('[OI] Formulário encontrado. Inserindo credenciais...');
      await page.fill('input[name="Login1$UserName"], input[id="Login1_UserName"]', credentials.username);
      await page.fill('input[name="Login1$Password"], input[id="Login1_Password"]', credentials.password);
      await page.click('input[name="Login1$btnEntrar"], input[id="Login1_btnEntrar"]');
      // Aguarda redirecionamento para área autenticada
      await page.waitForURL((url) => !url.toString().includes('Entrar.aspx') && !url.toString().includes('login'), { timeout: 15_000 });
    } catch (e) {
      console.log('[OI] Formulário de login não encontrado. Assumindo que a sessão está ativa.');
    }
  }, 3, 'login OI');

  console.log('[OI] URL atual:', page.url());
  return page;
}

/**
 * Navega para o relatório de OS e faz download do XLSX para o dia alvo.
 * Retorna o caminho local do arquivo baixado.
 */
export async function downloadRelatorioOS(page: Page, targetDate: string): Promise<string> {
  if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR, { recursive: true });
  }

  const outputPath = path.join(TMP_DIR, `relatorio-oi-${targetDate}.xlsx`);

  console.log(`[OI] Navegando para relatório de OS do dia ${targetDate}...`);

  // ⚠️ ATENÇÃO: Os seletores abaixo são placeholders.
  // Use as gravações do vídeo para mapear os seletores reais do Oficina Inteligente.
  // Após explorar o portal com o bot em modo headed, atualize os seletores aqui.

  await withRetry(async () => {
    // TODO: Navegar para o menu de Relatórios
    // await page.click('[data-menu="relatorios"]');
    // await page.click('[data-submenu="os"]');

    // TODO: Preencher filtro de data
    // await page.fill('#data-inicio', targetDate);
    // await page.fill('#data-fim', targetDate);

    // TODO: Exportar e capturar o download
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 30_000 }),
      page.click('#btn-exportar-xlsx, .btn-export-excel, [title="Exportar Excel"]'),
    ]);

    await download.saveAs(outputPath);
    console.log(`[OI] XLSX baixado: ${outputPath}`);
  }, 3, 'download relatório OI');

  return outputPath;
}

export interface OSRecord {
  idInterno?: string;
  osNumber: string;
  cliente: string;
  placa: string;
  data: string;
  status: string;
  valor: string;
}

export async function fetchOSByNumber(page: Page, osNumber: string): Promise<OSRecord> {
  console.log(`[OI] Buscando OS ${osNumber}...`);

  await page.goto('https://sistemaoficinainteligente.com.br/wfOrdemDeServicoBusca.aspx', {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  });

  await withRetry(async () => {
    await page.fill('input[id*="txtOrdemDeServicoID"]', osNumber);

    console.log(`[OI] Acionando busca via AJAX UpdatePanel para OS ${osNumber}...`);
    const [response] = await Promise.all([
      page.waitForResponse(res => res.url().includes('wfOrdemDeServicoBusca.aspx') && res.status() === 200, { timeout: 30_000 }),
      page.click('input[id*="btnBuscar"]')
    ]);
    
    console.log(`[OI] AJAX Response recebida. Extraindo dados da GridView...`);
  }, 3, 'busca AJAX da OS');

  try {
    await page.waitForSelector('table[id*="grd"], table[id*="grd"]', { timeout: 10_000 });
  } catch (e) {
    const html = await page.content();
    require('fs').writeFileSync(path.join(__dirname, '../../tmp/debug_dom.html'), html);
    console.log('[OI] Timeout esperando a GridView. DOM salvo em tmp/debug_dom.html');
    throw e;
  }

  const rowLocator = page.locator('table[id*="grd"] tr:nth-child(2)');
  const rowCount = await rowLocator.count();
  if (rowCount === 0) {
    throw new Error(`OS não encontrada: ${osNumber}`);
  }

  const record = await rowLocator.first().evaluate((tr) => {
    const tds = tr.querySelectorAll('td');
    if (!tds || tds.length < 5) {
        throw new Error('Formato da tabela inesperado');
    }
    const texts = Array.from(tds).map(td => td.innerText.trim());
    
    return {
      _rawTexts: texts,
      osNumber: texts.find(t => t.match(/^\d+$/)) || texts[0] || '', // column 0
      data: texts[1] || '',
      cliente: texts[6] || '',
      placa: texts[5] || '',
      veiculo: texts[4] || '',
      valor: texts.find(t => t.includes('R$')) || '', // Valor pode estar oculto ou não no array de texto
      status: texts.length > 7 ? texts[texts.length - 1] : ''
    };
  });

  return {
    ...record,
    osNumber: osNumber,
  } as OSRecord & { _rawTexts?: string[], veiculo?: string };
}

export interface OSDetailedRecord {
  osNumber: string;
  loja: string;
  cliente: string;
  veiculo: string;
  responsavel: string;
  status: string;
  valorTotal: number;
  valorPago: number;
  itens: Array<{
    descricao: string;
    tipo: string;
    quantidade: number;
    valorTotal: number;
  }>;
  pagamentos: Array<{
    data: string;
    forma: string;
    valor: number;
  }>;
}

export async function fetchOSDetailedView(page: Page, osNumber: string): Promise<OSDetailedRecord> {
  console.log(`[OI-Detail] Buscando OS ${osNumber} para detalhamento completo...`);
  
  // 1. Usa a busca existente para chegar na grid
  await fetchOSByNumber(page, osNumber);

  // 2. Extrai a URL de detalhe a partir do evento onclick
  const linkLocator = page.locator('table[id*="grd"] tr:nth-child(2) a[id*="lkbOrdemDeServicoID"]').first();
  const onclickStr = await linkLocator.getAttribute('onclick');
  
  if (!onclickStr) {
    throw new Error('Não foi possível encontrar o link para abrir os detalhes da OS.');
  }

  // Espera algo como: fncNovaAba('wfOrdemDeServico.aspx?EmpresaID=...');
  const match = onclickStr.match(/'([^']+)'/);
  if (!match || !match[1]) {
    throw new Error(`Falha ao extrair URL de detalhe do onclick: ${onclickStr}`);
  }

  const detailUrl = `https://sistemaoficinainteligente.com.br/${match[1]}`;
  console.log(`[OI-Detail] Navegando para os detalhes: ${detailUrl}`);

  try {
    console.log('[OI-Detail] Aguardando page.goto...');
    await page.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    console.log('[OI-Detail] page.goto concluído com sucesso!');
  } catch (e: any) {
    console.log('[OI-Detail] Erro no page.goto:', e.message);
    try {
      const html = await page.content();
      const tmpPath = require('path').join(__dirname, '../../tmp');
      if (!require('fs').existsSync(tmpPath)) require('fs').mkdirSync(tmpPath, { recursive: true });
      require('fs').writeFileSync(require('path').join(tmpPath, 'debug_detail_error.html'), html);
    } catch (err) {
      console.log('[OI-Detail] Erro ao salvar DOM de debug:', err);
    }
    throw e;
  }

  // 3. Raspar cabeçalho (OS, cliente, veiculo, responsavel, status, valorTotal)
  console.log('[OI-Detail] Aguardando lblCliente...');
  await page.waitForSelector('span[id*="lblCliente"]', { timeout: 3_000 }).catch(() => null);
  console.log('[OI-Detail] Passou do waitForSelector. Salvando DOM...');
  try {
    const html = await page.content();
    const tmpPath = require('path').join(__dirname, '../../tmp');
    if (!require('fs').existsSync(tmpPath)) require('fs').mkdirSync(tmpPath, { recursive: true });
    require('fs').writeFileSync(require('path').join(tmpPath, 'debug_detail.html'), html);
  } catch (err) {
    console.log('[OI-Detail] Erro ao salvar DOM de debug:', err);
  }

  // Fallbacks genéricos caso os IDs variem. Isso pode precisar de ajuste dependendo do HTML real.
  const cliente = await page.locator('span[id*="lblCliente"]').textContent().catch(() => '') || '';
  const veiculo = await page.locator('span[id*="lblVeiculo"]').textContent().catch(() => '') || '';
  const responsavel = await page.locator('span[id*="lblResponsavel"], select[id*="ddlResponsavel"] option[selected]').textContent().catch(() => '') || '';
  const status = await page.locator('span[id*="lblStatus"], select[id*="ddlStatusOrdemDeServico"] option[selected]').textContent().catch(() => '') || '';
  const valorTotalStr = await page.locator('span[id*="lblTotalDaOS"], span[id*="lblValorTotal"]').textContent().catch(() => '') || '0';
  
  const parseCurrency = (val: string) => {
    const clean = val.replace(/R\$\s*/g, '').replace(/\./g, '').replace(/,/g, '.').trim();
    return parseFloat(clean) || 0;
  };

  const valorTotal = parseCurrency(valorTotalStr);

  // 4. Raspar Produtos e Serviços
  // Assumindo que pode estar numa tabela específica.
  const itens = [];
  const gridItens = page.locator('table[id*="grdServicosProdutos"] tr'); // Placeholder ID
  const numItens = await gridItens.count().catch(() => 0);
  for (let i = 1; i < numItens; i++) {
    const tds = gridItens.nth(i).locator('td');
    const tdCount = await tds.count();
    if (tdCount > 4) {
       const descricao = await tds.nth(1).textContent().catch(() => '') || '';
       const valorStr = await tds.nth(tdCount - 1).textContent().catch(() => '') || '0';
       if (descricao.trim()) {
         itens.push({
           descricao: descricao.trim(),
           tipo: 'Misto',
           quantidade: 1,
           valorTotal: parseCurrency(valorStr)
         });
       }
    }
  }

  // 5. Raspar Pagamentos (Financeiro da OS)
  const pagamentos = [];
  const gridPagamentos = page.locator('table[id*="grdFinanceiro"], table[id*="grdPagamentos"] tr'); // Placeholder ID
  const numPagamentos = await gridPagamentos.count().catch(() => 0);
  let valorPago = 0;
  for (let i = 1; i < numPagamentos; i++) {
    const tds = gridPagamentos.nth(i).locator('td');
    const tdCount = await tds.count();
    if (tdCount > 3) {
       const data = await tds.nth(1).textContent().catch(() => '') || '';
       const forma = await tds.nth(2).textContent().catch(() => '') || '';
       const valorStr = await tds.nth(tdCount - 1).textContent().catch(() => '') || '0';
       const valor = parseCurrency(valorStr);
       if (valor > 0) {
         valorPago += valor;
         pagamentos.push({
           data: data.trim(),
           forma: forma.trim(),
           valor
         });
       }
    }
  }

  return {
    osNumber,
    loja: 'Principal', // placeholder
    cliente: cliente.trim(),
    veiculo: veiculo.trim(),
    responsavel: responsavel.trim(),
    status: status.trim(),
    valorTotal,
    valorPago,
    itens,
    pagamentos
  };
}
