# Spec Plan: Ordem de Serviço Bot Scraper (vps-mcp-aspnet)

## Tasks

- [x] [BACKEND] Modificar `bot/src/scrapers/oficina.ts` adicionando a interface `OSRecord`.
- [x] [BACKEND] Implementar `fetchOSByNumber(context, osNumber)` em `bot/src/scrapers/oficina.ts` que gerencia `loginOI`, navega até a busca, insere número e aguarda o AJAX do ASP.NET.
- [x] [BACKEND] Adicionar extração DOM da GridView (`table[id*="gdv"]`) no método `fetchOSByNumber`.
- [x] [BACKEND] Modificar `bot/src/server.ts` para instanciar o browser globalmente ou por requisição, e adicionar o endpoint `GET /api/os/:id`.
- [x] [BACKEND] No `GET /api/os/:id`, ler o ID, chamar `fetchOSByNumber` e retornar JSON. Tratamento de erro 404/500 caso a OS não exista ou falhe o scrap.
- [x] [TEST] Verificar com teste manual simulando uma requisição GET para `/api/os/<numero-existente>`.
- [x] [TEST] Verificar com teste manual simulando requisição GET para `/api/os/<numero-falso>` para testar timeout/tratamento de exceção do UpdatePanel vazio.
