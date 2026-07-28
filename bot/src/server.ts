import express, { Request, Response, NextFunction } from 'express';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

import { runSync } from './runner';

const app = express();
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

const PORT = Number(process.env.BOT_PORT || process.env.PORT || 3001);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 ConciliaMec Bot API rodando em http://0.0.0.0:${PORT}`);
  console.log(`   🔑 API Key configurada: ${BOT_API_KEY.substring(0, 8)}...`);
  console.log(`   📡 Endpoints:`);
  console.log(`      GET  /health              (público)`);
  console.log(`      POST /api/sync            (requer X-Api-Key)`);
  console.log(`      POST /api/sync/oficina    (requer X-Api-Key)`);
  console.log(`      POST /api/sync/rede       (requer X-Api-Key)\n`);
});
