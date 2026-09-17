/**
 * Definições canônicas de status de pareamento e reconciliação (SSOT).
 * Evita strings soltas e variações como 'MATCHED', 'matched_batch', 'nao_entrou', etc.
 */

export const MATCH_STATUSES = [
  'pending',
  'matched',
  'batch',
  'intercompany',
  'cancelled',
  'ignored',
] as const;

export type MatchStatus = typeof MATCH_STATUSES[number];

export const RECONCILIATION_STATUSES = [
  'approved',
  'divergence',
] as const;

export type ReconciliationStatus = typeof RECONCILIATION_STATUSES[number];

export function normalizeMatchStatus(status: string | null | undefined): MatchStatus {
  if (!status) return 'pending';
  const s = status.trim().toLowerCase();
  if (s === 'matched' || s === 'pago' || s === 'conciliado') return 'matched';
  if (s === 'batch' || s === 'matched_batch') return 'batch';
  if (s === 'intercompany' || s === 'transferencia') return 'intercompany';
  if (s === 'cancelled' || s === 'cancelado') return 'cancelled';
  if (s === 'ignored' || s === 'ignorado') return 'ignored';
  return 'pending';
}
