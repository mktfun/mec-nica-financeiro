# Design: Automação Pátio OS Multi-mês (Bot OI) - 154

## Arquitetura Técnica
A nova arquitetura introduz um controle iterativo de fatiamento de tempo (`Time-Slicing Scraper`). 
- **Endpoint:** `POST /api/sync/oficina` no bot.
- **Entrada Backend:** Se a flag `{ mode: "historical_patio" }` for enviada, o runner (`bot/src/runner.ts`) instanciará o fluxo de scraping de forma estendida.
- **Scraper OI (`bot/src/scrapers/oficina.ts`):** 
  Função `downloadRelatorioOS` será refatorada (ou criada uma nova `downloadPatioOSMultimes`) que aceita um Array de intervalos `[ { inicio: '01/07/2026', fim: '31/07/2026' }, { inicio: '01/08/2026', fim: '10/08/2026' } ]`. Ela itera, preenche o filtro `#data-inicio` e `#data-fim`, clica em baixar.
- **Console do Bot (XLSX):** O bot então lê os 2 XLSX gerados usando a lib `xlsx` e concatena os resultados em um único JSON estruturado, eliminando deduplicações de OS.
- **Upsert Banco Central:** O pacote final JSON gigantesco é enviado ou processado via Supabase (`run_migration.js` / Supabase RPC) atualizando tudo.

## Interfaces TypeScript
```typescript
interface DateSlice {
  start: string; // Ex: '01/07/2026'
  end: string;   // Ex: '31/07/2026'
}

interface SyncPayload {
  mode: 'daily' | 'historical_patio';
  slices?: DateSlice[];
  targetDate?: string; // legível pra daily
}
```

## Componentes / Hooks / Funções
1. **[NOVO] `downloadPatioOSMultimes(page: Page, slices: DateSlice[])`** em `bot/src/scrapers/oficina.ts`.
2. **[MODIFICAR] `runner.ts`** no Bot: Incluir roteamento da chamada se for `historical_patio`, orquestrando a lógica.
3. **[MODIFICAR] `bot/src/server.ts`**: Adequar recebimento do payload JSON.
4. **[NOVO] Frontend Admin:** Criação do botão (Action Trigger) "Baixar Pátio (2 meses)" no painel principal `Configurações` ou na listagem global das lojas (`src/routes/index.tsx` ou modal específico).

## Fluxo de UI e Backend
1. Usuário abre a aplicação e não quer exportar manualmente. Clica em "Atualizar Pátio de Todas as Lojas (2 meses)".
2. O App web manda o POST via porta (ex: `localhost:3002/api/sync/oficina`) com as datas corretas calculadas (Mês Passado + Atual).
3. O bot avisa "Extraindo Loja 1, Mês Passado...", baixa arquivo.
4. O bot avisa "Extraindo Loja 1, Mês Atual...", baixa arquivo.
5. Quando terminar tudo, a tela do usuário pisca dizendo "Pátio sincronizado com sucesso!" e tudo aparece cruzado nas OSs restantes.

## Infra / Deploy
Não altera portas ou infraestrutura, o Bot continuará rodando com o Puppeteer onde ele já está. Apenas estendemos a capacidade do código local do Bot.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1:** Acessar o endpoint do bot via curl/Postman enviando 2 slices do mesmo ano. Ver o log reportando download de 2 arquivos XLSX sequenciais por loja.
- **Cenário 2 (Edge Case):** A página OI demoar muito para gerar o XLSX de um mês pesado. O script de download (`waitForEvent('download')`) deve tolerar um timeout elevado (min 60s a 120s) e tentar retry.
