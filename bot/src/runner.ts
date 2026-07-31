/**
 * runner.ts — Entry point do Bot ConciliaMec
 * 
 * Fluxo:
 * 1. Carrega credenciais do Supabase (tabela bot_credentials)
 * 2. Lança Playwright (headless Chromium)
 * 3. Tenta injetar sessão salva — se expirada, faz login full
 * 4. Coleta dados do Oficina Inteligente (XLSX do dia)
 * 5. Coleta dados da Rede (Network Interception para cada estabelecimento)
 * 6. Faz bulk insert no Supabase com idempotência
 */

import { chromium } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

import { loadSession, saveSession } from './session/sessionManager';
import { loginOI, downloadRelatorioOS } from './scrapers/oficina';
import { loginRede, capturarTodosEstabelecimentos } from './scrapers/rede';
import { getBotCredentials, getStoreMap, uploadRedeTransacoes } from './sync/supabaseUploader';

// Data alvo: D-1 por padrão (ontem), ou a passada via variável de ambiente
function getTargetDate(): string {
  if (process.env.BOT_TARGET_DATE) return process.env.BOT_TARGET_DATE;
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}


export interface SyncOptions {
  targetDate?: string;
  services?: ('oficina' | 'rede')[];
}

export async function runSync(options: SyncOptions = {}) {
  const targetDate = options.targetDate || getTargetDate();
  const services = options.services || ['oficina', 'rede'];

  console.log(`\n🤖 ConciliaMec Bot iniciando execução para data: ${targetDate} (Serviços: ${services.join(', ')})\n`);

  let oiResult = { success: false, xlsxPath: null as string | null };
  let redeResult = { success: false, txCount: 0 };

  // ── Carrega credenciais do banco ────────────────────────────────────────────
  let oiCreds: any = null;
  let redeCreds: any = null;
  let storeMap: any = {};

  try {
    storeMap = await getStoreMap();
    if (services.includes('oficina')) oiCreds = await getBotCredentials('oficina_inteligente');
    if (services.includes('rede')) redeCreds = await getBotCredentials('rede');
  } catch (e) {
    console.warn('[Bot] Aviso ao carregar credenciais Supabase (usando variáveis de ambiente se disponíveis):', e);
  }

  // ── Inicializa Playwright ───────────────────────────────────────────────────
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  // ── BLOCO: Oficina Inteligente ──────────────────────────────────────────────
  if (services.includes('oficina') && oiCreds?.username) {
    try {
      const oiContext = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 800 },
      });

      const hasSession = await loadSession('oi', oiContext);
      const oiPage = await loginOI(oiContext, { username: oiCreds.username, password: oiCreds.password });
      
      if (!hasSession) {
        await saveSession('oi', oiContext);
      }

      const xlsxPath = await downloadRelatorioOS(oiPage, targetDate);
      console.log(`✅ [OI] XLSX baixado: ${xlsxPath}`);
      oiResult = { success: true, xlsxPath };

      await oiContext.close();
    } catch (e) {
      console.error('❌ [OI] Falha ao coletar dados do Oficina Inteligente:', e);
    }
  }

  // ── BLOCO: Rede ─────────────────────────────────────────────────────────────
  if (services.includes('rede') && redeCreds?.username) {
    let redeTransacoes: Awaited<ReturnType<typeof capturarTodosEstabelecimentos>> = [];
    try {
      const redeContext = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 800 },
      });

      const hasSession = await loadSession('rede', redeContext);
      const redePage = await loginRede(redeContext, { username: redeCreds.username, password: redeCreds.password });

      if (!hasSession) {
        await saveSession('rede', redeContext);
      }

      redeTransacoes = await capturarTodosEstabelecimentos(redePage, targetDate);
      console.log(`✅ [Rede] Total de transações capturadas: ${redeTransacoes.length}`);

      await redeContext.close();

      if (redeTransacoes.length > 0) {
        await uploadRedeTransacoes(redeTransacoes, storeMap);
        console.log('✅ [Supabase] Transações da Rede sincronizadas.');
        redeResult = { success: true, txCount: redeTransacoes.length };
      }
    } catch (e) {
      console.error('❌ [Rede] Falha ao coletar dados da Rede:', e);
    }
  }

  await browser.close();

  console.log(`\n✅ Bot ConciliaMec executado com sucesso para ${targetDate}\n`);
  return { targetDate, oiResult, redeResult, timestamp: new Date().toISOString() };
}

if (require.main === module) {
  runSync().catch((e) => {
    console.error('💥 Erro fatal no bot:', e);
    process.exit(1);
  });
}

