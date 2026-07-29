# Design: Consulta Live de OS no Bot Oficina Inteligente (bot-live-os-query)

## Arquitetura Técnica
1. **Chat IA:** `agente.tsx` envia o prompt para `ai-chat` Edge Function.
2. **Edge Function (`ai-chat`):** LLM decide invocar `consulta_detalhes_os` passando `osNumber`.
3. **Bot MCP (VPS):** Edge Function faz um POST para `https://bot.tork.services/api/query-os`.
4. **Playwright (Bot):** 
   - `server.ts` recebe a request.
   - `oficina.ts` executa `loginOI()` e navega para a página de OS.
   - Preenche o campo de pesquisa com `osNumber` e clica em buscar.
   - Analisa a tabela HTML resultante e extrai `(OS, Cliente, Placa, Status, Total)`.
5. Retorna o JSON até a LLM, que o formula na resposta final.

## Interfaces TypeScript
```typescript
interface OSRecordLive {
  osNumber: string;
  cliente: string;
  placa: string;
  status: string;
  total: number;
  dataEmissao?: string;
}
```

## Componentes / Hooks / Funções
- `bot/src/tests/test-os-query.ts` **[NOVO]**: Script TypeScript para rodar o playwright e extrair DOM/Screenshot no servidor ou ambiente local para validar seletores sem botar tudo no ar.
- `bot/src/scrapers/oficina.ts` **[MODIFICAR]**: Implementar `queryOsLive(page: Page, osNumber: string): Promise<OSRecordLive | null>`.
- `bot/src/server.ts` **[MODIFICAR]**: Rota `POST /api/query-os`.
- `supabase/functions/ai-chat/index.ts` **[MODIFICAR]**: Refatorar a tool `consulta_detalhes_os` para usar Fetch pro bot.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1 (Teste Local do Bot):** Executar `ts-node bot/src/tests/test-os-query.ts 1763`. Esperado: Log no terminal com os dados da OS extraídos do painel OI (usando usuário/senha do `.env`). Se falhar, atualizar seletores HTML.
- **Cenário 2 (Integração IA):** Com o bot deployado (ou rodando localmente apontado pelo Edge Function local), pedir "Qual o status da OS 1763?". Esperado: A Edge Function bate no bot, o bot roda Playwright invisível, devolve os dados, e a IA responde corretamente.
