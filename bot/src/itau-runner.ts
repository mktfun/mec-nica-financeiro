import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { parseArgs } from 'node:util';
import { chromium } from '@playwright/test';
import { z } from 'zod';
import { ItauLoginPage } from './pages/itau-login.page';
import { ItauStatementPage } from './pages/itau-statement.page';
import { persistAndValidateOfx } from './lib/ofx-validator';
import { getBankBotCredentials, uploadOfxBufferToSupabase } from './sync/supabaseUploader';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const schema = z.object({
  store: z.string().min(1, 'Parâmetro --store é obrigatório (ex: matriz, st-01)'),
  account: z.string().optional(),
  agency: z.string().optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de data inválido para --from. Use YYYY-MM-DD'),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de data inválido para --to. Use YYYY-MM-DD'),
  headless: z.boolean().default(false),
  timeout: z.coerce.number().default(10), // minutos para login assistido
});

function toBr(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

/**
 * Pré-configura permissões de rede local (loopback) no perfil do Chromium
 * para permitir que a página do Itaú se comunique via WebSocket com o daemon local do Guardião (Warsaw).
 */
function configureProfilePermissions(profileDir: string): void {
  const defaultDir = path.join(profileDir, 'Default');
  fs.mkdirSync(defaultDir, { recursive: true });
  const prefsPath = path.join(defaultDir, 'Preferences');

  let prefs: any = {};
  if (fs.existsSync(prefsPath)) {
    try {
      prefs = JSON.parse(fs.readFileSync(prefsPath, 'utf8'));
    } catch {}
  }

  if (!prefs.profile) prefs.profile = {};
  if (!prefs.profile.content_settings) prefs.profile.content_settings = {};
  if (!prefs.profile.content_settings.exceptions) prefs.profile.content_settings.exceptions = {};

  const loopbackExceptions: Record<string, any> = {
    'https://internet4.itau.com.br:443,*': { last_modified: '13433369517966492', last_visit: '13433212800000000', setting: 1 },
    'https://internet6.itau.com.br:443,*': { last_modified: '13433369517966492', last_visit: '13433212800000000', setting: 1 },
    'https://www.itau.com.br:443,*': { last_modified: '13433369517966492', last_visit: '13433212800000000', setting: 1 },
    'https://empresas.cloud.itau.com.br:443,*': { last_modified: '13433369517966492', last_visit: '13433212800000000', setting: 1 },
    'https://internetpf.itau.com.br:443,*': { last_modified: '13433369517966492', last_visit: '13433212800000000', setting: 1 },
    'https://internetpf6.itau.com.br:443,*': { last_modified: '13433369517966492', last_visit: '13433212800000000', setting: 1 },
  };

  prefs.profile.content_settings.exceptions.loopback_network = {
    ...(prefs.profile.content_settings.exceptions.loopback_network || {}),
    ...loopbackExceptions,
  };

  try {
    fs.writeFileSync(prefsPath, JSON.stringify(prefs, null, 2), 'utf8');
    console.log(`[ItauRunner] 🛡️ Permissões de loopback (Guardião Warsaw) configuradas em ${prefsPath}`);
  } catch (err) {
    console.warn('[ItauRunner] Aviso ao gravar permissões de loopback:', err);
  }
}

function printHelp(): void {
  console.log(`
🤖 Itaú Empresas PJ — Extrator Automático de OFX (Playwright)

Uso:
  npm run run:itau -- --store <loja> [opções]

Parâmetros Obrigatórios:
  --store <nome>        Identificador da loja (ex: matriz, st-01, kennedy)
  --from <YYYY-MM-DD>   Data inicial do extrato (ex: 2026-09-01)
  --to <YYYY-MM-DD>     Data final do extrato (ex: 2026-09-08)

Parâmetros Opcionais:
  --account <conta>     Número da conta corrente para validação Fail Closed (ex: "81153-1")
  --agency <agencia>    Número da agência bancária (ex: "0263")
  --headless            Executa sem interface gráfica (padrão: false para permitir login assistido)
  --timeout <minutos>   Tempo máximo aguardando login humano (padrão: 10)
  --help                Exibe esta mensagem de ajuda

Exemplo:
  npm run run:itau -- --store matriz --account "81153-1" --from 2026-09-01 --to 2026-09-08
`);
}

export interface RunItauTaskOptions {
  store: string;
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
  account?: string;
  agency?: string;
  operatorCpf?: string;
  password?: string;
  headless?: boolean;
  timeout?: number; // minutos
  uploadToBuffer?: boolean;
}

export interface RunItauTaskResult {
  filePath: string;
  fileName: string;
  fileSizeBytes: number;
  sha256: string;
  isSgml: boolean;
  bufferRecordId?: string;
  expiresAt?: string;
}

/**
 * Executa a tarefa do scraper Itaú PJ de forma programática.
 * Pode ser chamado via API Express (server.ts) ou via CLI.
 */
export async function runItauScraperTask(options: RunItauTaskOptions): Promise<RunItauTaskResult> {
  let { store, from, to, account, agency, headless = false, timeout = 10, uploadToBuffer = true } = options;
  let operatorCpf = options.operatorCpf;
  let password = options.password;

  // Auto-completa conta, agência, CPF e senha a partir das credenciais salvas no banco caso não informados
  if (!account || !agency || !operatorCpf || !password) {
    try {
      const creds = await getBankBotCredentials(store, 'itau');
      if (creds && creds.length > 0) {
        account = account || creds[0].account_number;
        agency = agency || creds[0].agency;
        operatorCpf = operatorCpf || creds[0].operator_cpf;
        password = password || creds[0].password;
        console.log(`[ItauRunner] Credenciais auto-carregadas para "${store}": Agência ${agency}, Conta ${account}, CPF ${operatorCpf ? 'OK' : 'Ausente'}, Senha ${password ? 'OK' : 'Ausente'}`);
      }
    } catch (err) {
      console.warn(`[ItauRunner] Aviso ao buscar credenciais bancárias para "${store}":`, err);
    }
  }

  const runId = `${store}_${from}_${to}_${Date.now()}`;

  // Diretórios isolados por loja e execução
  const baseDataDir = path.resolve(__dirname, '../data');
  const profileDir = path.resolve(process.env.PROFILE_ROOT ?? path.join(baseDataDir, 'browser-profiles'), store);
  const outputDir = path.resolve(process.env.DOWNLOAD_ROOT ?? path.join(baseDataDir, 'downloads'), store);
  const evidenceDir = path.resolve(process.env.EVIDENCE_ROOT ?? path.join(baseDataDir, 'evidence'), runId);

  fs.mkdirSync(evidenceDir, { recursive: true });
  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(profileDir, { recursive: true });

  // Configura permissões de loopback (localhost:30900) para comunicação com o Guardião Itaú (Warsaw)
  configureProfilePermissions(profileDir);

  console.log(`\n======================================================`);
  console.log(`🚀 Iniciando Bot Itaú PJ: ${store}`);
  console.log(`📅 Período: ${toBr(from)} até ${toBr(to)}`);
  if (account) console.log(`🏦 Conta esperada: ${account}`);
  if (agency) console.log(`🏢 Agência: ${agency}`);
  if (operatorCpf) console.log(`👤 CPF Operador: ${operatorCpf.slice(0, 3)}...`);
  console.log(`📁 Perfil do navegador: ${profileDir}`);
  console.log(`🖥️ Modo Headless: ${headless ? 'Sim (Servidor)' : 'Não (Local/Assistido)'}`);
  console.log(`======================================================\n`);

  // Inicia contexto persistente com flags de evasão anti-bot e canal do Chrome para evitar bloqueio WAF Akamai
  const context = await chromium.launchPersistentContext(profileDir, {
    channel: 'chrome',
    headless,
    acceptDownloads: true,
    viewport: { width: 1440, height: 960 },
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--start-maximized',
      '--allow-insecure-localhost',
      '--ignore-certificate-errors',
      '--disable-features=BlockInsecurePrivateNetworkRequests,PrivateNetworkAccessRespectPreflightResults,PrivateNetworkAccessSendPreflights',
    ],
  });

  // Habilita Tracing completo do Playwright para diagnóstico forense
  await context.tracing.start({ screenshots: true, snapshots: true, sources: true });

  const page = context.pages()[0] ?? (await context.newPage());
  page.setDefaultTimeout(30_000);

  try {
    const login = new ItauLoginPage(context, page);
    let authPage;

    if (agency && account && operatorCpf) {
      console.log(`[ItauRunner] 🤖 Executando login 100% autônomo com as credenciais do banco...`);
      authPage = await login.loginAutonomous({
        agency,
        account,
        cpf: operatorCpf,
        password,
      });
    } else {
      console.log('[ItauRunner] Credenciais bancárias ausentes. Iniciando modo assistido...');
      await login.open('https://www.itau.com.br/empresas');
      authPage = await login.waitForAuthenticatedSession(timeout);
    }

    const statement = new ItauStatementPage(authPage);
    await statement.goToStatement();

    if (account) {
      await statement.validateAccount(account);
    }

    await statement.setCustomRange(toBr(from), toBr(to));

    const download = await statement.downloadOfx();

    const result = await persistAndValidateOfx({
      download,
      outputDir,
      store,
      agency,
      account,
      fromDate: from,
      toDate: to,
    });

    console.log(`\n🎉 SUCESSO TOTAL!`);
    console.log(`📄 Arquivo OFX: ${result.filePath}`);
    console.log(`🔒 Checksum: ${result.sha256}`);

    // Em caso de sucesso, encerra o trace sem salvar no disco para economizar espaço
    await context.tracing.stop().catch(() => {});

    let bufferRecordId: string | undefined;
    let expiresAt: string | undefined;

    // Salva o conteúdo do extrato no buffer do Supabase com expiração de 48h
    if (uploadToBuffer) {
      try {
        const fileContent = fs.readFileSync(result.filePath, 'latin1');
        const uploadRes = await uploadOfxBufferToSupabase({
          storeId: store,
          bankCode: 'itau',
          bankName: 'Itaú Empresas',
          fileName: result.fileName,
          fileSizeBytes: result.fileSizeBytes,
          content: fileContent,
          sha256: result.sha256,
          fromDate: from,
          toDate: to,
        });
        bufferRecordId = uploadRes.id;
        expiresAt = uploadRes.expiresAt;
      } catch (uploadErr: any) {
        console.error('[ItauRunner] Erro ao enviar OFX para buffer do Supabase:', uploadErr.message || uploadErr);
      }
    }

    return {
      ...result,
      bufferRecordId,
      expiresAt,
    };
  } catch (error) {
    console.error(`\n❌ [FALHA NA EXECUÇÃO]:`, error);

    // Salva screenshot de tela cheia do momento do erro
    const screenshotPath = path.join(evidenceDir, 'falha.png');
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
    console.log(`📸 Evidência salva em: ${screenshotPath}`);

    // Salva Playwright Trace para análise com "npx playwright show-trace"
    const tracePath = path.join(evidenceDir, 'trace.zip');
    await context.tracing.stop({ path: tracePath }).catch(() => {});
    console.log(`🔍 Trace gravado em: ${tracePath}`);
    console.log(`   (Abra com: npx playwright show-trace "${tracePath}")\n`);

    throw error;
  } finally {
    // Mantém contexto aberto por 2 segundos antes de encerrar
    await new Promise((r) => setTimeout(r, 2000));
    await context.close().catch(() => {});
  }
}

