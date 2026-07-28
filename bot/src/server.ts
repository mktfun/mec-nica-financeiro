import express from 'express';
import { runSync } from './runner';

const app = express();
app.use(express.json());

// ── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'conciliamec-bot',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ── Endpoint principal de acionamento HTTP ─────────────────────────────────
app.post('/api/sync', async (req, res) => {
  try {
    const { targetDate, services } = req.body || {};
    console.log(`[HTTP Server] Recebida solicitação de sincronização para: ${targetDate || 'ontem (padrão)'}`);
    
    const result = await runSync({ targetDate, services });
    res.json({ success: true, result });
  } catch (error: any) {
    console.error('[HTTP Server] Erro ao executar sincronização:', error);
    res.status(500).json({ success: false, error: error.message || String(error) });
  }
});

app.post('/api/sync/oficina', async (req, res) => {
  try {
    const { targetDate } = req.body || {};
    const result = await runSync({ targetDate, services: ['oficina'] });
    res.json({ success: true, result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/sync/rede', async (req, res) => {
  try {
    const { targetDate } = req.body || {};
    const result = await runSync({ targetDate, services: ['rede'] });
    res.json({ success: true, result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = Number(process.env.BOT_PORT || 3001);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 ConciliaMec Bot HTTP Server escutando na porta ${PORT} (0.0.0.0:${PORT})\n`);
});
