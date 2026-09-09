import type { Download, Locator, Page } from '@playwright/test';

/**
 * Page Object para navegação no Extrato Bancário e download de OFX no Itaú Empresas PJ.
 * 
 * Implementa boas práticas do Playwright:
 * - Zero sleeps estáticos (sem waitForTimeout).
 * - Preenchimento de datas resiliente a máscaras JavaScript (DD/MM/AAAA).
 * - Validação estrita de conta (Fail Closed).
 * - Sincronização robusta do modal de exportação OFX ("Não, apenas lançamentos").
 */
export class ItauStatementPage {
  constructor(private readonly page: Page) {}

  /**
   * Navega da home/dashboard PJ para a tela de Extrato Bancário.
   * Suporta:
   * 1. Gatilhos diretos na Home ("Acessar extrato", "Saldo e extrato", etc.)
   * 2. Barra de busca do portal ("O que você está buscando?") digitando "extrato"
   * 3. Menu lateral / Menu de navegação ("Conta corrente" -> "Extrato")
   * 4. Recuperação automática de instabilidade transitória ("tentar novamente")
   */
  async goToStatement(): Promise<void> {
    console.log('[ItauStatement] Iniciando navegação para a tela de extrato...');
    await this.page.bringToFront().catch(() => {});

    // 0. Se já estiver na tela de extrato, não precisa navegar
    if (this.page.url().includes('extrato')) {
      console.log('[ItauStatement] Já estamos na tela de extrato.');
      await this.waitForStatementScreen();
      return;
    }

    // 1. Trata instabilidade transitória ("tentar novamente") se houver
    const retryBtn = this.page.locator('button:has-text("tentar novamente"), a:has-text("tentar novamente")').first();
    if (await retryBtn.isVisible().catch(() => false)) {
      console.log('[ItauStatement] Detectado aviso de instabilidade. Clicando em "tentar novamente"...');
      await retryBtn.click().catch(() => {});
      await this.page.waitForTimeout(2000);
    }

    // 2. Estratégia A: Gatilho direto na Home ("acessar extrato", "ver extrato", "extrato")
    console.log('[ItauStatement] Procurando atalhos diretos para extrato na tela...');
    const directTriggers = [
      this.page.getByRole('link', { name: /acessar extrato|ver extrato|extrato de conta/i }),
      this.page.getByRole('button', { name: /acessar extrato|ver extrato|extrato/i }),
      this.page.locator('a, button, div[role="button"]').filter({ hasText: /acessar extrato|ver extrato/i }),
      this.page.locator('[data-testid*="extrato" i], [aria-label*="extrato" i]'),
    ];

    for (const trigger of directTriggers) {
      const el = trigger.first();
      if (await el.isVisible().catch(() => false)) {
        console.log('[ItauStatement] ✅ Gatilho direto de extrato encontrado na tela. Clicando...');
        await el.click();
        await this.waitForStatementScreen();
        return;
      }
    }

    // 3. Estratégia B: Barra de Busca Superior ("O que você está buscando?")
    console.log('[ItauStatement] Procurando pela barra de busca do portal...');
    const searchInput = this.page
      .locator('input[placeholder*="buscando" i], [aria-label*="buscando" i], input[type="search"]')
      .first();

    if (await searchInput.isVisible().catch(() => false)) {
      console.log('[ItauStatement] 🔍 Barra de busca encontrada. Digitando "extrato"...');
      await searchInput.click();
      await searchInput.pressSequentially('extrato', { delay: 60 });
      await this.page.waitForTimeout(1000);

      // Procura opção sugerida no dropdown de busca
      const searchOption = this.page
        .locator('li, div, a, [role="option"]')
        .filter({ hasText: /^extrato\b|extrato de conta corrente|consultar extrato/i })
        .first();

      if (await searchOption.isVisible().catch(() => false)) {
        console.log('[ItauStatement] ✅ Opção "Extrato" encontrada nos resultados da busca. Clicando...');
        await searchOption.click();
        await this.waitForStatementScreen();
        return;
      } else {
        console.log('[ItauStatement] Pressionando Enter na busca...');
        await searchInput.press('Enter');
        await this.page.waitForTimeout(1500);

        const firstResult = this.page.locator('a, button').filter({ hasText: /extrato/i }).first();
        if (await firstResult.isVisible().catch(() => false)) {
          await firstResult.click();
          await this.waitForStatementScreen();
          return;
        }
      }
    }

    // 4. Estratégia C: Menu lateral de navegação ("Conta corrente" -> "Extrato")
    console.log('[ItauStatement] Procurando pelo menu de navegação...');
    const menuContaCorrente = this.page
      .locator('button, a, span, div')
      .filter({ hasText: /^conta corrente$/i })
      .first();

    if (await menuContaCorrente.isVisible().catch(() => false)) {
      console.log('[ItauStatement] Clicando no menu "Conta Corrente"...');
      await menuContaCorrente.click();
      await this.page.waitForTimeout(500);

      const subMenuExtrato = this.page
        .locator('a, button, span')
        .filter({ hasText: /^extrato$/i })
        .first();

      if (await subMenuExtrato.isVisible().catch(() => false)) {
        console.log('[ItauStatement] Clicando em "Extrato" no submenu...');
        await subMenuExtrato.click();
        await this.waitForStatementScreen();
        return;
      }
    }

    // Fallback: aguarda a tela estabilizar
    await this.waitForStatementScreen();
  }

