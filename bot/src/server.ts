import express, { Request, Response, NextFunction } from 'express';
import * as dotenv from 'dotenv';
import * as path from 'path';
import cors from 'cors';

dotenv.config({ path: path.join(__dirname, '../.env') });

import { runSync } from './runner';
import { chromium } from '@playwright/test';
import {
  loginOI,
  fetchOSByNumber,
  ensureCompany,
  fetchContasPagar,
  fetchContasReceber,
  fetchAgenda,
  fetchConfigStatusOS,
  fetchConfigFormasPagamento,
} from './scrapers/oficina';
import { getBotCredentials } from './sync/supabaseUploader';
import { loadSession, saveSession } from './session/sessionManager';
import { resolveEmpresa } from './config/empresas';

const app = express();
app.use(cors());
app.use(express.json());

// ── API Key Middleware ─────────────────────────────────────────────────────
const BOT_API_KEY = process.env.BOT_API_KEY || 'conciliamec-bot-key-change-me';

function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  const key =
    req.headers['x-api-key'] as string ||
    req.headers['authorization']?.replace('Bearer ', '') ||
    (req.query.apiKey as string);

  if (!key || key !== BOT_API_KEY) {
    res.status(401).json({ success: false, error: 'Unauthorized: API key inválida ou ausente.' });
    return;
  }
  next();
}

// ── Health (público — sem auth) ───────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'conciliamec-bot',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// ── Todos os endpoints abaixo exigem API Key ──────────────────────────────
app.use('/api', requireApiKey);

// POST /api/sync — Sincronização completa (OI + Rede)
app.post('/api/sync', async (req: Request, res: Response) => {
  try {
    const { targetDate, services } = req.body || {};
    console.log(`[API] POST /api/sync — data: ${targetDate || 'ontem'} serviços: ${services?.join(',') || 'todos'}`);
    const result = await runSync({ targetDate, services });
    res.json({ success: true, result });
  } catch (error: any) {
    console.error('[API] Erro em /api/sync:', error);
    res.status(500).json({ success: false, error: error.message || String(error) });
  }
});

