# 📋 SDD Proposal — Feature 374: Bot Itaú Empresas PJ (Playwright OFX Scraper)

## Problema
O código gerado inicialmente por IA para a automação do portal Itaú Empresas PJ possui falhas graves e anti-patterns conhecidos do ecossistema Playwright que causam instabilidade, flakiness e quebras em produção:
1. **Sleep estático (`waitForTimeout(1500)`):** Race condition ao filtrar extratos bancários com re-renderizações assíncronas do portal.
2. **Preenchimento frágil de inputs com máscara (`getByLabel.fill()`):** Campos de data bancários (`Data inicial`, `Data final`) utilizam máscaras JavaScript que truncam ou corrompem dígitos quando preenchidos com `fill()`.
3. **Ignora o combobox de período:** O Itaú Empresas PJ esconde ou desabilita campos de data livre a menos que a opção "Outro período" ou "Personalizado" esteja explicitamente selecionada no seletor de período.
4. **Race condition no modal de download:** O clique em "Salvar em OFX" e a seleção "Não, apenas lançamentos" executada de forma concorrente sem verificar prontidão do modal ou backdrop causa falhas de clique (`element intercepted / obscured`).
5. **Autenticação assistida monolítica:** O login assistido espera 10 minutos num único locator rígido (`getByText('Acessar extrato')`), quebrando se houver redirecionamentos entre subdomínios (`itau.com.br` -> `empresas.itau.com.br`), abertura de abas/popups de segurança ou microfrontends em shadow DOM.
6. **Falta de evasão anti-bot / stealth:** O Chromium padrão expõe flags de automação (`navigator.webdriver = true`), gerando bloqueios e alertas de "Dispositivo não autorizado" nos sistemas antifraude do Itaú (Akamai/Topaz).
7. **Ausência de Playwright Tracing:** Em caso de falha, apenas um screenshot estático é salvo, impossibilitando depurar estados do DOM, network e modais que sumiram.

## Solução Proposta
Refatorar e blindar a arquitetura em 3 camadas limpas e tipadas com Page Object Model (POM) moderno do Playwright:
1. **`ItauLoginPage` (`bot/src/pages/itau-login.page.ts`):**
   - Suporte a multi-páginas (ouve abas abertas pelo login).
   - Detecção resiliente de autenticação (combina marcadores de URL, botões do dashboard, e header de conta com polling adaptativo e logs de heartbeat para o operador).
   - Injeção de scripts anti-automação (`navigator.webdriver = false`).
2. **`ItauStatementPage` (`bot/src/pages/itau-statement.page.ts`):**
   - Transição assistida para tela de extratos com espera de hidratação.
   - Validação estrita e normalizada de agência/conta (Fail Closed com sanitização de pontuação).
   - Seleção inteligente de período ("Outro período") antes de preencher datas.
   - Preenchimento à prova de máscaras com `pressSequentially` e fallback dispatching `change`/`input` events.
   - Espera determinística do término do carregamento da tabela (aguarda spinners sumirem).
   - Manipulação robusta do modal OFX ("Não, apenas lançamentos") com race resiliente para download direto ou via modal.
3. **Orquestrador CLI (`bot/src/itau-runner.ts`):**
   - CLI robusta com `util.parseArgs` nativo e validação Zod.
   - Gestão de sessões e perfis de navegador isolados por loja (`data/browser-profiles/{store}`).
   - Ativação de Playwright Tracing (`trace.zip`) e screenshots de evidência em `data/evidence/{runId}`.
   - Persistência atômica do arquivo OFX em `data/downloads/{store}` com verificação de integridade SGML/XML e checksum SHA256.

## Contratos de Dados

### Interface de Configuração do Runner
```typescript
export interface ItauRunConfig {
  store: string;
  account?: string; // ex: "81153-1" ou "81153"
  agency?: string;  // ex: "0263"
  from: string;     // ISO "YYYY-MM-DD"
  to: string;       // ISO "YYYY-MM-DD"
  headless?: boolean;
  timeoutMs?: number;
}
```

### Contrato de Arquivo Salvo (OFX)
- Padrão do arquivo: `Extrato_{agencia}_{conta}_{from}_{to}.ofx`
- Validação de conteúdo: deve conter cabeçalho `OFXHEADER:` ou tag `<OFX>` e tamanho > 0 bytes.

## Arquivos Afetados

### [Arquivos Novos]
- `bot/src/pages/itau-login.page.ts`: Page Object de autenticação assistida e anti-bot.
- `bot/src/pages/itau-statement.page.ts`: Page Object de navegação, filtros de data e download do extrato OFX.
- `bot/src/itau-runner.ts`: Orquestrador CLI de execução por loja.
- `bot/src/lib/ofx-validator.ts`: Validador de integridade e persistência de arquivos OFX baixados.

### [Arquivos Existentes Modificados / Reutilizados]
- `bot/package.json`: Adição do script `run:itau` e compatibilidade de dependências.
- `bot/src/session/sessionManager.ts`: Integração com o storageState do Playwright.
- `bot/src/config/empresas.json`: Resolução de aliases e agência/conta associados a cada loja.

## Plano de Rollback
1. Como as classes do Itaú são novos módulos desacoplados no diretório `bot/src/`, a reversão é 100% segura e não afeta os scrapers existentes (`oficina.ts` e `rede.ts`).
2. Para reverter, basta remover os novos arquivos `bot/src/pages/itau-*` e o script em `bot/package.json`.

## Risco Principal e Mitigação
- **Risco:** Atualizações visuais no layout do Itaú Empresas PJ ou mudanças no texto dos botões ("Salvar em OFX", "Não, apenas lançamentos").
- **Mitigação:** Uso de seletores baseados em papéis acessíveis (`getByRole`), expressões regulares tolerantes a variações de maiúsculas/minúsculas e pontuação, além de geração automática de Playwright Traces (`trace.zip`) para diagnóstico visual imediato de qualquer alteração de DOM bancário.