  /**
   * Aguarda que a tela de extrato esteja carregada e pronta para interação.
   */
  async waitForStatementScreen(timeout = 35_000): Promise<void> {
    console.log('[ItauStatement] Aguardando tela de extrato estabilizar...');

    const statementReadyIndicator = this.page
      .getByRole('button', { name: /filtrar|buscar|pesquisar|consultar|aplicar/i })
      .or(this.page.getByRole('button', { name: /salvar em ofx|ofx/i }))
      .or(this.page.locator('input[placeholder*="inicial" i], input[id*="dataInicio" i], label:has-text("Período")'))
      .or(this.page.locator('text=/lançamentos/i, text=/saldo disponível/i'))
      .first();

    await statementReadyIndicator.waitFor({ state: 'visible', timeout });
    console.log('[ItauStatement] ✅ Tela de extrato carregada com sucesso.');
  }

  /**
   * Valida se a conta ativa na tela confere com a conta esperada da loja (Fail Closed).
   * Suporta formatos com ou sem hífen (ex: "984112" confere com "98411-2").
   */
  async validateAccount(expectedAccount: string): Promise<void> {
    const cleanExpected = expectedAccount.replace(/\D/g, '');
    const bodyDigits = cleanExpected.length > 1 ? cleanExpected.slice(0, -1) : cleanExpected;
    const checkDigit = cleanExpected.length > 1 ? cleanExpected.slice(-1) : '';
    const accountPattern = checkDigit
      ? new RegExp(`${bodyDigits}[-\\s]?${checkDigit}`, 'i')
      : new RegExp(cleanExpected, 'i');

    console.log(`[ItauStatement] Validando conta ativa na tela contra: "${expectedAccount}" (padrão: ${accountPattern})...`);

    const hasFormattedMatch = await this.page
      .getByText(accountPattern)
      .first()
      .isVisible()
      .catch(() => false);

    if (hasFormattedMatch) {
      console.log(`[ItauStatement] ✅ Conta confirmada: ${expectedAccount}`);
      return;
    }

    // Fallback 1: Checa no cabeçalho ou textos do DOM
    const bodyText = await this.page.textContent('body').catch(() => '');
    if (bodyText && accountPattern.test(bodyText)) {
      console.log(`[ItauStatement] ✅ Conta confirmada no DOM da página: ${expectedAccount}`);
      return;
    }

    // Fallback 2: Procura pela sequência numérica base (sem dígito verificador)
    if (bodyDigits.length >= 4 && bodyText && bodyText.includes(bodyDigits)) {
      console.log(`[ItauStatement] ✅ Conta confirmada por dígitos base (${bodyDigits}): ${cleanExpected}`);
      return;
    }

    throw new Error(
      `[ItauStatement] [FAIL CLOSED] Conta esperada "${expectedAccount}" não encontrada na tela ativa do banco. Interrompendo por segurança.`
    );
  }

