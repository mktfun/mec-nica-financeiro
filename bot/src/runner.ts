/**
 * runner.ts — Entry point do Bot ConciliaMec & Auditor de Pátio
 * 
 * Fluxo:
 * 1. Suporte a --target oficina, --target rede e --target patio
 * 2. Playwright headless Chromium para extração de OSs abertas e itens de pátio
 * 3. Sincronização atômica no Supabase (patio_os e oficina_os_cache) com ZERO injeção em daily_snapshots
 * 4. Processamento cognitivo do Motor de IA (CMV, aging de pátio, peças sem sinal)
 */

import { chromium } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.join(__dirname, '../../.env') });

import { loadSession, saveSession } from './session/sessionManager';
import { loginOI, downloadRelatorioOS } from './scrapers/oficina';
import { loginRede, capturarTodosEstabelecimentos } from './scrapers/rede';
import { getBotCredentials, getStoreMap, uploadRedeTransacoes } from './sync/supabaseUploader';
import { extractAllStoresLive, OSDeepDetail, OSPartItem } from './scrapers/patioDeepCrawler';
import { syncPatioToSupabase } from './sync/patioSync';
import { analyzePatioIntelligence, printPatioIntelligenceSummary } from './ai/patioIntelligence';
import { getStoreByOI } from './config/storesMap';

function getTargetDate(): string {
  if (process.env.BOT_TARGET_DATE) return process.env.BOT_TARGET_DATE;
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

export interface SyncOptions {
  targetDate?: string;
  services?: ('oficina' | 'rede' | 'patio')[];
  fromCache?: boolean;
}

export async function runPatioAudit(fromCache = false) {
  console.log(`\n========================================================================`);
  console.log(`🚗 INICIANDO PIPELINE DE AUDITORIA DE PÁTIO & EXTRAÇÃO DE OSs`);
  console.log(`🕒 Início: ${new Date().toISOString()}`);
  console.log(`========================================================================\n`);

  let allOS: OSDeepDetail[] = [];

  const cacheFile = '/opt/bots/downloads/resultado_rede_completa_detalhado.json';

  if (fromCache && fs.existsSync(cacheFile)) {
    console.log(`[Patio] Carregando extração detalhada do cache local: ${cacheFile}`);
    const cacheData = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    
    if (Array.isArray(cacheData)) {
      allOS = cacheData;
    } else if (cacheData.lojas && Array.isArray(cacheData.lojas)) {
      allOS = [];
      for (const loja of cacheData.lojas) {
        const mapping = getStoreByOI(loja.loja_id);
        const store_id = mapping ? mapping.store_id : `st-${loja.loja_id}`;
        const store_name = mapping ? mapping.nome_loja : loja.loja_nome;

        for (const o of (loja.ordens || [])) {
          const totPecas = o.totais ? (o.totais.total_produtos || 0) : 0;
          const totServicos = o.totais ? (o.totais.total_servicos || 0) : 0;
          const totGeral = o.totais ? (o.totais.total_geral_os || (totPecas + totServicos)) : 0;

          const parsedItens: OSPartItem[] = (o.itens || []).map((it: any) => ({
            tipo: it.tipo || 'PRODUTO',
            codigo: it.codigo || '',
            referencia: it.referencia || '',
            descricao: it.descricao || '',
            quantidade: typeof it.quantidade === 'number' ? it.quantidade : (parseFloat(it.quantidade) || 1),
            valor_unitario: typeof it.valor_unitario === 'number' ? it.valor_unitario : (parseFloat(it.valor_unitario) || 0),
            valor_total: typeof it.valor_total === 'number' ? it.valor_total : (parseFloat(it.valor_total) || 0),
            executor: it.executor || undefined
          }));

          allOS.push({
            numero_os: o.codigo_os,
            data_os: o.data_abertura || '',
            cliente: o.cliente || 'CLIENTE NÃO INFORMADO',
            veiculo: o.veiculo || '',
            placa: o.placa || '',
            status: o.status || 'Aberta',
            valor_total: totGeral,
            valor_pago: 0,
            valor_pecas: totPecas,
            valor_servicos: totServicos,
            itens: parsedItens,
            laudo_cliente: o.defeito_reclamado || undefined,
            store_id: store_id,
            store_name: store_name,
            id_oi: loja.loja_id
          });
        }
      }
    }
    console.log(`[Patio] ✅ Carregadas ${allOS.length} OSs com itens do cache.`);
  } else {
    try {
      console.log(`[Patio] Executando extração Playwright ao vivo na rede Oficina Inteligente...`);
      allOS = await extractAllStoresLive();
      // Salva snapshot local
      fs.writeFileSync(cacheFile, JSON.stringify(allOS, null, 2), 'utf8');
      console.log(`[Patio] ✅ Extração ao vivo concluída com ${allOS.length} OSs. Cache atualizado.`);
    } catch (err) {
      console.warn(`[Patio] Falha na extração ao vivo. Tentando fallback para cache:`, err);
      if (fs.existsSync(cacheFile)) {
        allOS = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
        console.log(`[Patio] ✅ Fallback acionado: ${allOS.length} OSs carregadas.`);
      } else {
        throw err;
      }
    }
  }

  // 1. Sincroniza com Supabase
  const syncResult = await syncPatioToSupabase(allOS);

  // 2. Motor de IA de Pátio
  const aiReport = analyzePatioIntelligence(allOS);
  printPatioIntelligenceSummary(aiReport);

  return {
    success: true,
    totalOS: allOS.length,
    syncResult,
    aiReport
  };
}

export async function runSync(options: SyncOptions = {}) {
  const args = process.argv.slice(2);
  const isPatio = args.includes('--target') && args[args.indexOf('--target') + 1] === 'patio';
  const fromCache = args.includes('--from-cache');

  if (isPatio || options.services?.includes('patio')) {
    return await runPatioAudit(fromCache);
  }

  const targetDate = options.targetDate || getTargetDate();
  const services = options.services || ['oficina', 'rede'];

  console.log(`\n🤖 ConciliaMec Bot iniciando execução para data: ${targetDate} (Serviços: ${services.join(', ')})\n`);

  let oiResult = { success: false, xlsxPath: null as string | null };
  let redeResult = { success: false, txCount: 0 };

  let oiCreds: any = null;
  let redeCreds: any = null;
  let storeMap: any = {};

  try {
    storeMap = await getStoreMap();
    if (services.includes('oficina')) oiCreds = await getBotCredentials('oficina_inteligente');
    if (services.includes('rede')) redeCreds = await getBotCredentials('rede');
  } catch (e) {
    console.warn('[Bot] Aviso ao carregar credenciais Supabase:', e);
  }

  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

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
