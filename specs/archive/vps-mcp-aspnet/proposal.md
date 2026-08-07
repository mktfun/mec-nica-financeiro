# Proposal: Ordem de Serviço Bot Scraper (vps-mcp-aspnet)

## Problema
O agente local (ou MCP) tentava logar e buscar Ordens de Serviço (OS) a partir da máquina do usuário, mas esbarrava em timeouts, redirecionamentos e falta de persistência de sessão. Além disso, o sistema "Oficina Inteligente" utiliza ASP.NET WebForms com UpdatePanel (AJAX) para a tela de busca de OS, o que significa que navegações baseadas em mudança de URL falham (pois o POST ocorre em background na mesma página `wfOrdemDeServicoBusca.aspx`).

## Solução Proposta
Implementar a extração da OS (scraper) no próprio **bot que roda na VPS**.
O bot, que já fica ativo e possui lógica de login (`loginOI` e/ou armazenamento de `storageState`), será incrementado com a função de ir à tela de busca, preencher o número da OS, acionar o botão de busca, e **aguardar a resposta AJAX (via `page.waitForResponse`)** em vez de navegação, extraindo os dados da GridView resultante.
Por fim, uma nova rota `GET /api/os/:id` será exposta no servidor Express do bot para consumo.

## Contratos de Dados
- Não há mutação direta no Supabase por enquanto;
- Apenas extração DOM. Retornará JSON contendo dados da OS (Status, Cliente, Veículo, Total, etc.).

## API / Interface
- **Bot Scraper (`bot/src/scrapers/oficina.ts`)**: Nova função `fetchOSByNumber(page, osNumber)`.
- **Bot API (`bot/src/server.ts`)**: Novo endpoint `GET /api/os/:id` (protegido por API Key).

## Features Existentes Impactadas
- Reutiliza a função de login `loginOI` já existente.

## Risco Principal
A extração pode falhar caso os IDs do UpdatePanel ou os seletores do ASP.NET (`ctl00_cph_txtOrdemDeServicoID`, `ctl00_cph_btnBuscar`) sejam diferentes ou o timeout do Playwright ocorra devido à lentidão do AJAX.
