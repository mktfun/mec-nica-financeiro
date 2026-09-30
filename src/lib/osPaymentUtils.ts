/**
 * osPaymentUtils.ts
 * Single Source of Truth (SSOT) para governança temporal, parsing de pagamentos
 * e filtros de Ordens de Serviço (OS) do Pátio no ecossistema Antigravity 2.0.
 */

export type PaymentMethodCategory = 
  | 'credito' 
  | 'debito' 
  | 'pix' 
  | 'dinheiro' 
  | 'boleto' 
  | 'transferencia' 
  | 'cheque' 
  | 'outro';

export interface PaymentBreakdownItem {
  method: string;
  category: PaymentMethodCategory;
  value: number;
}

export interface OsPaymentInput {
  payment_method?: string | null;
  credit_value?: number | string | null;
  debit_value?: number | string | null;
  pix_transfer_value?: number | string | null;
  cash_value?: number | string | null;
  total_value?: number | string | null;
  paid_value?: number | string | null;
  status?: string | null;
}

export interface OsDateInput {
  opened_at?: string | null;
  closed_at?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
}

export interface MonthBoundaries {
  startDate: string; // "YYYY-MM-01"
  endDate: string;   // "YYYY-MM-28/29/30/31"
  yearMonth: string; // "YYYY-MM"
  label: string;     // Ex: "Setembro de 2026"
}

const MONTH_NAMES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

/**
 * Retorna o mês corrente no fuso horário operacional de Brasília (America/Sao_Paulo).
 * Formato: "YYYY-MM" (ex: "2026-09").
 */
export function getCurrentOperationalMonth(): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit'
    });
    return formatter.format(new Date()); // Retorna YYYY-MM
  } catch {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }
}

/**
 * Retorna os limites inferior e superior de data (startDate e endDate) para um mês YYYY-MM.
 */
export function getMonthBoundaries(yearMonth: string): MonthBoundaries {
  const parts = (yearMonth || getCurrentOperationalMonth()).split('-');
  const year = parseInt(parts[0], 10) || new Date().getFullYear();
  const month = parseInt(parts[1], 10) || (new Date().getMonth() + 1);

  const lastDay = new Date(year, month, 0).getDate();
  const monthPadded = String(month).padStart(2, '0');

  const startDate = `${year}-${monthPadded}-01`;
  const endDate = `${year}-${monthPadded}-${String(lastDay).padStart(2, '0')}`;
  const label = `${MONTH_NAMES_PT[month - 1]} de ${year}`;

  return {
    startDate,
    endDate,
    yearMonth: `${year}-${monthPadded}`,
    label
  };
}

/**
 * Extrai a data canônica de governança da OS no formato YYYY-MM-DD.
 * Regra: opened_at é a data âncora primária de competência.
 * Trunca strings ISO preservando a data sem deslocamento de timezone UTC.
 */
