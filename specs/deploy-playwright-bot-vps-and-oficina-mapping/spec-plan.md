# Spec Plan: Implantação do Bot Playwright no Servidor VPS e Mapeamento Completo da API Oficina Inteligente & Rede (deploy-playwright-bot-vps-and-oficina-mapping)

## Tasks

- [ ] [INFRA] Validar chave SSH privada em `$env:USERPROFILE\.ssh\antigravity_key` e testar conexão autônoma com a VPS `operacional@100.126.50.101`
- [ ] [INFRA] Instalar Node.js v20, Git, PM2 e dependências de SO do Playwright no servidor VPS (`100.126.50.101`)
- [ ] [BACKEND] Criar servidor HTTP `bot/src/server.ts` com endpoints de disparo `/health` e `/api/sync`
- [ ] [BACKEND] Refinar `bot/src/scrapers/oficina.ts` com o mapeamento completo dos seletores e download do relatório de OSs do Oficina Inteligente
- [ ] [BACKEND] Refinar `bot/src/scrapers/rede.ts` com o mapeamento dos 10 estabelecimentos da Rede e interceptação de resposta da API de vendas
- [ ] [INFRA] Clonar/Atualizar o projeto na VPS, configurar arquivo `.env` do bot e iniciar o serviço daemon via PM2 (`pm2 start bot/src/server.ts --name conciliamec-bot`)
- [ ] [TEST] Disparar teste de requisição HTTP `POST http://100.126.50.101:3001/api/sync` e validar gravação automática no Supabase (`patio_os` e `transactions`)
- [ ] [TEST] Verificar build limpo do bot com `npm run build` na pasta `bot/`
