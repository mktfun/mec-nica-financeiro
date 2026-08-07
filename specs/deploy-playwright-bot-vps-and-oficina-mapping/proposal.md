# Proposal: Implantação do Bot Playwright no Servidor VPS e Mapeamento Completo da API Oficina Inteligente & Rede (deploy-playwright-bot-vps-and-oficina-mapping)

## Problema
- O bot de raspagem e sincronização em `bot/` possui a estrutura base de automação com Playwright, mas os seletores CSS e endpoints de API em `scrapers/oficina.ts` e `scrapers/rede.ts` estão configurados com placeholders genéricos.
- O robô precisa ser instalado no servidor VPS dedicado (`operacional@100.126.50.101`), onde rodará de forma 100% autônoma via PM2/Cron com suporte a API HTTP para disparo manual sob demanda e atualização contínua de sessões e dados no Supabase (`patio_os` e `transactions`).

## Solução Proposta

1. **Configuração de Acesso SSH e Ambiente no Servidor VPS (`100.126.50.101`):**
   - Garantir a presença da chave SSH privada em `$env:USERPROFILE\.ssh\antigravity_key`.
   - Testar conexão e preparar o ambiente Linux (Node.js v20, PM2, Git, dependências do Playwright e Chromium headless via `npx playwright install-deps chromium`).
2. **Serviço de Bot HTTP e Worker Autônomo (`bot/src/server.ts`):**
   - Criar um servidor HTTP leve em Express/Node no `bot/` exposto na VPS (ex: porta 3001) com endpoints:
     - `GET /health`: Diagnóstico de status e validade das sessões.
     - `POST /sync/oficina`: Disparo sob demanda para baixar relatórios de OS do Oficina Inteligente para uma data (`targetDate`).
     - `POST /sync/rede`: Disparo sob demanda para capturar transações dos 10 estabelecimentos da Rede.
     - `POST /sync/all`: Execução completa para a data selecionada ou D-1.
3. **Mapeamento Preciso de DOM e Interceptação de Rede (`scrapers/oficina.ts` & `scrapers/rede.ts`):**
   - Executar o script de exploração para mapear a estrutura exata do formulário de login de `sistemaoficinainteligente.com.br`, navegação até Relatórios de OS, filtros de data e download do arquivo Excel.
   - Mapear a navegação nos 10 estabelecimentos da Rede e interceptar a resposta JSON da API de transações.
4. **Persistência de Sessões e Gravação Automática no Supabase:**
   - Reutilizar cookies e local storage via `sessionManager.ts` em `bot/session/`.
   - Inserir/atualizar OSs na tabela `patio_os` e transações da maquininha na tabela `transactions` com id da loja correspondente via `supabaseUploader.ts`.

## Contratos de Dados
- **Tabela `bot_credentials` (Supabase):** Armazena logins e senhas do Oficina Inteligente e da Rede.
- **Tabela `patio_os` (Supabase):** Gravação idempotente das OSs baixadas do Oficina Inteligente.
- **Tabela `transactions` (Supabase):** Gravação idempotente das vendas da Rede (`source = 'rede'`).

## API HTTP do Bot (VPS `100.126.50.101:3001`)
- `POST http://100.126.50.101:3001/api/sync`
  - Body: `{ "targetDate": "2026-07-28", "services": ["oficina", "rede"] }`
  - Response: `{ "status": "success", "oficinaOsCount": 324, "redeTxCount": 85 }`

## Risco Principal
Alterações na interface web ou inclusão de CAPTCHA nos portais de login.
*Mitigação:* Reutilização de sessões persistidas (`session/oi-session.json` e `session/rede-session.json`), mecanismo de retry com backoff exponencial e suporte a log headless detalhado.
