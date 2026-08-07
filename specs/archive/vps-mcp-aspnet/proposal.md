# Proposal: Ordem de Serviço Bot Scraper (vps-mcp-aspnet)

## Problema
O agente local (ou MCP) tentava logar e buscar Ordens de Serviço (OS) a partir da máquina do usuário, mas esbarrava em timeouts, redirecionamentos e falta de persistência de sessÁo. Além disso, o sistema "Oficina Inteligente" utiliza ASP.NET WebForms com UpdatePanel (AJAX) para a tela de busca de OS, o que significa que navegações baseadas em mudança de URL falham (pois o POST ocorre em background na mesma página `wfOrdemDeServicoBusca.aspx`).

## SoluçÁo Proposta
Implementar a extraçÁo da OS (scraper) no próprio **bot que roda na VPS**.
O bot, que já fica ativo e possui lógica de login (`loginOI` e/ou armazenamento de `storageState`), será incrementado com a funçÁo de ir à tela de busca, preencher o número da OS, acionar o botÁo de busca, e **aguardar a resposta AJAX (via `page.waitForResponse`)** em vez de navegaçÁo, extraindo os dados da GridView resultante.
Por fim, uma nova rota `GET /api/os/:id` será exposta no servidor Express do bot para consumo.

## Contratos de Dados
- NÁo há mutaçÁo direta no Supabase por enquanto;
- Apenas extraçÁo DOM. Retornará JSON contendo dados da OS (Status, Cliente, Veículo, Total, etc.).

## API / Interface
- **Bot Scraper (`bot/src/scrapers/oficina.ts`)**: Nova funçÁo `fetchOSByNumber(page, osNumber)`.
- **Bot API (`bot/src/server.ts`)**: Novo endpoint `GET /api/os/:id` (protegido por API Key).

## Features Existentes Impactadas
- Reutiliza a funçÁo de login `loginOI` já existente.

## Risco Principal
A extraçÁo pode falhar caso os IDs do UpdatePanel ou os seletores do ASP.NET (`ctl00_cph_txtOrdemDeServicoID`, `ctl00_cph_btnBuscar`) sejam diferentes ou o timeout do Playwright ocorra devido à lentidÁo do AJAX.
