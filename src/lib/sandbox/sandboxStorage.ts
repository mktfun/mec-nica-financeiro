import { DailyReconciliationSummary } from '@/hooks/useBackendConciliacao';
import { AutoMatchingResult } from '@/lib/matchers/autoMatchingEngine';
import { CentralImportResults } from '@/lib/parsers/centralImportManager';

export const SANDBOX_STORAGE_KEY = 'sandbox_reconciliation_session_v1';

export interface SandboxFileMetadata {
  fileName: string;
  fileType: 'ofx' | 'rede' | 'os' | 'bills' | 'other';
  sizeBytes: number;
  recordsCount: number;
}

export interface SandboxTraceLog {
  timestamp: string;
  stage: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  details?: Record<string, unknown>;
}

export interface SandboxCashVaultItem {
  id: string;
  store_id: string;
  store_name: string;
  os_number_ref: string;
  amount: number;
  entry_date: string;
  status: 'em_transito' | 'depositado';
}

export interface SandboxReceivableItem {
  id: string;
  store_id: string;
  store_name?: string;
  os_number: string;
  client_name: string;
  payment_method: string;
  amount: number;
  due_date: string;
  status: string;
}

export interface SandboxReconciliationSession {
  sessionId: string;
  targetDate: string;
  createdAt: string;
  filesProcessed: SandboxFileMetadata[];
  summary: DailyReconciliationSummary;
  matchingResult: AutoMatchingResult;
  cashVaultEntries: SandboxCashVaultItem[];
  receivables: SandboxReceivableItem[];
  traceLogs: SandboxTraceLog[];
  rawResults?: CentralImportResults;
}

export function saveSandboxSession(session: SandboxReconciliationSession): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SANDBOX_STORAGE_KEY, JSON.stringify(session));
  } catch (err) {
    console.error('[SandboxStorage] Erro ao salvar sessão no localStorage:', err);
  }
}

export function loadSandboxSession(): SandboxReconciliationSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SANDBOX_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SandboxReconciliationSession;
  } catch (err) {
    console.error('[SandboxStorage] Erro ao carregar sessão do localStorage:', err);
    return null;
  }
}

export function clearSandboxSession(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(SANDBOX_STORAGE_KEY);
  } catch (err) {
    console.error('[SandboxStorage] Erro ao limpar sessão do localStorage:', err);
  }
}

export function exportSandboxSessionAsJson(session: SandboxReconciliationSession): void {
  if (typeof window === 'undefined') return;
  try {
    const jsonStr = JSON.stringify(session, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sandbox-conciliacao-${session.targetDate}-${session.sessionId.slice(0, 8)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('[SandboxStorage] Erro ao exportar JSON:', err);
  }
}
