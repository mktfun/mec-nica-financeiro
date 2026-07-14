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

/**
 * Faz login no Oficina Inteligente e retorna o contexto autenticado.
 * Reutiliza sessão se disponível.
 */
export async function loginOI(
  context: BrowserContext,
  credentials: OICredentials
): Promise<Page> {
  const page = await context.newPage();

  await page.goto('https://sistemaoficinainteligente.com.br', {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  });

  // Se já está logado (sessão injetada), retorna direto
  if (!page.url().includes('login') && !page.url().includes('entrar')) {
    console.log('[OI] Sessão ativa — pulando login.');
    return page;
  }

  console.log('[OI] Fazendo login...');

  await withRetry(async () => {
    // Preenche credenciais
    await page.waitForSelector('input[type="email"], input[name="email"], input[name="login"]', {
      timeout: 15_000,
    });
    await page.fill('input[type="email"], input[name="email"], input[name="login"]', credentials.username);
    await page.fill('input[type="password"]', credentials.password);
    await page.click('button[type="submit"], input[type="submit"]');
    // Aguarda redirecionamento para área autenticada
    await page.waitForURL((url) => !url.toString().includes('login'), { timeout: 15_000 });
  }, 3, 'login OI');

  console.log('[OI] Login realizado com sucesso. URL:', page.url());
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
