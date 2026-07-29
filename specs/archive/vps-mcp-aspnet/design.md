# Design: Ordem de Serviço Bot Scraper (vps-mcp-aspnet)

## Arquitetura Técnica
Cliente (Chat UI / MCP) → `GET /api/os/:id` → `server.ts` (Express) → Inicia (ou reusa) Sessão Playwright → `scrapers/oficina.ts` (`fetchOSByNumber`) → Navega para `wfOrdemDeServicoBusca.aspx` → Preenche formulário → Clica em "Buscar" → Aguarda AJAX → Extrai dados → Retorna JSON.

## Interfaces TypeScript
```typescript
export interface OSRecord {
  idInterno?: string;
  osNumber: string;
  cliente: string;
  placa: string;
  data: string;
  status: string;
  valor: string;
}
```

## Componentes / Hooks / Funções
- **`bot/src/scrapers/oficina.ts`**: Nova função `fetchOSByNumber(context: BrowserContext, osNumber: string): Promise<OSRecord>` (Garante o login primeiro ou reusa, acessa a página, extrai os dados via AJAX UpdatePanel).
- **`bot/src/server.ts`**: Adicionar rota `app.get('/api/os/:id', requireApiKey, async (req, res) => { ... })`

## Fluxo de Automação Playwright
1. `page.goto('https://sistemaoficinainteligente.com.br/wfOrdemDeServicoBusca.aspx')`
2. `page.fill('input[id*="txtOrdemDeServicoID"]', osNumber)`
3. Acionar evento de busca:
   ```typescript
   const [response] = await Promise.all([
     page.waitForResponse(res => res.url().includes('wfOrdemDeServicoBusca.aspx') && res.status() === 200),
     page.click('input[id*="btnBuscar"]')
   ]);
   ```
4. `page.waitForSelector('table[id*="gdv"] tr.grid_row')` ou timeout de 10s caso não encontre (OS não existe).
5. Ler colunas (ID, Status, Cliente, Data, etc.)
6. Retornar dados.

## Infra / Deploy
- O bot já está na VPS e deve ser reiniciado após as mudanças.
- Variáveis de ambiente: `BOT_API_KEY`, credenciais do Oficina Inteligente devem estar configuradas no `.env` da VPS.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1**: Buscar uma OS existente → Preenche OS ID, clica buscar, AJAX ocorre, extrai linha da grid, retorna JSON com `success: true`.
- **Cenário 2**: Buscar uma OS inexistente → AJAX ocorre, mas tabela fica vazia ou exibe "nenhum registro encontrado" → Retorna erro `404` ou JSON com `success: false, error: 'OS não encontrada'`.
