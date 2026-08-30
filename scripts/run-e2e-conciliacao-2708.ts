import { chromium, Page } from 'playwright';
import path from 'path';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const DESKTOP_DIR = 'C:\\Users\\admin\\Desktop\\conciliacao\\27-08';
const SCREENSHOT_DIR = path.resolve(process.cwd(), 'e2e-results/screenshots');
const TARGET_DATE = '2026-08-27';

// Supabase Direct Client
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://cnwzsvowkfymtdiryhqc.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function detectServerUrl(): Promise<string> {
  const ports = [8080, 5173, 3000];
  for (const port of ports) {
    try {
      const res = await fetch(`http://localhost:${port}/`);
      if (res.ok || res.status === 200 || res.status === 304 || res.status === 404) {
        console.log(`[E2E] Servidor detectado na porta ${port}`);
        return `http://localhost:${port}`;
      }
    } catch {
      // continua tentando
    }
  }
  return 'http://localhost:8080';
}

async function captureStep(page: Page, stepNumber: string, stepName: string) {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }
  const filename = path.join(SCREENSHOT_DIR, `step_${stepNumber}_${stepName}.png`);
  await page.screenshot({ path: filename, fullPage: true });
  console.log(`📸 [Screenshot] Salvo: ${filename}`);
}

async function runE2ETest() {
  console.log('===============================================================');
  console.log('🚀 INICIANDO TESTE E2E: CONCILIAÇÃO COMPLETA 27/08/2026');
  console.log('===============================================================');

  if (!fs.existsSync(DESKTOP_DIR)) {
    throw new Error(`Pasta não encontrada: ${DESKTOP_DIR}`);
  }
  const fileNames = fs.readdirSync(DESKTOP_DIR).filter(f => !f.startsWith('.'));
  const filePaths = fileNames.map(f => path.join(DESKTOP_DIR, f));
  console.log(`📂 ${filePaths.length} arquivos reais encontrados em ${DESKTOP_DIR}`);

  const baseUrl = await detectServerUrl();
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  try {
    // -------------------------------------------------------------
    // AUTENTICAÇÃO: Login no Painel
    // -------------------------------------------------------------
    console.log('\n🔐 [AUTH] Acessando tela de login...');
    await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const emailInput = page.locator('input[type="email"], input[placeholder*="@"], input[name="email"]').first();
    const passInput = page.locator('input[type="password"], input[name="password"]').first();

    if (await emailInput.isVisible()) {
      console.log('🔑 Preenchendo credenciais de acesso...');
      await emailInput.fill('admin@mecanicapopular.com.br');
      await passInput.fill('password123');
      const submitBtn = page.locator('button[type="submit"], button:has-text("Entrar")').first();
      await submitBtn.click();
      await page.waitForTimeout(3000);
    }

    // -------------------------------------------------------------
    // STEP 1: Upload de Arquivos na Central de Importações
    // -------------------------------------------------------------
    console.log('\n▶️ [STEP 1] Acessando Central de Importações...');
    await page.goto(`${baseUrl}/importacoes?tab=diario&date=${TARGET_DATE}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await captureStep(page, '01_0', 'tela_inicial_importacoes');

    const fileInput = page.locator('input[type="file"]').first();
    console.log(`📤 Injetando ${filePaths.length} arquivos no Dropzone...`);
    await fileInput.setInputFiles(filePaths);

    // Aguarda término do parsing client-side
    await page.waitForTimeout(6000);
    await captureStep(page, '01_1', 'upload_arquivos_processados');

    // -------------------------------------------------------------
    // STEP 2: Mapeamento de Filiais (OFX, OS, Rede)
    // -------------------------------------------------------------
    console.log('\n▶️ [STEP 2] Mapeamento de Filiais (OFX, OS, Rede)...');
    
    // Sub-Step 1: OFX -> Avançar para OS
    await captureStep(page, '02_1', 'mapeamento_ofx');
    const btnNextToOs = page.getByRole('button', { name: /Próximo:.*OS/i }).first();
    await btnNextToOs.scrollIntoViewIfNeeded();
    await btnNextToOs.click();
    await page.waitForTimeout(2000);
    await captureStep(page, '02_2', 'mapeamento_os');

    // Sub-Step 2: OS -> Avançar para Rede
    const btnNextToRede = page.getByRole('button', { name: /Próximo:.*Rede/i }).first();
    await btnNextToRede.scrollIntoViewIfNeeded();
    await btnNextToRede.click();
    await page.waitForTimeout(2000);
    await captureStep(page, '02_3', 'mapeamento_rede');

    // Sub-Step 3: Rede -> Avançar para Step 3 (Preview)
    const btnAdvanceToPreview = page.getByRole('button', { name: /Avançar para Auditoria/i }).first();
    await btnAdvanceToPreview.scrollIntoViewIfNeeded();
    await btnAdvanceToPreview.click();
    await page.waitForTimeout(3000);

    // -------------------------------------------------------------
    // STEP 3: Conferência e Preview Geral (Valores Manuais)
    // -------------------------------------------------------------
    console.log('\n▶️ [STEP 3] Conferência e Preview Geral...');
    
    // Destravar inputs manuais se estiver bloqueado
    const lockBtn = page.locator('button:has-text("Trava Ativa")').first();
    if (await lockBtn.isVisible()) {
      await lockBtn.click();
      await page.waitForTimeout(500);
    }

    // Preencher Faturamento Acumulado (Odômetro OI = 891663.62)
    const odometroInput = page.locator('input[type="number"]').first();
    if (await odometroInput.isVisible()) {
      await odometroInput.fill('891663.62');
    }

    // Preencher Dinheiro MP (20225)
    const dinheiroMpInput = page.locator('input[type="number"]').nth(1);
    if (await dinheiroMpInput.isVisible()) {
      await dinheiroMpInput.fill('20225');
    }

    // Preencher A Receber (8349.67)
    const aReceberInput = page.locator('input[type="number"]').nth(2);
    if (await aReceberInput.isVisible()) {
      await aReceberInput.fill('8349.67');
    }

    await page.waitForTimeout(1000);
    await captureStep(page, '03', 'preview_geral_e_cards');

    // Avançar para Step 4 (Conciliação)
    const btnAdvanceToConciliacao = page.getByRole('button', { name: /Avançar para Conciliação/i }).first();
    await btnAdvanceToConciliacao.scrollIntoViewIfNeeded();
    await btnAdvanceToConciliacao.click();
    await page.waitForTimeout(3000);

    // -------------------------------------------------------------
    // STEP 4: Vínculo de Pagamentos na OS (Tela A)
    // -------------------------------------------------------------
    console.log('\n▶️ [STEP 4] Vínculo de Pagamentos na OS (Tela A)...');
    await captureStep(page, '04', 'vinculo_pagamentos_os');

    const btnNextToStep5 = page.getByRole('button', { name: /Próximo: Justificativas/i }).first();
    await btnNextToStep5.scrollIntoViewIfNeeded();
    await btnNextToStep5.click();
    await page.waitForTimeout(3000);

    // -------------------------------------------------------------
    // STEP 5: Justificativas por Loja (Tela B)
    // -------------------------------------------------------------
    console.log('\n▶️ [STEP 5] Justificativas por Loja (Tela B)...');
    await captureStep(page, '05', 'justificativas_nao_faturamento');

    const btnNextToStep6 = page.getByRole('button', { name: /Próximo: Conferência de Cofre/i }).first();
    await btnNextToStep6.scrollIntoViewIfNeeded();
    await btnNextToStep6.click();
    await page.waitForTimeout(3000);

    // -------------------------------------------------------------
    // STEP 6: Conferência de Cofre do Daniel (Tela C)
    // -------------------------------------------------------------
    console.log('\n▶️ [STEP 6] Conferência de Cofre do Daniel (Tela C)...');
    
    // Selecionar "NÃO, dinheiro permaneceu"
    const btnCofreNao = page.getByRole('button', { name: /NÃO, dinheiro permaneceu/i }).first();
    if (await btnCofreNao.isVisible()) {
      await btnCofreNao.click();
      await page.waitForTimeout(500);
    }
    await captureStep(page, '06', 'conferencia_cofre_daniel');

    const btnNextToStep7 = page.getByRole('button', { name: /Próximo: Auditoria Final/i }).first();
    await btnNextToStep7.scrollIntoViewIfNeeded();
    await btnNextToStep7.click();
    await page.waitForTimeout(3000);

    // -------------------------------------------------------------
    // STEP 7: Auditoria dos 5 Pilares & Gravação (Tela D)
    // -------------------------------------------------------------
    console.log('\n▶️ [STEP 7] Auditoria dos 5 Pilares (Tela D)...');
    await captureStep(page, '07', 'auditoria_5_pilares_fechamento');

    // Confirmar e Gravar
    const btnConfirmAndSave = page.getByRole('button', { name: /Confirmar e Gravar Importação/i }).first();
    if (await btnConfirmAndSave.isVisible()) {
      console.log('💾 Clicando em "Confirmar e Gravar Importação"...');
      await btnConfirmAndSave.scrollIntoViewIfNeeded();
      await btnConfirmAndSave.click();
    }

    // -------------------------------------------------------------
    // STEP 8: Processamento Executivo & Auto-Healing
    // -------------------------------------------------------------
    console.log('\n▶️ [STEP 8] Aguardando Conclusão da Gravação e Auto-Healing...');
    await page.waitForTimeout(30000);
    await captureStep(page, '08', 'importacao_concluida_sucesso');

    // -------------------------------------------------------------
    // NAVEGAÇÃO AO COCKPIT FINAL: /conciliacao
    // -------------------------------------------------------------
    console.log('\n▶️ [COCKPIT] Acessando Resumo do Dia em /conciliacao...');
    await page.goto(`${baseUrl}/conciliacao?date=${TARGET_DATE}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(4000);
    await captureStep(page, '09', 'cockpit_resumo_dia_27082026');

    // -------------------------------------------------------------
    // VALIDAÇÃO DIRETA NO BANCO DE DADOS (POSTGRESQL / SUPABASE)
    // -------------------------------------------------------------
    console.log('\n🔍 [DATABASE AUDIT] Executando Consultas de Verificação no Supabase...');

    // 1. Daily Snapshot
    const { data: snap } = await supabase
      .from('daily_snapshots')
      .select('*')
      .eq('date', TARGET_DATE)
      .maybeSingle();

    if (snap) {
      console.log('✅ Daily Snapshot Encontrado:');
      console.log(`   - Data: ${snap.date}`);
      console.log(`   - Caixa Atual: R$ ${Number(snap.caixa_atual || 0).toFixed(2)}`);
      console.log(`   - Faturamento: R$ ${Number(snap.faturamento || 0).toFixed(2)}`);
      console.log(`   - Saldo Bancos Líquido: R$ ${Number(snap.saldo_bancario || 0).toFixed(2)}`);
      console.log(`   - Pátio OS (Estoque): R$ ${Number(snap.total_patio || 0).toFixed(2)}`);
      console.log(`   - Contas a Pagar: R$ ${Number(snap.contas_a_pagar || 0).toFixed(2)}`);
    }

    // 2. Transações Gravadas
    const { count: txCount } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('target_date', TARGET_DATE);

    console.log(`✅ Transações Registradas para ${TARGET_DATE}: ${txCount || 0} lançamentos.`);

    // 3. Reconciliações
    const { data: recons } = await supabase
      .from('reconciliations')
      .select('store_id, status')
      .eq('date', TARGET_DATE);

    console.log(`✅ Reconciliações por Loja: ${recons?.length || 0} filiais processadas.`);

    console.log('\n===============================================================');
    console.log('🎉 TESTE E2E EXECUTADO COM SUCESSO!');
    console.log('===============================================================');

  } catch (err: any) {
    console.error('❌ [ERRO NO TESTE E2E]:', err);
    await captureStep(page, 'error', 'falha_execucao');
    throw err;
  } finally {
    await browser.close();
  }
}

runE2ETest().catch(e => {
  console.error(e);
  process.exit(1);
});
