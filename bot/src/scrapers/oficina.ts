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

// ─────────────────────────────────────────────────────────────────────────────
// NOVOS DOMÍNIOS — Tipos e Scrapers
// ─────────────────────────────────────────────────────────────────────────────

export interface ContaPagar {
  id_interno: string;
  fornecedor: string;
  plano_contas: string;
  valor_original: number;
  valor_em_aberto: number;
  vencimento: string;
  status: string;
}

export interface ContaReceber {
  id_interno: string;
  cliente: string;
  descricao: string;
  valor_original: number;
  valor_em_aberto: number;
  vencimento: string;
  status: string;
}

export interface AgendaItem {
  os_number?: string;
  descricao: string;
  data: string;
  hora: string;
  responsavel?: string;
  placa?: string;
  status: string;
}

export interface StatusOS {
  id: string;
  descricao: string;
}

export interface FormaPagamento {
  id: string;
  descricao: string;
  ativo: boolean;
}

export interface FiltrosFinanceiro {
  lojaSlug?: string;
  vencimentoInicio?: string;
  vencimentoFim?: string;
  status?: string;
}

export interface FiltrosAgenda {
  lojaSlug?: string;
  dataInicio: string;
  dataFim: string;
}

/**
 * Troca de empresa ativa no Oficina Inteligente via dropdown.
 * idEmpresaOI é o valor do <option> no select de empresas.
 * Se idEmpresaOI for "DESCOBRIR" ou vazio, não faz nada (usa empresa atual).
 */
export async function ensureCompany(page: Page, idEmpresaOI: string): Promise<void> {
  if (!idEmpresaOI || idEmpresaOI === 'DESCOBRIR') {
    console.log('[OI] ensureCompany: idEmpresaOI não configurado, usando empresa ativa.');
    return;
  }

  try {
    // Dropdown de empresa — seletor genérico do Oficina Inteligente
    const ddlSelector = 'select[id*="ddlEmpresa"], select[name*="ddlEmpresa"]';
    const ddlExists = await page.$(ddlSelector);
    if (!ddlExists) {
      console.log('[OI] ensureCompany: dropdown de empresa não encontrado na tela atual.');
      return;
    }

    const currentVal = await page.$eval(ddlSelector, (el: HTMLSelectElement) => el.value);
    if (currentVal === idEmpresaOI) {
      console.log(`[OI] ensureCompany: empresa ${idEmpresaOI} já está selecionada.`);
      return;
    }

    console.log(`[OI] ensureCompany: trocando para empresa ${idEmpresaOI}...`);
    await page.selectOption(ddlSelector, idEmpresaOI);

    // Aguarda possível postback (ASP.NET WebForms)
    await page.waitForTimeout(1500);
    console.log(`[OI] ensureCompany: empresa ${idEmpresaOI} selecionada.`);
  } catch (e: any) {
    console.warn('[OI] ensureCompany: erro ao trocar empresa:', e.message);
  }
}

/**
 * Extrai linhas de uma grid ASP.NET (table[id*="grd"]) como array de objetos.
 * Retorna [] se a grid não for encontrada (não lança exceção).
 */
async function extractGrid(page: Page, gridSelectorHint = 'grd'): Promise<Record<string, string>[]> {
  try {
    const tableSelector = `table[id*="${gridSelectorHint}"]`;
    await page.waitForSelector(tableSelector, { timeout: 10_000 });

    return await page.$$eval(tableSelector, (tables) => {
      const table = tables[0];
      if (!table) return [];

      const headers: string[] = [];
      const headerCells = table.querySelectorAll('thead tr th, tr:first-child th');
      headerCells.forEach((th) => headers.push(th.textContent?.trim() || ''));

      const rows: Record<string, string>[] = [];
      const bodyRows = table.querySelectorAll('tbody tr, tr:not(:first-child)');
      bodyRows.forEach((tr) => {
        const cells = tr.querySelectorAll('td');
        if (cells.length === 0) return;
        const row: Record<string, string> = {};
        cells.forEach((td, i) => {
          const key = headers[i] || `col_${i}`;
          row[key] = td.textContent?.trim() || '';
        });
        rows.push(row);
      });
      return rows;
    });
  } catch (e: any) {
    console.warn(`[OI] extractGrid: grid "${gridSelectorHint}" não encontrada:`, e.message);
    return [];
  }
}

/**
 * Busca Contas a Pagar no Oficina via wfContaBuscaPagar.aspx.
 */
