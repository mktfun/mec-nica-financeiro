import type { BrowserContext, Page } from '@playwright/test';

export interface AutonomousLoginCredentials {
  agency: string;
  account: string;
  cpf: string;
  password?: string;
}

/**
 * Page Object para Automação de Login no Portal Itaú Empresas PJ.
 * 
 * Responsabilidades:
 * 1. Inicializar contexto com técnicas de evasão anti-bot (stealth).
 * 2. Preencher de forma 100% autônoma Agência, Conta Corrente, CPF do Operador e Senha Eletrônica.
 * 3. Dispensar modais de cookies e tratar erros de preenchimento.
 * 4. Fazer polling adaptativo até que a sessão autenticada seja confirmada no dashboard PJ.
 */
export class ItauLoginPage {
  private activePage: Page;

  constructor(
    private readonly context: BrowserContext,
    initialPage?: Page
  ) {
    this.activePage = initialPage ?? context.pages()[0];

    // Rastreia abas novas abertas durante o fluxo de login
    this.context.on('page', (newPage) => {
      this.activePage = newPage;
      this.injectStealthScripts(newPage).catch(() => {});
    });
  }

  /**
   * Injeta propriedades para mascarar automação contra scanners antifraude.
   */
  private async injectStealthScripts(page: Page): Promise<void> {
    await page.addInitScript(() => {
      // Mascara navigator.webdriver
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });

      // Idiomas realistas
      Object.defineProperty(navigator, 'languages', {
        get: () => ['pt-BR', 'pt', 'en-US', 'en'],
      });

      // Plugins fictícios para se comportar como navegador desktop real
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });
    }).catch(() => {});
  }

  /**
   * Retorna a página atualmente ativa no contexto.
   */
  getPage(): Page {
    return this.activePage;
  }

  /**
   * Abre a URL inicial do Itaú e prepara ambiente.
   */
  async open(url = 'https://www.itau.com.br/'): Promise<void> {
    await this.injectStealthScripts(this.activePage);

    console.log(`[ItauLogin] Acessando portal: ${url}`);
    await this.activePage.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });
  }

  /**
   * Executa o fluxo de login 100% autônomo no portal Itaú Empresas PJ.
   * Preenche Agência, Conta, CPF, senha no teclado virtual e seleciona acesso de consulta sem iToken.
   */
  async loginAutonomous(credentials: AutonomousLoginCredentials): Promise<Page> {
    await this.open('https://www.itau.com.br/');
    await this.activePage.waitForTimeout(2000);

    // 1. Dispensa banner de cookies caso presente
    try {
      const cookieBtn = this.activePage
        .locator('button:has-text("Aceitar todos"), button:has-text("Rejeitar não essenciais")')
        .first();
      if (await cookieBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await cookieBtn.click().catch(() => {});
        await this.activePage.waitForTimeout(500);
      }
    } catch {}

    // 2. Preenche Agência
    const cleanAgency = credentials.agency.replace(/\D/g, '');
    console.log(`[ItauLogin] 🏦 Preenchendo agência: ${cleanAgency}...`);
    const agenciaInput = this.activePage.locator('#idl-menu-agency');
    await agenciaInput.waitFor({ state: 'visible', timeout: 15000 });
    await agenciaInput.click();
    await agenciaInput.pressSequentially(cleanAgency, { delay: 70 });
    await agenciaInput.press('Tab');

    // 3. Preenche Conta Corrente com traço/dígito verificador
    const cleanAccount = credentials.account.replace(/\D/g, '');
    const accountWithHyphen = credentials.account.includes('-')
      ? credentials.account
      : cleanAccount.length > 1
      ? `${cleanAccount.slice(0, -1)}-${cleanAccount.slice(-1)}`
      : cleanAccount;

    console.log(`[ItauLogin] 💳 Preenchendo conta corrente: ${accountWithHyphen}...`);
    const contaInput = this.activePage.locator('#idl-menu-account');
    await contaInput.waitFor({ state: 'visible', timeout: 10000 });
    await contaInput.click();
    await contaInput.pressSequentially(accountWithHyphen, { delay: 70 });
    await contaInput.press('Tab');

    // 4. Submete primeiro passo
    await this.activePage.waitForTimeout(600);
    const submitBtn = this.activePage.locator('#idl-btn-login-ok, [aria-label*="acessar" i]').first();
    await submitBtn.waitFor({ state: 'visible', timeout: 10000 });
    console.log('[ItauLogin] ➡️ Clicando em acessar...');
    await submitBtn.click();

    // 5. Preenche CPF do Operador
    console.log('[ItauLogin] 👤 Aguardando campo de CPF do operador (#campoCpf)...');
    const cpfInput = this.activePage.locator('#campoCpf');
    await cpfInput.waitFor({ state: 'visible', timeout: 30000 });

    const cleanCpf = credentials.cpf.replace(/\D/g, '');
    console.log(`[ItauLogin] 📝 Preenchendo CPF do operador: ${cleanCpf.slice(0, 3)}...`);
    await cpfInput.click();
    await cpfInput.pressSequentially(cleanCpf, { delay: 70 });
    await this.activePage.waitForTimeout(500);

    const continuarBtn = this.activePage
      .locator('button:has-text("continuar"), a:has-text("continuar"), button.ids-main-button')
      .first();
    console.log('[ItauLogin] ➡️ Clicando em continuar após CPF...');
    await continuarBtn.click();

    // 6. Aguarda tela de Senha / Teclado Virtual (o spinner leva ~7s para sumir)
    console.log('[ItauLogin] ⏳ Aguardando carregamento da tela de acesso / teclado virtual...');
    try {
      await this.activePage.locator('text=/aguarde o conteúdo ser carregado/i').waitFor({
        state: 'hidden',
        timeout: 25000,
      });
    } catch {}

    // 7. Processa teclado virtual e seleção de acesso de consulta
    if (credentials.password) {
      await this.handlePasswordAndAccessChoice(credentials.password);
    }

    // 8. Confirma sessão logada no dashboard PJ
    return await this.waitForAuthenticatedSession(3);
  }

  /**
   * Preenche a senha eletrônica no teclado virtual e seleciona o acesso básico de consulta (Sem iToken).
   */
  private async handlePasswordAndAccessChoice(password: string): Promise<void> {
    try {
      console.log('[ItauLogin] 🔑 Procurando teclado virtual...');
      const tecladoMarker = this.activePage
        .locator('a, button, div[role="button"]')
        .filter({ hasText: /\d\s*ou\s*\d/ })
        .or(this.activePage.locator('text=/teclado virtual|senha de acesso|página de acesso/i'))
        .first();

      await tecladoMarker.waitFor({ state: 'visible', timeout: 35000 });
      console.log(`[ItauLogin] 🔢 Digitando senha de ${password.length} dígitos no teclado virtual...`);

      for (let i = 0; i < password.length; i++) {
        const digit = password[i];
        // Encontra a tecla que contém o dígito (ex: "0 ou 1", "6 ou 8", "4 ou 5")
        const key = this.activePage
          .locator('a, button, div[role="button"]')
          .filter({ hasText: new RegExp(`(^|\\b|ou\\s*)${digit}(\\b|\\s*ou|$)`) })
          .first();

        await key.waitFor({ state: 'visible', timeout: 6000 });
        await key.click();
        await this.activePage.waitForTimeout(250);
      }

      // Clica no botão laranja "acessar"
      console.log('[ItauLogin] ➡️ Clicando em acessar no teclado virtual...');
      const acessarBtn = this.activePage
        .locator('button:has-text("acessar"), a:has-text("acessar")')
        .first();
      await acessarBtn.waitFor({ state: 'visible', timeout: 5000 });
      await acessarBtn.click();

      // 8. TELA CRÍTICA: "Como você quer acessar?"
      console.log('[ItauLogin] 🛡️ Aguardando tela "Como você quer acessar?"...');
      const accessChoiceHeader = this.activePage.locator('text=/como você quer acessar/i').first();
      const hasChoice = await accessChoiceHeader
        .waitFor({ state: 'visible', timeout: 20_000 })
        .then(() => true)
        .catch(() => false);

      if (hasChoice) {
        console.log('[ItauLogin] ✅ Tela de escolha detectada! Selecionando "Com acesso básico, para apenas fazer consultas, sem precisar de iToken"...');
        
        // Seleciona a opção de apenas consulta (sem iToken)
        const noItokenOption = this.activePage
          .locator('label, span, div, p')
          .filter({ hasText: /sem precisar de itoken|apenas fazer consultas/i })
          .first();

        await noItokenOption.waitFor({ state: 'visible', timeout: 8000 });
        await noItokenOption.click();
        await this.activePage.waitForTimeout(500);

        // Clica em continuar
        const continuarAcessoBtn = this.activePage
          .locator('button:has-text("continuar"), a:has-text("continuar"), button.ids-main-button')
          .first();
        await continuarAcessoBtn.waitFor({ state: 'visible', timeout: 8000 });
        await continuarAcessoBtn.click();
        console.log('[ItauLogin] 🚀 Acesso de consulta sem iToken confirmado!');
      } else {
        console.log('[ItauLogin] Tela de escolha não foi apresentada (usuário pode já ter entrado direto).');
      }
    } catch (err: any) {
      console.warn('[ItauLogin] Aviso durante autenticação do operador:', err.message || err);
    }
  }

  /**
   * Aguarda que a sessão seja autenticada e o portal PJ seja carregado.
   * Suporta tanto o domínio moderno (empresas.cloud.itau.com.br) quanto o legado.
   */
  async waitForAuthenticatedSession(timeoutMinutes = 10): Promise<Page> {
    const timeoutMs = timeoutMinutes * 60_000;
    const startTime = Date.now();
    const intervalMs = 2_000;
    let lastHeartbeat = 0;

    console.log(`[ItauLogin] Aguardando confirmação da sessão no portal PJ (tempo limite: ${timeoutMinutes} min)...`);

    while (Date.now() - startTime < timeoutMs) {
      const elapsedSec = Math.floor((Date.now() - startTime) / 1000);

      // Emite log a cada 15 segundos para feedback no terminal
      if (elapsedSec - lastHeartbeat >= 15) {
        lastHeartbeat = elapsedSec;
        console.log(`[ItauLogin] Aguardando sessão autenticada... (${elapsedSec}s decorridos)`);
      }

      // Varre todas as páginas abertas no contexto procurando indícios do dashboard logado
      for (const page of this.context.pages()) {
        try {
          if (page.isClosed()) continue;

          const currentUrl = page.url();

          // 1. Checagem por Marcadores no DOM (Dashboard PJ)
          const extratoMarker = page.locator('text=/acessar extrato/i, [aria-label*="extrato" i]').first();
          const isMarkerVisible = await extratoMarker.isVisible().catch(() => false);

          const saldoCard = page.locator('text=/saldo e extrato/i, text=/lançamentos futuros/i').first();
          const isSaldoVisible = await saldoCard.isVisible().catch(() => false);

          const dashboardElement = page.locator(
            'input[placeholder*="buscando" i], [aria-label*="buscando" i], text=/Acesso rápido/i, text=/Pendências/i, text=/Central Pix/i, [aria-label*="sair" i]'
          ).first();
          const hasDashboardElement = await dashboardElement.isVisible().catch(() => false);

          // 2. Checagem por URL de ambiente autenticado PJ
          const isCloudEmpresas = /empresas\.cloud\.itau\.com\.br/i.test(currentUrl) &&
                                  !/login|identificacao|autenticacao|router/i.test(currentUrl);

          const isDashboardUrl = /empresas\.(cloud\.)?itau\.com\.br|bankline|dashboard|home-pj/i.test(currentUrl) &&
                                !/login|identificacao|autenticacao|router/i.test(currentUrl);

          if (isMarkerVisible || isSaldoVisible || (isCloudEmpresas && hasDashboardElement) || (isDashboardUrl && hasDashboardElement) || isCloudEmpresas) {
            console.log(`[ItauLogin] ✅ Sessão autenticada detectada na página: ${currentUrl}`);
            this.activePage = page;
            await page.waitForLoadState('domcontentloaded').catch(() => {});
            return page;
          }
        } catch {
          // Ignora falhas transitórias durante navegações de tela
        }
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    throw new Error(
      `[ItauLogin] Tempo limite excedido (${timeoutMinutes} minutos) aguardando login assistido do operador.`
    );
  }
}
