import * as fs from 'fs';
import * as path from 'path';
import { BrowserContext, Page } from '@playwright/test';

const SESSION_DIR = path.join(__dirname, '../../session');

export function getSessionPath(portal: 'oi' | 'rede'): string {
  return path.join(SESSION_DIR, `cookies_${portal}.json`);
}

export async function saveSession(portal: 'oi' | 'rede', context: BrowserContext): Promise<void> {
  if (!fs.existsSync(SESSION_DIR)) {
    fs.mkdirSync(SESSION_DIR, { recursive: true });
  }
  const cookies = await context.cookies();
  const storage = await context.storageState();
  fs.writeFileSync(getSessionPath(portal), JSON.stringify({ cookies, storage }, null, 2));
  console.log(`[SessionManager] Sessão salva para portal: ${portal}`);
}

export async function loadSession(portal: 'oi' | 'rede', context: BrowserContext): Promise<boolean> {
  const sessionPath = getSessionPath(portal);
  if (!fs.existsSync(sessionPath)) {
    console.log(`[SessionManager] Nenhuma sessão encontrada para: ${portal}`);
    return false;
  }
  try {
    const { cookies } = JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));
    if (cookies && cookies.length > 0) {
      await context.addCookies(cookies);
      console.log(`[SessionManager] Sessão injetada para portal: ${portal}`);
      return true;
    }
  } catch (e) {
    console.error(`[SessionManager] Erro ao carregar sessão:`, e);
  }
  return false;
}

export function clearSession(portal: 'oi' | 'rede'): void {
  const sessionPath = getSessionPath(portal);
  if (fs.existsSync(sessionPath)) {
    fs.unlinkSync(sessionPath);
    console.log(`[SessionManager] Sessão removida para: ${portal}`);
  }
}

/**
 * Verifica se a página atual ainda está autenticada
 * (se o URL contém 'login', a sessão expirou)
 */
export function isAuthenticated(page: Page, loginUrlFragment: string): boolean {
  return !page.url().includes(loginUrlFragment);
}