export async function fetchContasPagar(page: Page, filtros: FiltrosFinanceiro): Promise<ContaPagar[] | { warning: string; parcial: ContaPagar[] }> {
  try {
    console.log('[OI] fetchContasPagar: navegando para wfContaBuscaPagar.aspx...');
    await page.goto('https://sistemaoficinainteligente.com.br/wfContaBuscaPagar.aspx', {
      waitUntil: 'domcontentloaded', timeout: 30_000
    });

    if (filtros.vencimentoInicio) {
      const inputInicio = await page.$('input[id*="txtVencimentoInicio"], input[id*="txtDataInicio"]');
      if (inputInicio) await inputInicio.fill(filtros.vencimentoInicio.replace(/-/g, '/'));
    }
    if (filtros.vencimentoFim) {
      const inputFim = await page.$('input[id*="txtVencimentoFim"], input[id*="txtDataFim"]');
      if (inputFim) await inputFim.fill(filtros.vencimentoFim.replace(/-/g, '/'));
    }

    // Clica em buscar e aguarda resposta AJAX (UpdatePanel)
    const btnBuscar = await page.$('input[id*="btnBuscar"], button[id*="btnBuscar"]');
    if (btnBuscar) {
      await Promise.all([
        page.waitForResponse(res => res.url().includes('wfContaBuscaPagar') && res.status() === 200, { timeout: 20_000 }),
        btnBuscar.click()
      ]);
    }

    const rows = await extractGrid(page, 'grd');
    if (rows.length === 0) {
      return { warning: 'Nenhuma conta a pagar encontrada com os filtros informados.', parcial: [] };
    }

    const contas: ContaPagar[] = rows.map((r, i) => ({
      id_interno: r['Código'] || r['ID'] || String(i + 1),
      fornecedor: r['Fornecedor'] || r['Nome'] || '',
      plano_contas: r['Plano de Contas'] || r['Plano'] || '',
      valor_original: parseFloat((r['Valor'] || r['Valor Original'] || '0').replace(/[R$.\s]/g, '').replace(',', '.')) || 0,
      valor_em_aberto: parseFloat((r['Em Aberto'] || r['Saldo'] || '0').replace(/[R$.\s]/g, '').replace(',', '.')) || 0,
      vencimento: r['Vencimento'] || r['Dt Vencimento'] || '',
      status: r['Status'] || r['Situação'] || '',
    }));

    return contas;
  } catch (e: any) {
    return { warning: `Erro ao buscar contas a pagar: ${e.message}`, parcial: [] };
  }
}

/**
 * Busca Contas a Receber no Oficina via wfContaBuscaReceber.aspx.
 */
export async function fetchContasReceber(page: Page, filtros: FiltrosFinanceiro): Promise<ContaReceber[] | { warning: string; parcial: ContaReceber[] }> {
  try {
    console.log('[OI] fetchContasReceber: navegando para wfContaBuscaReceber.aspx...');
    await page.goto('https://sistemaoficinainteligente.com.br/wfContaBuscaReceber.aspx', {
      waitUntil: 'domcontentloaded', timeout: 30_000
    });

    if (filtros.vencimentoInicio) {
      const inputInicio = await page.$('input[id*="txtVencimentoInicio"], input[id*="txtDataInicio"]');
      if (inputInicio) await inputInicio.fill(filtros.vencimentoInicio.replace(/-/g, '/'));
    }
    if (filtros.vencimentoFim) {
      const inputFim = await page.$('input[id*="txtVencimentoFim"], input[id*="txtDataFim"]');
      if (inputFim) await inputFim.fill(filtros.vencimentoFim.replace(/-/g, '/'));
    }

    const btnBuscar = await page.$('input[id*="btnBuscar"], button[id*="btnBuscar"]');
    if (btnBuscar) {
      await Promise.all([
        page.waitForResponse(res => res.url().includes('wfContaBuscaReceber') && res.status() === 200, { timeout: 20_000 }),
        btnBuscar.click()
      ]);
    }

    const rows = await extractGrid(page, 'grd');
    if (rows.length === 0) {
      return { warning: 'Nenhuma conta a receber encontrada com os filtros informados.', parcial: [] };
    }

    const contas: ContaReceber[] = rows.map((r, i) => ({
      id_interno: r['Código'] || r['ID'] || String(i + 1),
      cliente: r['Cliente'] || r['Nome'] || '',
      descricao: r['Descrição'] || r['Histórico'] || '',
      valor_original: parseFloat((r['Valor'] || '0').replace(/[R$.\s]/g, '').replace(',', '.')) || 0,
      valor_em_aberto: parseFloat((r['Em Aberto'] || r['Saldo'] || '0').replace(/[R$.\s]/g, '').replace(',', '.')) || 0,
      vencimento: r['Vencimento'] || r['Dt Vencimento'] || '',
      status: r['Status'] || r['Situação'] || '',
    }));

    return contas;
  } catch (e: any) {
    return { warning: `Erro ao buscar contas a receber: ${e.message}`, parcial: [] };
  }
}

