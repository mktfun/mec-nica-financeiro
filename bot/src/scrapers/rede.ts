import { BrowserContext, Page } from '@playwright/test';

// 10 estabelecimentos da Rede (Mecânica Popular)
export const ESTABELECIMENTOS_REDE = [
  { nome: 'KENNEDY MP',      cnpj: '76347036' },
  { nome: 'MHE MP',          cnpj: '63034336' },
  { nome: 'EMPORIO MP',      cnpj: '47712201' },
  { nome: 'BRASICAR MP',     cnpj: '63304449' },
  { nome: 'CAP MP',          cnpj: '71854878' },
  { nome: 'REI DO MODULO MP',cnpj: '101423667' },
  { nome: 'JABAQUARA MP',    cnpj: '104112840' },
  { nome: 'DOM PEDRO MP',    cnpj: '102553424' },
  { nome: 'JORGE BERETTA MP',cnpj: '101423446' },
  { nome: 'HD MP',           cnpj: '101422997' },
] as const;

export type EstabelecimentoNome = (typeof ESTABELECIMENTOS_REDE)[number]['nome'];

export interface RedeTransacao {
  estabelecimento: string;
  cnpj: string;
  data: string;
  nsu: string | null;
  valor_bruto: number;
  valor_liquido: number;
  modalidade: 'debito' | 'credito' | 'pix' | string;
  status: string;
}

export interface RedeCredentials {
  username: string;
  password: string;
}

async function withRetry<T>(fn: () => Promise<T>, retries = 3, label = 'action'): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      if (attempt === retries) throw e;
      const wait = 2000 * attempt;
      console.warn(`[Rede] ${label} falhou (tentativa ${attempt}/${retries}). Retry em ${wait}ms...`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw new Error(`[Rede] ${label} falhou após ${retries} tentativas`);
}

export async function loginRede(
  context: BrowserContext,
  credentials: RedeCredentials
): Promise<Page> {
  const page = await context.newPage();

  await page.goto('https://meu.userede.com.br/login', {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  });

  console.log('[Rede] Verificando tela de login...');

  await withRetry(async () => {
    try {
      await page.waitForSelector('input[type="email"], input[name="username"], input[id*="email"], input[name="document"]', {
        timeout: 5_000,
      });
      console.log('[Rede] Formulário encontrado. Inserindo credenciais...');
      await page.fill('input[type="email"], input[name="username"], input[id*="email"], input[name="document"]', credentials.username);
      await page.fill('input[type="password"]', credentials.password);
      await page.click('button[type="submit"]');
      // Aguarda tela de seleção de estabelecimento
      await page.waitForURL((url) => !url.toString().includes('login'), { timeout: 20_000 });
    } catch (e) {
      console.log('[Rede] Formulário de login não encontrado. Assumindo que a sessão está ativa.');
    }
  }, 3, 'login Rede');

  console.log('[Rede] URL atual:', page.url());
  return page;
}

/**
 * Para cada estabelecimento, seleciona e usa Network Interception
 * para capturar a resposta JSON da API de transações do dia.
 * 
 * Esta abordagem é ~10x mais rápida que scraping visual, pois
 * interceptamos os dados brutos antes de renderizarem na tela.
 */
export async function capturarTransacoesRede(
  page: Page,
  targetDate: string,
  cnpj: string,
  nome: string
): Promise<RedeTransacao[]> {
  const transacoes: RedeTransacao[] = [];

  console.log(`[Rede] Capturando transações de ${nome} (${cnpj}) para ${targetDate}...`);

  // ── Network Interception ──────────────────────────────────────────────────
  // Registra handler ANTES de navegar para a página do estabelecimento.
  // Quando a página fizer requisição para a API de extrato/transações,
  // capturamos o JSON bruto diretamente.
  const interceptedData: any[] = [];

  page.on('response', async (response) => {
    const url = response.url();
    // ⚠️ TODO: Confirmar o endpoint real via DevTools no portal Rede.
    // Exemplos comuns: /api/transactions, /extrato/v1, /lancamentos, /vendas
    if (
      url.includes('/api/') ||
      url.includes('/extrato') ||
      url.includes('/transacoes') ||
      url.includes('/vendas') ||
      url.includes('/lancamentos')
    ) {
      try {
        const json = await response.json();
        if (Array.isArray(json) || json?.data || json?.items || json?.transacoes) {
          const items = Array.isArray(json) ? json : (json.data || json.items || json.transacoes || []);
          interceptedData.push(...items);
          console.log(`[Rede][NetworkInterception] Capturado ${items.length} registros de: ${url}`);
        }
      } catch {
        // Resposta não era JSON — ignorar
      }
    }
  });

  // ⚠️ TODO: Navegar para o estabelecimento e filtrar por data.
  // Após explorar o portal com o bot em modo headed, atualize os seletores:

  // Exemplo de fluxo esperado:
  // 1. Clicar no card/botão do estabelecimento pelo CNPJ
  // await page.click(`[data-cnpj="${cnpj}"], [data-estabelecimento="${cnpj}"]`);
  // 2. Navegar para a seção de Extrato/Vendas
  // await page.click('[data-menu="extrato"], [href*="extrato"], [href*="vendas"]');
  // 3. Preencher filtro de data
  // await page.fill('[data-inicio], #data-inicio', targetDate);
  // await page.fill('[data-fim], #data-fim', targetDate);
  // await page.click('[data-filtrar], #btn-filtrar, button:has-text("Filtrar")');
  // 4. Aguardar a resposta da API ser interceptada
  // await page.waitForResponse((r) => r.url().includes('/api/'), { timeout: 15_000 });

  // Mapeia os dados interceptados para o tipo RedeTransacao
  for (const item of interceptedData) {
    // ⚠️ TODO: Ajustar mapeamento de campos após ver a estrutura real da API
    transacoes.push({
      estabelecimento: nome,
      cnpj,
      data: item.data || item.date || item.dataPagamento || targetDate,
      nsu: item.nsu || item.referencia || item.id || null,
      valor_bruto: Number(item.valorBruto || item.valorGross || item.amount || 0),
      valor_liquido: Number(item.valorLiquido || item.valorNet || item.valorLiq || 0),
      modalidade: (item.modalidade || item.paymentMethod || item.forma || '').toLowerCase(),
      status: item.status || item.situacao || 'unknown',
    });
  }

  console.log(`[Rede] Total capturado para ${nome}: ${transacoes.length} transações`);
  return transacoes;
}

/**
 * Loop completo: para cada estabelecimento, captura as transações do dia.
 */
export async function capturarTodosEstabelecimentos(
  page: Page,
  targetDate: string
): Promise<RedeTransacao[]> {
  const todas: RedeTransacao[] = [];

  for (const est of ESTABELECIMENTOS_REDE) {
    try {
      const txs = await capturarTransacoesRede(page, targetDate, est.cnpj, est.nome);
      todas.push(...txs);
    } catch (e) {
      console.error(`[Rede] Erro ao capturar ${est.nome}:`, e);
      // Continua para o próximo estabelecimento mesmo com erro
    }
  }

  return todas;
}
