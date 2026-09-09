# 📋 Spec Plan — Feature 374: Bot Itaú Empresas PJ (Playwright OFX Scraper)

## Tarefas de Implementação

- [x] `[BOT-PAGES]` Criar `bot/src/pages/itau-login.page.ts` com suporte anti-bot stealth, monitoramento multi-abas e polling adaptativo de sessão com heartbeat.
  - **Critério de Verificação:** Classe exporta `open()` e `waitForAuthenticatedSession(timeoutMinutes?: number)`, detectando corretamente redirecionamentos e sem quebrar se abas extras forem abertas.

- [x] `[BOT-PAGES]` Criar `bot/src/pages/itau-statement.page.ts` com navegação, validação de conta ("Fail Closed"), preenchimento de datas resiliente a máscaras, e interceptação de modal de download OFX sem `waitForTimeout`.
  - **Critério de Verificação:** Métodos `goToStatement()`, `validateAccount(expectedAccount)`, `setCustomRange(fromBr, toBr)` e `downloadOfx()` implementados com zero sleeps estáticos e seletores por `getByRole`.

- [x] `[BOT-LIB]` Criar `bot/src/lib/ofx-validator.ts` para persistência atômica e validação de formato OFX (cabeçalho SGML/XML, tamanho > 0 bytes, hash SHA256).
  - **Critério de Verificação:** Arquivos baixados são salvos em `data/downloads/{store}/Extrato_...ofx` e rejeitam respostas vazias ou páginas HTML de erro.

- [x] `[BOT-RUNNER]` Criar `bot/src/itau-runner.ts` com orquestrador CLI robusto, parsing com `util.parseArgs` e validação Zod, persistência de contexto em `data/browser-profiles/{store}` e salvamento de Playwright Traces (`trace.zip`) e screenshots de erro.
  - **Critério de Verificação:** Execução via linha de comando aceita `--store`, `--account`, `--from`, `--to`, valida entradas e gerencia o ciclo de vida do browser context.

- [x] `[BOT-CONFIG]` Atualizar `bot/package.json` adicionando o script `run:itau` (`ts-node src/itau-runner.ts`) e garantindo consistência das dependências.
  - **Critério de Verificação:** `npm run run:itau -- --help` exibe ajuda sem erros de compilação TypeScript.

- [x] `[TEST-CHECK]` Executar typecheck (`tsc --noEmit` ou teste de sintaxe) nos novos arquivos criados em `bot/`.
  - **Critério de Verificação:** Compilação limpa sem erros de tipo no módulo do bot.
