# 📐 SDD Design — Feature 374: Bot Itaú Empresas PJ (Playwright OFX Scraper)

## 1. Arquitetura de Fluxo e Componentes

```
                                  [ CLI / Runner: bot/src/itau-runner.ts ]
                                                     │
                                                     ▼
                                 [ Chromium Persistent Context + Stealth ]
                                 (userDataDir isolado por loja + Tracing)
                                                     │
               ┌─────────────────────────────────────┴─────────────────────────────────────┐
               ▼                                                                           ▼
      [ ItauLoginPage ]                                                          [ ItauStatementPage ]
  - Injeta navigator.webdriver bypass                                         - Localiza link "Acessar extrato"
  - Monitora redirecionamentos / popups                                       - Valida Agência/Conta (Fail Closed)
  - Polling adaptativo com heartbeat CLI                                      - Ajusta combobox para "Outro período"
  - Detecta dashboard PJ                                                      - Digita datas via pressSequentially
                                                                              - Espera spinners/loaders sumirem
                                                                              - Clica "Salvar em OFX"
                                                                              - Trata modal "Não, apenas lançamentos"
                                                                              - Captura Download event Playwright
                                                     │
                                                     ▼
                                           [ ofx-validator.ts ]
                                 - Valida tamanho > 0 bytes
                                 - Valida cabeçalho OFX SGML / XML
                                 - Calcula SHA256 para auditoria
                                 - Salva em data/downloads/{store}/Extrato_...ofx
```

## 2. Interfaces TypeScript Reais

```typescript
// bot/src/types/itau.ts

export interface ItauRunOptions {
  store: string;
  account?: string;
  agency?: string;
  from: string; // Formato YYYY-MM-DD
  to: string;   // Formato YYYY-MM-DD
  headless?: boolean;
  timeoutMinutes?: number;
}

export interface StatementFilterParams {
  startDateBr: string; // Formato DD/MM/AAAA
  endDateBr: string;   // Formato DD/MM/AAAA
}

export interface PersistOfxOptions {
  download: import('@playwright/test').Download;
  outputDir: string;
  store: string;
  agency?: string;
  account?: string;
  fromDate: string;
  toDate: string;
}

export interface PersistOfxResult {
  filePath: string;
  fileName: string;
  fileSizeBytes: number;
  sha256: string;
  isSgml: boolean;
}
```

## 3. Implementação dos Page Objects e Validador (Playwright Moderno)

### 3.1 `ItauLoginPage` (`bot/src/pages/itau-login.page.ts`)
- **Navegação com Stealth:** Injeta script de evasão de automação (`Object.defineProperty(navigator, 'webdriver', { get: () => undefined })`).
- **Suporte Multi-Abas:** Registra listener `context.on('page')` para rastrear popups que o Itaú costuma abrir no fluxo de login PJ.
- **Heartbeat & Polling de Sessão:** Ao invés de um único `waitFor` estático que pode quebrar com redirecionamentos de página, utiliza um loop com `Promise.race` verificando:
  - Presença do card/botão de extrato (`getByRole('link', { name: /acessar extrato/i })` ou `getByText(/acessar extrato/i)`);
  - Mudança na URL para o domínio logado (`/empresas/`, `/bankline/`, `/dashboard/`);
  - Timeout com logs de batimento a cada 15 segundos no terminal ("Aguardando autenticação humana no navegador... decorridos Xs").

### 3.2 `ItauStatementPage` (`bot/src/pages/itau-statement.page.ts`)
- **Navegação:** `await this.page.getByRole('link', { name: /acessar extrato/i }).first().click()`.
- **Validação de Conta (Fail Closed):**
  - Sanitiza o número da conta (ex: extrai `81153` de `81153-1`).
  - Aguarda o elemento com regex flexível `new RegExp(sanitizedAccount, 'i')`.
  - Se a conta ativa na tela divergir da conta solicitada na CLI, aborta imediatamente com erro explícito antes de qualquer download.
- **Filtro de Período Resiliente:**
  - Verifica se o combobox de seleção de período está visível. Se estiver, seleciona a opção "Outro período" ou "Personalizado".
  - Para os campos `Data inicial` e `Data final`:
    - `await input.click()`;
    - `await input.press('ControlOrMeta+a')`;
    - `await input.press('Backspace')`;
    - `await input.pressSequentially(dateBr, { delay: 40 })`;
    - `await input.press('Tab')`;
  - Clica em `Filtrar`: `await this.page.getByRole('button', { name: /^filtrar$/i }).click()`.
  - **Zero `waitForTimeout`:** Aguarda spinners e skeletons desaparecerem (`page.locator('[data-testid*="loading"], .loading, .spinner').waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => {})`), e aguarda o botão de exportação estar visível e habilitado.
- **Download do OFX:**
  - Localiza o gatilho de exportação: `this.page.getByRole('button', { name: /salvar em ofx/i }).or(this.page.getByText(/salvar em ofx/i)).first()`.
  - Dispara o clique e aguarda ou o download direto ou o modal:
    - Se o modal "Deseja salvar o extrato OFX com o saldo do dia?" for exibido, clica no botão `getByRole('button', { name: /não,\s*apenas\s*lançamentos/i })`.
    - Retorna o objeto `Download` do Playwright.