export function getOsGoverningDate(os?: OsDateInput | null): string {
  if (!os) return getCurrentOperationalMonth() + '-01';

  const raw = os.opened_at || os.closed_at || os.created_at || os.updated_at;
  if (!raw) return getCurrentOperationalMonth() + '-01';

  // Se já for uma string ISO ou date no formato YYYY-MM-DD...
  const str = String(raw).trim();
  if (str.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.slice(0, 10);
  }

  try {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch {
    // fallback
  }

  return getCurrentOperationalMonth() + '-01';
}

/**
 * Verifica se a OS pertence ao mês calendário especificado (YYYY-MM).
 */
export function isOsInMonth(os: OsDateInput | null | undefined, yearMonth: string): boolean {
  if (!os) return false;
  const governingDate = getOsGoverningDate(os);
  const { startDate, endDate } = getMonthBoundaries(yearMonth);
  return governingDate >= startDate && governingDate <= endDate;
}

/**
 * Identifica a categoria canônica de pagamento a partir de um texto descritivo.
 */
export function categorizePaymentText(text: string): PaymentMethodCategory {
  const upper = text.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  if (upper.includes('CREDITO') || upper.includes('CARTAO DE CREDITO')) {
    return 'credito';
  }
  if (upper.includes('DEBITO') || upper.includes('CARTAO DE DEBITO')) {
    return 'debito';
  }
  if (upper.includes('PIX')) {
    return 'pix';
  }
  if (upper.includes('DINHEIRO') || upper.includes('ESPECIE')) {
    return 'dinheiro';
  }
  if (upper.includes('BOLETO') || upper.includes('BOL')) {
    return 'boleto';
  }
  if (upper.includes('TRANSF') || upper.includes('TED') || upper.includes('DOC') || upper.includes('CONTA')) {
    return 'transferencia';
  }
  if (upper.includes('CHEQUE')) {
    return 'cheque';
  }
  if (upper.includes('CARTAO') || upper.includes('REDE') || upper.includes('POS')) {
    return 'credito';
  }

  return 'outro';
}

/**
 * Rótulo amigável em português para cada categoria.
 */
export function getPaymentCategoryLabel(category: PaymentMethodCategory): string {
  switch (category) {
    case 'credito': return 'Crédito';
    case 'debito': return 'Débito';
    case 'pix': return 'PIX';
    case 'dinheiro': return 'Dinheiro';
    case 'boleto': return 'Boleto';
    case 'transferencia': return 'Transferência';
    case 'cheque': return 'Cheque';
    case 'outro': default: return 'Outro';
  }
}

/**
 * Faz o parsing completo e determinístico do breakdown de pagamento de uma OS.
 * - Reconcilia colunas numéricas (credit_value, debit_value, pix_transfer_value, cash_value).
 * - Interpreta strings brutas de pagamento (payment_method).
 * - Descarta somatórios numéricos soltos (ex: "; 1250", "; 4807.5").
 */
export function parsePaymentBreakdown(os: OsPaymentInput | null | undefined): PaymentBreakdownItem[] {
  if (!os) return [];

  const items: PaymentBreakdownItem[] = [];
  const creditVal = Math.max(0, Number(os.credit_value || 0));
  const debitVal = Math.max(0, Number(os.debit_value || 0));
  const pixVal = Math.max(0, Number(os.pix_transfer_value || 0));
  const cashVal = Math.max(0, Number(os.cash_value || 0));

  // 1. Inclusão das colunas persistidas canônicas
  if (creditVal > 0) {
    items.push({ method: 'Crédito', category: 'credito', value: Number(creditVal.toFixed(2)) });
  }
  if (debitVal > 0) {
    items.push({ method: 'Débito', category: 'debito', value: Number(debitVal.toFixed(2)) });
  }
  if (pixVal > 0) {
    items.push({ method: 'PIX', category: 'pix', value: Number(pixVal.toFixed(2)) });
  }
  if (cashVal > 0) {
    items.push({ method: 'Dinheiro', category: 'dinheiro', value: Number(cashVal.toFixed(2)) });
  }

  // 2. Análise complementar da string payment_method
  const rawMethodStr = (os.payment_method || '').trim();
  if (rawMethodStr) {
    const segments = rawMethodStr.split(';').map(s => s.trim()).filter(Boolean);

    for (const segment of segments) {
      // Ignora pedaços que são estritamente números (ex: "1250", "4807.5", "400")
      // Estes representam o somatório total adicionado pela exportação de planilhas
      const isPureNumber = /^[\d\.,\s]+$/.test(segment);
      if (isPureNumber) {
        continue;
      }

      if (segment.includes(':')) {
        const [methodName, valStr] = segment.split(':').map(s => s.trim());
        let parsedVal = 0;
        if (valStr) {
          if (valStr.includes(',') && valStr.includes('.')) {
            parsedVal = parseFloat(valStr.replace(/\./g, '').replace(',', '.'));
          } else if (valStr.includes(',')) {
            parsedVal = parseFloat(valStr.replace(',', '.'));
          } else {
            parsedVal = parseFloat(valStr);
          }
        }
        const cleanVal = isNaN(parsedVal) ? 0 : parsedVal;
        const category = categorizePaymentText(methodName);

        // Se a categoria já foi preenchida pelas colunas estruturadas, evita duplicação
        const existing = items.find(i => i.category === category);
        if (!existing) {
          if (cleanVal > 0) {
            items.push({
              method: methodName || getPaymentCategoryLabel(category),
              category,
              value: Number(cleanVal.toFixed(2))
            });
          }
        } else if (existing.value === 0 && cleanVal > 0) {
          existing.value = Number(cleanVal.toFixed(2));
        }
      } else {
        // Segmento textual sem valor específico (ex: "BOLETO", "CHEQUE")
        const category = categorizePaymentText(segment);
        const existing = items.find(i => i.category === category);
        if (!existing) {
          const fallbackVal = items.length === 0 ? Number(Number(os.paid_value || os.total_value || 0).toFixed(2)) : 0;
          if (fallbackVal > 0) {
            items.push({
              method: segment,
              category,
              value: fallbackVal
            });
          }
        }
      }
    }
  }

  // 3. Fallback se não houver breakdown estruturado mas houver paid_value registrado
  if (items.length === 0 && Number(os.paid_value || 0) > 0) {
    const rawStatus = String(os.payment_method || '').toUpperCase();
    const category = categorizePaymentText(rawStatus || 'outro');
    items.push({
      method: getPaymentCategoryLabel(category),
      category,
      value: Number(Number(os.paid_value).toFixed(2))
    });
  }

  return items;
}

/**
 * Avalia se uma OS atende ao filtro de forma de pagamento selecionado.
 * Suporta 100% de pagamentos mistos:
 * Se a OS possui Crédito e PIX, ela retorna true tanto para 'credito' quanto para 'pix'.
 */
export function matchesPaymentMethodFilter(
  os: OsPaymentInput | null | undefined, 
  filterCategory: string | null | undefined
): boolean {
  if (!os) return false;
  if (!filterCategory || filterCategory === 'todas') return true;

  const target = filterCategory.toLowerCase().trim();
  const breakdown = parsePaymentBreakdown(os);

  if (target === 'sem_pagamento') {
    return breakdown.length === 0 || Number(os.paid_value || 0) <= 0.05;
  }

  // Tratamento de Cartão Geral (Crédito ou Débito)
  if (target === 'cartao') {
    return breakdown.some(p => p.category === 'credito' || p.category === 'debito') ||
           Number(os.credit_value || 0) > 0 || Number(os.debit_value || 0) > 0;
  }

  // Tratamento de Transferência Geral (PIX ou Transferência em conta)
  if (target === 'transferencia' || target === 'transf') {
    return breakdown.some(p => p.category === 'transferencia' || p.category === 'pix') ||
           Number(os.pix_transfer_value || 0) > 0;
  }

  // Verificação direta no breakdown
  const inBreakdown = breakdown.some(p => p.category === target);
  if (inBreakdown) return true;

  // Verificação de salvaguarda nas colunas estruturadas
  if (target === 'credito' && Number(os.credit_value || 0) > 0) return true;
  if (target === 'debito' && Number(os.debit_value || 0) > 0) return true;
  if (target === 'pix' && Number(os.pix_transfer_value || 0) > 0) return true;
  if (target === 'dinheiro' && Number(os.cash_value || 0) > 0) return true;

  return false;
}
