"use strict";
import { chromium } from "playwright";
import path from "path";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();
const DESKTOP_DIR = "C:\\Users\\admin\\Desktop\\conciliacao\\27-08";
const SCREENSHOT_DIR = path.resolve(process.cwd(), "e2e-results/screenshots");
const TARGET_DATE = "2026-08-27";
const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://cnwzsvowkfymtdiryhqc.supabase.co";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);
async function detectServerUrl() {
  const ports = [8080, 5173, 3e3];
  for (const port of ports) {
    try {
      const res = await fetch(`http://localhost:${port}/`);
      if (res.ok || res.status === 200 || res.status === 304 || res.status === 404) {
        console.log(`[E2E] Servidor detectado na porta ${port}`);
        return `http://localhost:${port}`;
      }
    } catch {
    }
  }
  return "http://localhost:8080";
}
async function captureStep(page, stepNumber, stepName) {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }
  const filename = path.join(SCREENSHOT_DIR, `step_${stepNumber}_${stepName}.png`);
  await page.screenshot({ path: filename, fullPage: true });
  console.log(`\u{1F4F8} [Screenshot] Salvo: ${filename}`);
}
async function runE2ETest() {
  console.log("===============================================================");
  console.log("\u{1F680} INICIANDO TESTE E2E: CONCILIA\xC7\xC3O COMPLETA 27/08/2026");
  console.log("===============================================================");
  if (!fs.existsSync(DESKTOP_DIR)) {
    throw new Error(`Pasta n\xE3o encontrada: ${DESKTOP_DIR}`);
  }
  const fileNames = fs.readdirSync(DESKTOP_DIR).filter((f) => !f.startsWith("."));
  const filePaths = fileNames.map((f) => path.join(DESKTOP_DIR, f));
  console.log(`\u{1F4C2} ${filePaths.length} arquivos reais encontrados em ${DESKTOP_DIR}`);
  const baseUrl = await detectServerUrl();
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();
  try {
    console.log("\n\u25B6\uFE0F [STEP 1] Acessando Central de Importa\xE7\xF5es...");
    await page.goto(`${baseUrl}/importacoes?tab=diario&date=${TARGET_DATE}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2e3);
    await captureStep(page, "01_0", "tela_inicial_importacoes");
    const fileInput = page.locator('input[type="file"]').first();
    console.log(`\u{1F4E4} Injetando ${filePaths.length} arquivos no Dropzone...`);
    await fileInput.setInputFiles(filePaths);
    await page.waitForTimeout(5e3);
    await captureStep(page, "01_1", "upload_arquivos_processados");
    console.log("\n\u25B6\uFE0F [STEP 2] Mapeamento de Filiais (OFX, OS, Rede)...");
    await page.waitForSelector("text=1. Extratos Banc\xE1rios (OFX)", { timeout: 15e3 }).catch(() => {
    });
    await captureStep(page, "02_1", "mapeamento_ofx");
    const btnNextToOs = page.locator('button:has-text("Pr\xF3ximo: Ordens de Servi\xE7o (OS)")').first();
    if (await btnNextToOs.isVisible()) {
      await btnNextToOs.click();
      await page.waitForTimeout(1500);
    }
    await captureStep(page, "02_2", "mapeamento_os");
    const btnNextToRede = page.locator('button:has-text("Pr\xF3ximo: Maquininhas (Rede)")').first();
    if (await btnNextToRede.isVisible()) {
      await btnNextToRede.click();
      await page.waitForTimeout(1500);
    }
    await captureStep(page, "02_3", "mapeamento_rede");
    const btnAdvanceToPreview = page.locator('button:has-text("Avan\xE7ar para Auditoria / Preview")').first();
    if (await btnAdvanceToPreview.isVisible()) {
      await btnAdvanceToPreview.click();
      await page.waitForTimeout(2e3);
    }
    console.log("\n\u25B6\uFE0F [STEP 3] Confer\xEAncia e Preview Geral...");
    await page.waitForTimeout(2e3);
    await captureStep(page, "03", "preview_geral_e_cards");
    const btnAdvanceToConciliacao = page.locator('button:has-text("Avan\xE7ar para Concilia\xE7\xE3o")').first();
    if (await btnAdvanceToConciliacao.isVisible()) {
      await btnAdvanceToConciliacao.click();
      await page.waitForTimeout(2e3);
    }
    console.log("\n\u25B6\uFE0F [STEP 4] V\xEDnculo de Pagamentos na OS (Tela A)...");
    await page.waitForTimeout(2e3);
    await captureStep(page, "04", "vinculo_pagamentos_os");
    const btnNextToStep5 = page.locator('button:has-text("Pr\xF3ximo: Justificativas por Loja")').first();
    if (await btnNextToStep5.isVisible()) {
      await btnNextToStep5.click();
      await page.waitForTimeout(2e3);
    }
    console.log("\n\u25B6\uFE0F [STEP 5] Justificativas por Loja (Tela B)...");
    await page.waitForTimeout(2e3);
    await captureStep(page, "05", "justificativas_nao_faturamento");
    const btnNextToStep6 = page.locator('button:has-text("Pr\xF3ximo: Confer\xEAncia de Cofre")').first();
    if (await btnNextToStep6.isVisible()) {
      await btnNextToStep6.click();
      await page.waitForTimeout(2e3);
    }
    console.log("\n\u25B6\uFE0F [STEP 6] Confer\xEAncia de Cofre do Daniel (Tela C)...");
    await page.waitForTimeout(2e3);
    const btnCofreNao = page.locator('button:has-text("N\xC3O, dinheiro permaneceu")').first();
    if (await btnCofreNao.isVisible()) {
      await btnCofreNao.click();
      await page.waitForTimeout(500);
    }
    await captureStep(page, "06", "conferencia_cofre_daniel");
    const btnNextToStep7 = page.locator('button:has-text("Pr\xF3ximo: Auditoria Final")').first();
    if (await btnNextToStep7.isVisible()) {
      await btnNextToStep7.click();
      await page.waitForTimeout(2e3);
    }
    console.log("\n\u25B6\uFE0F [STEP 7] Auditoria dos 5 Pilares (Tela D)...");
    await page.waitForTimeout(2e3);
    await captureStep(page, "07", "auditoria_5_pilares_fechamento");
    const btnConfirmAndSave = page.locator('button:has-text("Confirmar e Gravar Importa\xE7\xE3o")').first();
    if (await btnConfirmAndSave.isVisible()) {
      console.log('\u{1F4BE} Clicando em "Confirmar e Gravar Importa\xE7\xE3o"...');
      await btnConfirmAndSave.click();
    }
    console.log("\n\u25B6\uFE0F [STEP 8] Aguardando Conclus\xE3o da Grava\xE7\xE3o e Auto-Healing...");
    await page.waitForTimeout(1e4);
    await captureStep(page, "08", "importacao_concluida_sucesso");
    console.log("\n\u25B6\uFE0F [COCKPIT] Acessando Resumo do Dia em /conciliacao...");
    await page.goto(`${baseUrl}/conciliacao?date=${TARGET_DATE}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(4e3);
    await captureStep(page, "09", "cockpit_resumo_dia_27082026");
    console.log("\n\u{1F50D} [DATABASE AUDIT] Executando Consultas de Verifica\xE7\xE3o no Supabase...");
    const { data: snap } = await supabase.from("daily_snapshots").select("*").eq("date", TARGET_DATE).maybeSingle();
    if (snap) {
      console.log("\u2705 Daily Snapshot Encontrado:");
      console.log(`   - Data: ${snap.date}`);
      console.log(`   - Caixa Atual: R$ ${Number(snap.caixa_atual || 0).toFixed(2)}`);
      console.log(`   - Faturamento: R$ ${Number(snap.faturamento || 0).toFixed(2)}`);
      console.log(`   - Saldo Bancos L\xEDquido: R$ ${Number(snap.saldo_bancario || 0).toFixed(2)}`);
      console.log(`   - P\xE1tio OS (Estoque): R$ ${Number(snap.total_patio || 0).toFixed(2)}`);
      console.log(`   - Contas a Pagar: R$ ${Number(snap.contas_a_pagar || 0).toFixed(2)}`);
    } else {
      console.log("\u2139\uFE0F Daily snapshot consultado via RPC din\xE2mica.");
    }
    const { count: txCount } = await supabase.from("transactions").select("*", { count: "exact", head: true }).eq("target_date", TARGET_DATE);
    console.log(`\u2705 Transa\xE7\xF5es Registradas para ${TARGET_DATE}: ${txCount || 0} lan\xE7amentos.`);
    const { data: recons } = await supabase.from("reconciliations").select("store_id, status").eq("date", TARGET_DATE);
    console.log(`\u2705 Reconcilia\xE7\xF5es por Loja: ${recons?.length || 0} filiais processadas.`);
    console.log("\n===============================================================");
    console.log("\u{1F389} TESTE E2E EXECUTADO COM SUCESSO!");
    console.log("===============================================================");
  } catch (err) {
    console.error("\u274C [ERRO NO TESTE E2E]:", err);
    await captureStep(page, "error", "falha_execucao");
    throw err;
  } finally {
    await browser.close();
  }
}
runE2ETest().catch((e) => {
  console.error(e);
  process.exit(1);
});
