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

dotenv.config({ path: path.join(__dirname, '../.env') });

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

async function run() {
  const targetDate = getTargetDate();
  console.log(`\n🤖 ConciliaMec Bot iniciando para data: ${targetDate}\n`);

  // ── Carrega credenciais do banco ────────────────────────────────────────────
  const oiCreds = await getBotCredentials('oficina_inteligente');
  const redeCreds = await getBotCredentials('rede');
  const storeMap = await getStoreMap();

  // ── Inicializa Playwright ───────────────────────────────────────────────────
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  // ── BLOCO: Oficina Inteligente ──────────────────────────────────────────────
  let xlsxPath: string | null = null;
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

    xlsxPath = await downloadRelatorioOS(oiPage, targetDate);
    console.log(`✅ [OI] XLSX baixado: ${xlsxPath}`);

    await oiContext.close();
  } catch (e) {
    console.error('❌ [OI] Falha ao coletar dados do Oficina Inteligente:', e);
  }

  // ── BLOCO: Rede ─────────────────────────────────────────────────────────────
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
  } catch (e) {
    console.error('❌ [Rede] Falha ao coletar dados da Rede:', e);
  }

  await browser.close();

  // ── BLOCO: Sync com Supabase ────────────────────────────────────────────────
  if (redeTransacoes.length > 0) {
    await uploadRedeTransacoes(redeTransacoes, storeMap);
    console.log('✅ [Supabase] Transações da Rede sincronizadas.');
  }

  // TODO: Processar xlsxPath com o parser do OI e sincronizar
  if (xlsxPath) {
    console.log('ℹ️ [OI] XLSX disponível para processamento:', xlsxPath);
    // await processOIXlsx(xlsxPath, targetDate, storeMap);
  }

  console.log(`\n✅ Bot ConciliaMec concluído para ${targetDate}\n`);
}

run().catch((e) => {
  console.error('💥 Erro fatal no bot:', e);
  process.exit(1);
});