/**
 * Busca agenda (agendamentos) no Oficina via wfAgendaCalendario.aspx.
 */
export async function fetchAgenda(page: Page, filtros: FiltrosAgenda): Promise<AgendaItem[] | { warning: string; parcial: AgendaItem[] }> {
  try {
    console.log('[OI] fetchAgenda: navegando para wfAgendaCalendario.aspx...');
    await page.goto('https://sistemaoficinainteligente.com.br/wfAgendaCalendario.aspx', {
      waitUntil: 'domcontentloaded', timeout: 30_000
    });

    // Tenta preencher filtro de data inicial se existir
    const inputData = await page.$('input[id*="txtData"], input[id*="txtDataInicio"]');
    if (inputData && filtros.dataInicio) {
      await inputData.fill(filtros.dataInicio.replace(/-/g, '/'));
    }

    const btnBuscar = await page.$('input[id*="btnBuscar"], button[id*="btnBuscar"]');
    if (btnBuscar) await btnBuscar.click();
    await page.waitForTimeout(2000);

    const rows = await extractGrid(page, 'grd');
    if (rows.length === 0) {
      return { warning: 'Nenhum agendamento encontrado no período informado.', parcial: [] };
    }

    const agenda: AgendaItem[] = rows.map((r) => ({
      os_number: r['OS'] || r['Ordem de Serviço'] || undefined,
      descricao: r['Descrição'] || r['Serviço'] || '',
      data: r['Data'] || filtros.dataInicio,
      hora: r['Hora'] || r['Horário'] || '',
      responsavel: r['Responsável'] || r['Mecânico'] || undefined,
      placa: r['Placa'] || undefined,
      status: r['Status'] || r['Situação'] || '',
    }));

    return agenda;
  } catch (e: any) {
    return { warning: `Erro ao buscar agenda: ${e.message}`, parcial: [] };
  }
}

/**
 * Busca configurações de Status de OS no Oficina via wfStatusOrdemDeServico.aspx.
 */
export async function fetchConfigStatusOS(page: Page): Promise<StatusOS[] | { warning: string; parcial: StatusOS[] }> {
  try {
    console.log('[OI] fetchConfigStatusOS: navegando para wfStatusOrdemDeServico.aspx...');
    await page.goto('https://sistemaoficinainteligente.com.br/wfStatusOrdemDeServico.aspx', {
      waitUntil: 'domcontentloaded', timeout: 30_000
    });

    const rows = await extractGrid(page, 'grd');
    if (rows.length === 0) {
      return { warning: 'Nenhum status de OS encontrado.', parcial: [] };
    }

    return rows.map((r) => ({
      id: r['Código'] || r['ID'] || '',
      descricao: r['Descrição'] || r['Status'] || '',
    }));
  } catch (e: any) {
    return { warning: `Erro ao buscar status de OS: ${e.message}`, parcial: [] };
  }
}

/**
 * Busca configurações de Formas de Pagamento no Oficina via wfFormaDePagamento.aspx.
 */
export async function fetchConfigFormasPagamento(page: Page): Promise<FormaPagamento[] | { warning: string; parcial: FormaPagamento[] }> {
  try {
    console.log('[OI] fetchConfigFormasPagamento: navegando para wfFormaDePagamento.aspx...');
    await page.goto('https://sistemaoficinainteligente.com.br/wfFormaDePagamento.aspx', {
      waitUntil: 'domcontentloaded', timeout: 30_000
    });

    const rows = await extractGrid(page, 'grd');
    if (rows.length === 0) {
      return { warning: 'Nenhuma forma de pagamento encontrada.', parcial: [] };
    }

    return rows.map((r) => ({
      id: r['Código'] || r['ID'] || '',
      descricao: r['Descrição'] || r['Forma'] || '',
      ativo: (r['Ativo'] || r['Status'] || 'S').toUpperCase() !== 'N',
    }));
  } catch (e: any) {
    return { warning: `Erro ao buscar formas de pagamento: ${e.message}`, parcial: [] };
  }
}
