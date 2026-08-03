# Guia de Acesso e Configuração da VPS (Tork Stack)

> [!IMPORTANT]
> Este documento serve como Memória Oficial para você e para futuros Agentes IA. Se você pedir a outro agente para realizar manutenções, basta indicar a leitura deste arquivo.

## 1. 🔑 Credenciais e Acesso SSH
A VPS atual onde rodam o Tork Stack, os Bots em PM2 e a Evolution API é acessada com as seguintes credenciais:

- **Host (IP Público):** 203.0.113.50
- **Host (IP Tailscale):** 100.126.50.101
- **Porta:** 22
- **Usuário:** operacional
- **Senha:** Mktfunil8563*

*Atenção:* Deixar a porta 22 exposta para a internet pública apenas com senha é perigoso (os bots da internet vão ficar tentando adivinhar a senha 24 horas por dia). O ideal é desativar o login por senha e usar apenas Chave SSH (SSH Key), o que deixa o servidor blindado, mesmo sendo público.
Para acessar sem o Tailscale, bastaria usar o IP público no terminal: `ssh operacional@203.0.113.50` e digitar a mesma senha.

### Como Agentes IA devem acessar (Script Node.js):
A melhor forma para um Agente acessar a VPS e rodar comandos sem interatividade (evitando senhas no terminal) é usando a biblioteca `ssh2` via Node.js local. Exemplo de template para scripts `.cjs`:

```javascript
const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  const cmd = `pm2 status`; // Comando desejado aqui
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code) => { conn.end(); process.exit(code); })
          .on('data', d => process.stdout.write(d))
          .stderr.on('data', d => process.stderr.write(d));
  });
}).connect({ host: '100.126.50.101', port: 22, username: 'operacional', password: 'Mktfunil8563*' });
```
(Recomenda-se criar um arquivo temporário localmente e rodar com `node script.cjs`).

## 2. 🤖 Bots PM2 (Sincronizadores)
Os bots de sincronização autônomos ficam na pasta `/opt/bots/`. Eles são gerenciados pelo PM2 e já estão configurados para inicializar junto com o sistema Operacional (Ubuntu) através do SystemD (`pm2 startup`).

- **Diretório:** `/opt/bots/`
- **Processos rodando:**
  - `notion-sync` (ID 0)
  - `oi-sync` (ID 1)

### Comandos Úteis do PM2
- `pm2 status` (Ver a saúde, restarts e consumo de RAM)
- `pm2 logs notion-sync --lines 50` (Ver os últimos logs do Notion)
- `pm2 restart oi-sync` (Reiniciar o bot do Oficina Inteligente)
- `pm2 flush` (Limpar histórico de logs muito longos)
- `pm2 save` (Salvar a lista atual para boot automático caso o servidor reinicie)

> [!TIP]
> Caso seja necessário editar os cookies do Notion, o arquivo fica em `/opt/bots/.auth/storageState.json`. Lembre-se que a propriedade `sameSite` das sessões do Playwright deve ser `"None"` ou `"Lax"`, nunca `"unspecified"`.

## 3. 🐳 Tork Stack (Docker)
A infraestrutura principal do Chatwoot, Evolution API, Banco de dados PostgreSQL e Redis rodam via Docker Compose.

- **Diretório Compose Principal:** `/opt/tork-stack/`
- **Diretório da API (Oficina Connector):** Docker rodando o container `conciliamec-bot` (geralmente gerado de `/opt/bots`)

### Evolution API
- **Porta Host:** 8080
- **Global API Key:** 276bd845e27911e034b4356d46d2eb5a
- O `.env` de referência da Evolution pode ser visto localmente no arquivo `remote-.env.evolution`.

### Chatwoot
- **Container Rails:** `chatwoot-rails`
- **Container Sidekiq:** `chatwoot-sidekiq`
- **Dica de Troubleshooting:** Se o Chatwoot entrar em um loop de crash ("A server is already running"), é porque um `server.pid` fantasma ficou preso no volume montado (`/opt/tork-stack/data/chatwoot_storage/`). Pare o container, delete o container e levante-o novamente com `docker compose up -d chatwoot-rails` (o volume preserverá o estado correto).

## 4. 🌐 ConciliaMec Bot API (Oficina Inteligente via MCP)
O worker que serve de ponte entre o Oficina Inteligente (Playwright/Scraper) e as integrações externas roda na porta 3001 da VPS.

- **API Endpoint Base:** `http://localhost:3001` (na VPS)
- **API Key Exigida (`X-Api-Key`):** `cmk-bot-2026-mktfun-xK9pL3`

### Principais Rotas da API
- `GET /health` (Status)
- `GET /api/contas-pagar?loja=<slug>` (Retorna Array JSON das contas a pagar)
- `GET /api/agenda?loja=<slug>`
- `GET /api/os/:id?loja=<slug>`

> [!NOTE]
> A API do ConciliaMec extrai dados lendo diretamente o DOM do Oficina Inteligente. Se alguma coluna retornar vazia (como o "vencimento" nas contas a pagar), pode ser necessário atualizar a lógica de parsing em `/opt/bots/src/workers/oficina-agent/` de acordo com atualizações da interface do Oficina Inteligente.

## 5. 🛠️ Supabase Keys (Para os Bots)
As variáveis de ambiente usadas pelos robôs para conectar no Supabase (`SUPABASE_URL` e as Keys) estão no `.env` deles.

- **URL:** `https://cnwzsvowkfymtdiryhqc.supabase.co`
- O `SUPABASE_SERVICE_ROLE_KEY` deve ser usado exclusivamente pelo backend (PM2/Docker na VPS). Jamais coloque isso em client-side web apps.
