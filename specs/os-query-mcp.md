---
id: os-query-mcp
title: Ordem de Serviço Query (MCP Integration)
status: proposal
date: 2026-07-29
---

# 🎯 Objetivo

Implementar a capacidade do bot (scrapping) em consultar e extrair dados em tempo real de uma **Ordem de Serviço (OS)** específica no Oficina Inteligente, agindo como um servidor MCP para que a Chat UI inteligente da aplicaçÁo possa consultar esses dados por demanda.

# 🏗️ Arquitetura e Fluxo

O sistema "Oficina Inteligente" utiliza **ASP.NET WebForms** com `UpdatePanel` (AJAX). Ao buscar por uma OS, nÁo há navegaçÁo de página (URL nÁo muda), e sim um POST em background. 

O fluxo técnico do Bot será:
1. **AutenticaçÁo**: O bot carregará as credenciais do Supabase (funçÁo já existente `loginOI`).
2. **NavegaçÁo**: O bot acessa `https://sistemaoficinainteligente.com.br/wfOrdemDeServicoBusca.aspx`.
3. **InteraçÁo**: 
   - Preenche o campo `ctl00_cph_txtOrdemDeServicoID` com o número da OS desejada.
   - Clica no botÁo `ctl00_cph_btnBuscar`.
4. **Espera Inteligente**: Como a página nÁo recarrega, o bot usa `page.waitForResponse` interceptando a resposta XHR do servidor, aguardando o surgimento da GridView `table[id*="gdv"]` via timeout curto ou request response.
5. **ExtraçÁo**: Extrai os dados da tabela, como Status, Placa, Cliente, Data, Valor e ID interno.
6. **Retorno**: O Fastify do bot expõe a rota `GET /api/os/:id`, retornando um JSON limpo para o front-end / IA.

## 📝 Testes Prévios Realizados

Durante a prova de conceito, testamos o script no container de produçÁo na VPS (via Docker + SSH) e constatamos:
* O ambiente Playwright no container precisa rodar headless.
* O script de busca utilizando `page.waitForNavigation` falha com timeout porque o sistema realiza requisições **AJAX/UpdatePanel** sem alterar a URL (`networkidle` nÁo processa partial views).
* SoluçÁo: Substituir por `page.waitForResponse` ou `page.waitForSelector('.titulo')` e capturar a `GridView` atualizada via DOM Scraping.

# 🔧 Checklist de ImplementaçÁo

- [ ] Modificar o scraper `bot/src/scrapers/oficina.ts` adicionando a funçÁo `fetchOSByNumber(osNumber: string)`.
- [ ] Implementar a espera por AJAX (`waitForResponse` na rota POST do aspx).
- [ ] Parsear a tabela ASP.NET gerada e formatar em um objeto tipado.
- [ ] Criar a rota no `bot/src/server.ts` (`GET /api/os/:id`).
- [ ] Ajustar o cliente do Chat UI para invocar esse endpoint da VPS sempre que o agente decidir buscar uma OS.