/**
 * Ponto de entrada CLI (Linha de Comando)
 */
export async function runItauScraper(rawArgs: string[] = process.argv.slice(2)): Promise<void> {
  const { values } = parseArgs({
    args: rawArgs,
    options: {
      store: { type: 'string' },
      account: { type: 'string' },
      agency: { type: 'string' },
      from: { type: 'string' },
      to: { type: 'string' },
      headless: { type: 'boolean', default: false },
      timeout: { type: 'string', default: '10' },
      help: { type: 'boolean', default: false },
    },
    allowPositionals: false,
  });

  if (values.help) {
    printHelp();
    return;
  }

  const parsed = schema.safeParse(values);
  if (!parsed.success) {
    console.error('❌ Parâmetros inválidos:');
    for (const issue of parsed.error.issues) {
      console.error(`   - ${issue.message}`);
    }
    console.error('\nUtilize --help para ver as opções disponíveis.');
    process.exitCode = 1;
    return;
  }

  await runItauScraperTask({
    store: parsed.data.store,
    from: parsed.data.from,
    to: parsed.data.to,
    account: parsed.data.account,
    agency: parsed.data.agency,
    headless: parsed.data.headless,
    timeout: parsed.data.timeout,
    uploadToBuffer: true,
  });
}

if (require.main === module) {
  runItauScraper().catch(() => {
    process.exit(1);
  });
}