### 3.3 `ofx-validator.ts` (`bot/src/lib/ofx-validator.ts`)
- Salva o arquivo temporariamente e inspeciona os primeiros 512 bytes.
- Garante que não é uma página HTML de erro baixada com extensão `.ofx` (cenário comum quando a sessão expira).
- Salva no destino final `data/downloads/{store}/Extrato_{agencia}_{conta}_{from}_{to}.ofx`.
- Gera hash SHA-256 e tamanho para auditoria.

## 4. Cenários Obrigatórios

### 4.1 Happy Path
1. Operador executa `npm run run:itau -- --store matriz --account "81153-1" --from 2026-09-01 --to 2026-09-08`.
2. O navegador Chromium é aberto com viewport 1440x960 e flags de stealth ativas.
3. A página inicial do Itaú é carregada. O operador preenche agência, conta, operador e senha no teclado virtual e conclui 2FA.
4. O bot detecta a sessão ativa pelo surgimento do link do extrato no dashboard.
5. O bot navega para a tela de extrato, valida que a conta ativa confere com `81153-1`.
6. Seleciona "Outro período", digita `01/09/2026` e `08/09/2026` sem quebra de máscara e clica em "Filtrar".
7. Aguarda a tabela renderizar, clica em "Salvar em OFX", responde "Não, apenas lançamentos" no modal.
8. O arquivo OFX é salvo e validado com sucesso em `data/downloads/matriz/Extrato_0263_81153-1_2026-09-01_2026-09-08.ofx`.
9. Retorno com código 0 e log de sucesso com hash SHA256.

### 4.2 Edge Cases
1. **Conta Ativa Divergente (Fail Closed):** O operador logou com a conta de outra loja por engano. O validador rejeita com mensagem: `[FATAL] Conta ativa no banco não corresponde à conta configurada da loja (Esperada: 81153-1)`. A automação aborta e grava `trace.zip` sem baixar arquivo incorreto.
2. **Timeout de Autenticação / Fechamento de Janela:** Se o operador fechar o navegador antes de concluir o login ou o tempo limite expirar, o processo encerra ordenadamente, desaloca recursos e salva relatório de falha em `data/evidence/{runId}/falha.png`.
3. **Download Retorna HTML de Erro (Sessão Derrubada):** Se o banco retornar uma página de sessão expirada mascarada como OFX de 0 bytes ou contendo tags HTML, o `ofx-validator` rejeita o arquivo, emitindo alerta e impedindo ingestão de lixo no pipeline contábil.

## 5. Critérios de Aceitação Verificáveis
1. **Eliminação de Anti-patterns:** Zero ocorrências de `page.waitForTimeout` no código do bot. Toda espera é orientada a eventos, locators ou requisições.
2. **Resiliência a Máscaras:** Campos de data preenchidos via `pressSequentially` e tabulação, garantindo que `01/09/2026` chegue sem corrupção de dígitos ao DOM.
3. **Playwright Tracing Ativo:** Qualquer execução com falha salva `data/evidence/{runId}/trace.zip`, inspecionável pelo comando `npx playwright show-trace`.
4. **Verificação de Integridade:** Todo OFX baixado passa pela validação de cabeçalho (`OFXHEADER:` ou `<OFX>`) e tamanho > 0 bytes.
5. **Tipagem Estrita:** 100% de conformidade com TypeScript `strict`, sem uso de `any`.

## 6. Cenários de Teste [SCAN -> INFER -> VERIFY -> FIX]

- **Teste 1 [Preenchimento de Máscara de Data]:**
  - *SCAN:* O input de data no portal Itaú formata automaticamente caracteres digitados para `DD/MM/AAAA`.
  - *INFER:* Usar `.fill('01/09/2026')` causa pulo de cursor no React, resultando em strings incompletas ou invertidas.
  - *VERIFY:* Executar rotina com `pressSequentially(date, { delay: 30 })` e checar o valor real da propriedade `input.inputValue()`.
  - *FIX:* Fallback via `input.evaluate((el: HTMLInputElement, val) => { el.value = val; el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true})); })`.

- **Teste 2 [Modal de Salvar OFX com Saldo]:**
  - *SCAN:* Ao clicar em "Salvar em OFX", o Itaú abre um modal flutuante perguntando "Deseja salvar o extrato OFX com o saldo do dia?".
  - *INFER:* Se o clique no botão do modal for disparado antes do backdrop completar a animação CSS, o Playwright pode emitir erro de target obscurecido.
  - *VERIFY:* Localizar o botão "Não, apenas lançamentos", aguardar `toBeVisible()` e usar `.click()`.
  - *FIX:* Envolver a captura do download em `Promise.all([page.waitForEvent('download'), modalButton.click()])` com tratamento de fallback caso o modal não apareça.