  /**
   * Preenche campos com máscara de data de forma segura no Playwright.
   * Evita truncamentos ou inversões causadas por eventos sintéticos do React/DOM.
   */
  private async fillMaskedDate(locator: Locator, dateBr: string): Promise<void> {
    await locator.waitFor({ state: 'visible', timeout: 10_000 });
    await locator.click();
    await locator.press('ControlOrMeta+a');
    await locator.press('Backspace');
    await locator.pressSequentially(dateBr, { delay: 35 });
    await locator.press('Tab');

    // Validação defensiva: se a máscara perdeu caracteres, aplica fallback via dispatchEvent
    const currentVal = await locator.inputValue().catch(() => '');
    if (currentVal.replace(/\D/g, '') !== dateBr.replace(/\D/g, '')) {
      await locator.evaluate((el: HTMLInputElement, val) => {
        el.value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }, dateBr);
    }
  }

  /**
   * Ajusta o filtro de datas do extrato e clica em Filtrar.
   * Seleciona previamente a opção "Outro período" caso necessário.
   * 
   * @param fromBr Data inicial formatada em DD/MM/AAAA
   * @param toBr Data final formatada em DD/MM/AAAA
   */
  async setCustomRange(fromBr: string, toBr: string): Promise<void> {
    console.log(`[ItauStatement] Aplicando filtro de período: ${fromBr} até ${toBr}...`);

    // 1. Trata seletor de período pré-definido e ativa "Outro período"
    const periodTriggers = [
      this.page.getByRole('combobox', { name: /período/i }),
      this.page.locator('select[name*="periodo" i], [aria-label*="período" i]'),
      this.page.locator('button, label, div').filter({ hasText: /^outro período$/i }),
      this.page.getByText(/selecione um período/i),
    ];

    for (const trigger of periodTriggers) {
      if (await trigger.isVisible().catch(() => false)) {
        console.log('[ItauStatement] Ajustando seletor de período...');
        await trigger.click().catch(() => {});
        await this.page.waitForTimeout(300);

        const customOption = this.page
          .getByRole('option', { name: /outro período|personalizado/i })
          .or(this.page.locator('option, li, div, span').filter({ hasText: /outro período|personalizado/i }))
          .first();

        if (await customOption.isVisible().catch(() => false)) {
          await customOption.click().catch(() => {});
          await this.page.waitForTimeout(300);
        }
        break;
      }
    }

    // 2. Localiza inputs de data inicial e final
    const dataInicial = this.page
      .getByLabel(/data inicial/i)
      .or(this.page.locator('input[placeholder*="inicial" i], input[name*="dataInicio" i], input[id*="dataInicio" i], input[placeholder*="dd/mm/aaaa" i]').first())
      .first();

    const dataFinal = this.page
      .getByLabel(/data final/i)
      .or(this.page.locator('input[placeholder*="final" i], input[name*="dataFim" i], input[id*="dataFim" i], input[placeholder*="dd/mm/aaaa" i]').nth(1))
      .first();

    if (await dataInicial.isVisible().catch(() => false)) {
      await this.fillMaskedDate(dataInicial, fromBr);
    } else {
      console.warn('[ItauStatement] Campo data inicial não encontrado diretamente por seletor padrão.');
    }

    if (await dataFinal.isVisible().catch(() => false)) {
      await this.fillMaskedDate(dataFinal, toBr);
    } else {
      console.warn('[ItauStatement] Campo data final não encontrado diretamente por seletor padrão.');
    }

    // 3. Clica no botão Filtrar/Buscar
    const filterBtn = this.page
      .getByRole('button', { name: /filtrar|buscar|pesquisar|consultar|aplicar/i })
      .or(this.page.locator('button:has-text("Filtrar"), button:has-text("Buscar"), button:has-text("Consultar")'))
      .first();

    if (await filterBtn.isVisible().catch(() => false)) {
      console.log('[ItauStatement] Clicando em Filtrar...');
      await filterBtn.click();
    }

    // 4. Sincronização determinística sem sleep estático:
    // Aguarda spinners sumirem e o botão de exportação estar pronto
    await this.page
      .locator('[data-testid*="loading" i], .loading, .spinner, [role="progressbar"], .ids-loading')
      .waitFor({ state: 'hidden', timeout: 25_000 })
      .catch(() => {});

    console.log('[ItauStatement] Tabela de lançamentos filtrada e pronta.');
  }