// POST /api/sync/oficina — Apenas Oficina Inteligente
app.post('/api/sync/oficina', async (req: Request, res: Response) => {
  try {
    const { targetDate } = req.body || {};
    const result = await runSync({ targetDate, services: ['oficina'] });
    res.json({ success: true, result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/sync/rede — Apenas Rede (maquininhas)
app.post('/api/sync/rede', async (req: Request, res: Response) => {
  try {
    const { targetDate } = req.body || {};
    const result = await runSync({ targetDate, services: ['rede'] });
    res.json({ success: true, result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/os/:id — Busca uma Ordem de Serviço específica no Oficina Inteligente
app.get('/api/os/:id', async (req: Request, res: Response) => {
  const osNumber = req.params.id;
  if (!osNumber) {
    res.status(400).json({ success: false, error: 'Número da OS é obrigatório.' });
    return;
  }

  const lojaSlug = req.query.loja as string | undefined;
  console.log(`[API] GET /api/os/${osNumber} — loja: ${lojaSlug || 'padrão'}`);
  let browser;
  try {
    const session = await createBotSession(lojaSlug);
    browser = session.browser;
    const osData = await fetchOSByNumber(session.page, osNumber);
    
    res.json({ success: true, data: osData });
  } catch (error: any) {
    console.error(`[API] Erro ao buscar OS ${osNumber}:`, error);
    
    if (error.message && error.message.includes('não encontrada')) {
      res.status(404).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: error.message || String(error) });
    }
  } finally {
    if (browser) {
      await browser.close().catch(console.error);
    }
  }
});

// GET /api/os/detalhe/:id — Busca o DETALHE COMPLETO de uma Ordem de Serviço
app.get('/api/os/detalhe/:id', async (req: Request, res: Response) => {
  const osNumber = req.params.id;
  if (!osNumber) {
    res.status(400).json({ success: false, error: 'Número da OS é obrigatório.' });
    return;
  }

  const lojaSlug = req.query.loja as string | undefined;
  console.log(`[API] GET /api/os/detalhe/${osNumber} — loja: ${lojaSlug || 'padrão'}`);
  let browser;
  try {
    const session = await createBotSession(lojaSlug);
    browser = session.browser;
    const { fetchOSDetailedView } = require('./scrapers/oficina');
    const osData = await fetchOSDetailedView(session.page, osNumber);
    
    res.json({ success: true, data: osData });
  } catch (error: any) {
    console.error(`[API] Erro ao buscar detalhe da OS ${osNumber}:`, error);
    
    if (error.message && error.message.includes('não encontrada')) {
      res.status(404).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: error.message || String(error) });
    }
  } finally {
    if (browser) {
      await browser.close().catch(console.error);
    }
  }
});

// ── Helper: cria browser, faz login e opcionalmente troca empresa ─────────────
async function createBotSession(lojaSlug?: string) {
  const oiCreds = await getBotCredentials('oficina_inteligente');
  if (!oiCreds?.username) {
    throw new Error('Credenciais do Oficina Inteligente não configuradas no Supabase.');
  }

  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
  });

  const hasSession = await loadSession('oi', context);
  const page = await loginOI(context, { username: oiCreds.username, password: oiCreds.password });
  if (!hasSession) await saveSession('oi', context);

  // Troca de empresa se loja fornecida
  if (lojaSlug) {
    const empresa = resolveEmpresa(lojaSlug);
    if (empresa) {
      await ensureCompany(page, empresa.id_empresa_oi);
    } else {
      console.warn(`[API] Loja "${lojaSlug}" não encontrada no mapa de empresas.`);
    }
  }

  return { browser, page };
}

// GET /api/contas-pagar — Busca contas a pagar no Oficina
app.get('/api/contas-pagar', async (req: Request, res: Response) => {
  const loja = req.query.loja as string;
  if (!loja) {
    res.status(400).json({ success: false, error: 'Parâmetro "loja" é obrigatório.' });
    return;
  }

  let browser;
  try {
    console.log(`[API] GET /api/contas-pagar — loja: ${loja}`);
    const session = await createBotSession(loja);
    browser = session.browser;
    const filtros = {
      lojaSlug: loja,
      vencimentoInicio: req.query.vencimento_inicio as string,
      vencimentoFim: req.query.vencimento_fim as string,
    };
    const data = await fetchContasPagar(session.page, filtros);
    res.json({ success: true, data });
  } catch (e: any) {
    console.error('[API] Erro em /api/contas-pagar:', e);
    res.status(500).json({ success: false, error: e.message || String(e) });
  } finally {
    if (browser) await browser.close().catch(console.error);
  }
});

// GET /api/contas-receber — Busca contas a receber no Oficina
app.get('/api/contas-receber', async (req: Request, res: Response) => {
  const loja = req.query.loja as string;
  if (!loja) {
    res.status(400).json({ success: false, error: 'Parâmetro "loja" é obrigatório.' });
    return;
  }

  let browser;
  try {
    console.log(`[API] GET /api/contas-receber — loja: ${loja}`);
    const session = await createBotSession(loja);
    browser = session.browser;
    const filtros = {
      lojaSlug: loja,
      vencimentoInicio: req.query.vencimento_inicio as string,
      vencimentoFim: req.query.vencimento_fim as string,
    };
    const data = await fetchContasReceber(session.page, filtros);
    res.json({ success: true, data });
  } catch (e: any) {
    console.error('[API] Erro em /api/contas-receber:', e);
    res.status(500).json({ success: false, error: e.message || String(e) });
  } finally {
    if (browser) await browser.close().catch(console.error);
  }
});

// GET /api/agenda — Busca agenda no Oficina
app.get('/api/agenda', async (req: Request, res: Response) => {
  const loja = req.query.loja as string;
  const dataInicio = req.query.data_inicio as string;
  const dataFim = req.query.data_fim as string;

  if (!loja) {
    res.status(400).json({ success: false, error: 'Parâmetro "loja" é obrigatório.' });
    return;
  }
  if (!dataInicio || !dataFim) {
    res.status(400).json({ success: false, error: 'Parâmetros "data_inicio" e "data_fim" são obrigatórios.' });
    return;
  }

  let browser;
  try {
    console.log(`[API] GET /api/agenda — loja: ${loja} período: ${dataInicio} → ${dataFim}`);
    const session = await createBotSession(loja);
    browser = session.browser;
    const data = await fetchAgenda(session.page, { lojaSlug: loja, dataInicio, dataFim });
    res.json({ success: true, data });
  } catch (e: any) {
    console.error('[API] Erro em /api/agenda:', e);
    res.status(500).json({ success: false, error: e.message || String(e) });
  } finally {
    if (browser) await browser.close().catch(console.error);
  }
});

// GET /api/config/status-os — Lista status de OS configurados
app.get('/api/config/status-os', async (req: Request, res: Response) => {
  const loja = req.query.loja as string;
  if (!loja) {
    res.status(400).json({ success: false, error: 'Parâmetro "loja" é obrigatório.' });
    return;
  }

  let browser;
  try {
    const session = await createBotSession(loja);
    browser = session.browser;
    const data = await fetchConfigStatusOS(session.page);
    res.json({ success: true, data });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  } finally {
    if (browser) await browser.close().catch(console.error);
  }
});

// GET /api/config/formas-pagamento — Lista formas de pagamento configuradas
app.get('/api/config/formas-pagamento', async (req: Request, res: Response) => {
  const loja = req.query.loja as string;
  if (!loja) {
    res.status(400).json({ success: false, error: 'Parâmetro "loja" é obrigatório.' });
    return;
  }

  let browser;
  try {
    const session = await createBotSession(loja);
    browser = session.browser;
    const data = await fetchConfigFormasPagamento(session.page);
    res.json({ success: true, data });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message || String(e) });
  } finally {
    if (browser) await browser.close().catch(console.error);
  }
});

const PORT = Number(process.env.BOT_PORT || process.env.PORT || 3001);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 ConciliaMec Bot API — Oficina System Connector rodando em http://0.0.0.0:${PORT}`);
  console.log(`   🔑 API Key configurada: ${BOT_API_KEY.substring(0, 8)}...`);
  console.log(`   📡 Endpoints:`);
  console.log(`      GET  /health                        (público)`);
  console.log(`      POST /api/sync                      (requer X-Api-Key)`);
  console.log(`      POST /api/sync/oficina              (requer X-Api-Key)`);
  console.log(`      POST /api/sync/rede                 (requer X-Api-Key)`);
  console.log(`      GET  /api/os/:id[?loja=<slug>]      (requer X-Api-Key)`);
  console.log(`      GET  /api/os/detalhe/:id[?loja=<slug>] (requer X-Api-Key)`);
  console.log(`      GET  /api/contas-pagar?loja=<slug>  (requer X-Api-Key)`);
  console.log(`      GET  /api/contas-receber?loja=<slug>(requer X-Api-Key)`);
  console.log(`      GET  /api/agenda?loja=<slug>        (requer X-Api-Key)`);
  console.log(`      GET  /api/config/status-os?loja=    (requer X-Api-Key)`);
  console.log(`      GET  /api/config/formas-pagamento?  (requer X-Api-Key)\n`);
});
