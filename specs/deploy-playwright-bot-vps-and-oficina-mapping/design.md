# Design: Implantação do Bot Playwright no Servidor VPS e Mapeamento Completo da API Oficina Inteligente & Rede (deploy-playwright-bot-vps-and-oficina-mapping)

## Arquitetura de Comunicação e Deploy

```
[Antigravity Frontend / Agent]
               │
               │ HTTP POST /api/sync { targetDate: "YYYY-MM-DD" }
               ▼
[Servidor HTTP do Bot na VPS (100.126.50.101:3001)]
               │
               ├── 1. Playwright Headless Chromium (com sessão salva)
               │     ├── Scraper Oficina Inteligente ──► Download XLSX OSs do dia
               │     └── Scraper Rede (Network Intercept) ──► JSON Extrato de Vendas
               │
               ├── 2. Processador & Parser (`useOsImportProcessor` / `rede.ts`)
               │
               └── 3. Supabase Client
                     ├── Upsert patio_os
                     └── Upsert transactions (source = 'rede')
```

## Componentes do Módulo `bot/`

```
bot/
├── src/
│   ├── server.ts                  # Servidor Express HTTP para acionamento via API
│   ├── runner.ts                  # Executor do fluxo de raspagem e sync
│   ├── scrapers/
│   │   ├── oficina.ts             # Mapeamento do portal Oficina Inteligente
│   │   └── rede.ts                # Interceptação de API do portal Rede
│   ├── session/
│   │   └── sessionManager.ts      # Salva e carrega cookies de autenticação
│   └── sync/
│       └── supabaseUploader.ts    # Envio idempotente para o Supabase
```

## Estrutura da API HTTP (`bot/src/server.ts`)

```typescript
import express from 'express';
import { runSync } from './runner';

const app = express();
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

app.post('/api/sync', async (req, res) => {
  try {
    const { targetDate, services } = req.body;
    const result = await runSync({ targetDate, services });
    res.json({ success: true, result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🤖 ConciliaMec Bot Server rodando na porta ${PORT}`);
});
```

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)

- **Cenário 1 (Conexão SSH & Saúde do Servidor VPS):**
  - Ação: Conectar via SSH na máquina `operacional@100.126.50.101` com a chave `antigravity_key`.
  - Resultado esperado: Conexão bem-sucedida com privilégios sudo e Node.js instalado.

- **Cenário 2 (Disparo de Sincronização via API):**
  - Ação: Enviar requisição `POST http://100.126.50.101:3001/api/sync` para uma data específica.
  - Resultado esperado: Retorno HTTP 200 com resumo dos dados gravados no Supabase.