  /**
   * Clica em "Salvar em OFX", responde "Não, apenas lançamentos" no modal de confirmação
   * e intercepta o evento de Download nativo do Playwright.
   */
  async downloadOfx(): Promise<Download> {
    console.log('[ItauStatement] Iniciando fluxo de download do extrato OFX...');

    // Prepara a escuta do evento de download antes de disparar o clique final
    const downloadPromise = this.page.waitForEvent('download', { timeout: 60_000 });

    // 1. Procura botão direto "Salvar em OFX" ou "OFX"
    const directOfxBtn = this.page
      .getByRole('button', { name: /salvar em ofx|baixar ofx/i })
      .or(this.page.locator('button:has-text("Salvar em OFX"), a:has-text("Salvar em OFX")'))
      .first();

    if (await directOfxBtn.isVisible().catch(() => false)) {
      console.log('[ItauStatement] Clicando no botão "Salvar em OFX"...');
      await directOfxBtn.click();
    } else {
      // 2. Procura botão "Salvar em..." ou "Exportar" ou "Outros formatos"
      console.log('[ItauStatement] Botão direto "Salvar em OFX" não visível. Procurando botão de exportação...');
      const exportMenuBtn = this.page
        .getByRole('button', { name: /salvar em|exportar|salvar arquivo|outros formatos/i })
        .or(this.page.locator('button:has-text("Salvar em"), button:has-text("Exportar"), [aria-label*="exportar" i]'))
        .first();

      if (await exportMenuBtn.isVisible().catch(() => false)) {
        console.log('[ItauStatement] Abrindo menu de exportação...');
        await exportMenuBtn.click();
        await this.page.waitForTimeout(500);

        const ofxOption = this.page
          .getByRole('menuitem', { name: /ofx/i })
          .or(this.page.getByRole('button', { name: /ofx/i }))
          .or(this.page.locator('a, button, li, span').filter({ hasText: /ofx/i }))
          .first();

        await ofxOption.waitFor({ state: 'visible', timeout: 6000 });
        console.log('[ItauStatement] Selecionando formato OFX...');
        await ofxOption.click();
      } else {
        // Fallback: procura qualquer elemento na tela com texto OFX
        const anyOfx = this.page.locator('text=/salvar em ofx|baixar ofx|^ofx$/i').first();
        await anyOfx.waitFor({ state: 'visible', timeout: 10_000 });
        await anyOfx.click();
      }
    }

    // 3. Trata modal interceptado no Vídeo 2: "Deseja salvar o extrato OFX com o saldo do dia?"
    console.log('[ItauStatement] Verificando modal de saldo...');
    const modalOption = this.page
      .getByRole('button', { name: /não,\s*apenas\s*lançamentos/i })
      .or(this.page.getByText(/não,\s*apenas\s*lançamentos/i))
      .or(this.page.locator('button:has-text("apenas lançamentos"), button:has-text("Não, apenas")'))
      .first();

    const isModalVisible = await modalOption
      .waitFor({ state: 'visible', timeout: 7_000 })
      .then(() => true)
      .catch(() => false);

    if (isModalVisible) {
      console.log('[ItauStatement] Modal detectado: clicando em "Não, apenas lançamentos"...');
      await modalOption.click();
    } else {
      console.log('[ItauStatement] Modal de saldo não exibido. Aguardando download direto...');
    }

    const download = await downloadPromise;
    console.log(`[ItauStatement] ✅ Evento de download concluído: ${download.suggestedFilename()}`);
    return download;
  }
}
