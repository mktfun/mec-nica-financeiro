const { chromium } = require('playwright');
const path = require('path');
require('dotenv').config();

const anonToken = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNud3pzdm93a2Z5bXRkaXJ5aHFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNTM3MDgsImV4cCI6MjA5NTYyOTcwOH0.TzfygcAWycghnlQWCZKjuAYVLPFw1aJ1lq2TPnm_n1Q';

async function capture() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1800 } });

  await context.addInitScript((jwt) => {
    const mockSession = {
      access_token: jwt,
      refresh_token: 'mock-refresh-token',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: 'bearer',
      user: {
        id: '00000000-0000-0000-0000-000000000001',
        aud: 'authenticated',
        role: 'authenticated',
        email: 'admin@mecanicapopular.com.br',
        created_at: new Date().toISOString()
      }
    };
    window.localStorage.setItem('sb-cnwzsvowkfymtdiryhqc-auth-token', JSON.stringify(mockSession));
  }, anonToken);

  const page = await context.newPage();
  const artifactDir = 'C:\\Users\\admin\\.gemini\\antigravity\\brain\\f121c45f-bbee-4df6-95ae-a4e20b3c90d9';

  console.log('Navigating to http://localhost:8080/conciliacao/st-06?date=2026-09-01 ...');
  await page.goto('http://localhost:8080/conciliacao/st-06?date=2026-09-01', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);

  // Click on Tab 2: Extrato Bancário (OFX & PIX)
  await page.click('button:has-text("Extrato Bancário")');
  await page.waitForTimeout(3000);

  const extractPath = path.join(artifactDir, 'screenshot_conciliacao_335_st06_extrato_tab2.png');
  await page.screenshot({ path: extractPath, fullPage: false });
  console.log('✅ Planalto tab2 screenshot saved to:', extractPath);

  await browser.close();
}

capture().catch(err => {
  console.error('Erro ao capturar screenshots:', err);
  process.exit(1);
});
