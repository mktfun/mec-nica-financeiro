// @ts-nocheck
import { supabase } from './supabase';
import { parsePaymentBreakdown, PaymentBreakdownItem } from './osPaymentUtils';

export type OsPaymentCategory = 
  | 'credito' 
  | 'debito' 
  | 'pix' 
  | 'dinheiro' 
  | 'transferencia' 
  | 'boleto' 
  | 'outro';

export interface OsPaymentEntry {
  id: string;
  category: OsPaymentCategory;
  label?: string;
  value: number;
}

export interface ConsolidatedOsPayments {
  credit_value: number;
  debit_value: number;
  pix_transfer_value: number;
  cash_value: number;
  other_value: number;
  paid_value: number;
  payment_method: string;
}

export interface RegisterOsPaymentParams {
  osId: string;
  totalValue: number;
  entries: OsPaymentEntry[];
  targetDate?: string;
}

export interface SaveOsPaymentResult {
  success: boolean;
  error?: string;
  data?: any;
}

/**
 * Agrupa as entradas de pagamento por categoria contábil e gera o formato canônico
 */
export function consolidateOsPaymentEntries(entries: OsPaymentEntry[]): ConsolidatedOsPayments {
  let credit_value = 0;
  let debit_value = 0;
  let pix_transfer_value = 0;
  let cash_value = 0;
  let other_value = 0;

  for (const entry of entries) {
    const val = Number(entry.value) || 0;
    if (val <= 0) continue;

    switch (entry.category) {
      case 'credito':
        credit_value += val;
        break;
      case 'debito':
        debit_value += val;
        break;
      case 'pix':
      case 'transferencia':
        pix_transfer_value += val;
        break;
      case 'dinheiro':
        cash_value += val;
        break;
      default:
        other_value += val;
        break;
    }
  }

  credit_value = Number(credit_value.toFixed(2));
  debit_value = Number(debit_value.toFixed(2));
  pix_transfer_value = Number(pix_transfer_value.toFixed(2));
  cash_value = Number(cash_value.toFixed(2));
  other_value = Number(other_value.toFixed(2));

  const paid_value = Number((credit_value + debit_value + pix_transfer_value + cash_value + other_value).toFixed(2));

  // Gerar string canônica de payment_method
  let payment_method = 'EM_ABERTO';
  if (paid_value > 0) {
    const parts: string[] = [];
    if (credit_value > 0) parts.push(`Credito: ${credit_value.toFixed(2)}`);
    if (debit_value > 0) parts.push(`Debito: ${debit_value.toFixed(2)}`);
    if (pix_transfer_value > 0) parts.push(`PIX: ${pix_transfer_value.toFixed(2)}`);
    if (cash_value > 0) parts.push(`Dinheiro: ${cash_value.toFixed(2)}`);
    if (other_value > 0) parts.push(`Outros: ${other_value.toFixed(2)}`);

    payment_method = parts.length > 0 ? parts.join('; ') : 'Outros';
  }

  return {
    credit_value,
    debit_value,
    pix_transfer_value,
    cash_value,
    other_value,
    paid_value,
    payment_method
  };
}

/**
 * Extrai entradas de pagamento a partir dos dados existentes da OS
 */
export function extractEntriesFromOs(os: any): OsPaymentEntry[] {
  if (!os) return [];

  const cred = Number(os.credit_value || 0);
  const deb = Number(os.debit_value || 0);
  const pix = Number(os.pix_transfer_value || 0);
  const cash = Number(os.cash_value || 0);

  // Se já houver colunas numéricas preenchidas
  if (cred > 0 || deb > 0 || pix > 0 || cash > 0) {
    const entries: OsPaymentEntry[] = [];
    if (cred > 0) {
      entries.push({ id: 'cred-1', category: 'credito', label: 'Cartão Crédito', value: cred });
    }
    if (deb > 0) {
      entries.push({ id: 'deb-1', category: 'debito', label: 'Cartão Débito', value: deb });
    }
    if (pix > 0) {
      entries.push({ id: 'pix-1', category: 'pix', label: 'PIX', value: pix });
    }
    if (cash > 0) {
      entries.push({ id: 'cash-1', category: 'dinheiro', label: 'Dinheiro', value: cash });
    }
    return entries;
  }

  // Se as colunas estiverem zeradas, recorre ao parser de breakdown do payment_method
  const breakdown = parsePaymentBreakdown(os);
  if (breakdown.length > 0) {
    return breakdown.map((item, idx) => {
      let cat: OsPaymentCategory = 'outro';
      if (item.category === 'credito') cat = 'credito';
      else if (item.category === 'debito') cat = 'debito';
      else if (item.category === 'pix') cat = 'pix';
      else if (item.category === 'dinheiro') cat = 'dinheiro';
      else if (item.category === 'boleto') cat = 'boleto';

      return {
        id: `breakdown-${idx}`,
        category: cat,
        label: item.method,
        value: item.value
      };
    });
  }

  // Se houver apenas paid_value sem especificação
  const paid = Number(os.paid_value || 0);
  if (paid > 0) {
    const methodStr = String(os.payment_method || '').toLowerCase();
    let cat: OsPaymentCategory = 'outro';
    let label = 'Pagamento Registrado';

    if (methodStr.includes('cred')) {
      cat = 'credito';
      label = 'Cartão Crédito';
    } else if (methodStr.includes('deb')) {
      cat = 'debito';
      label = 'Cartão Débito';
    } else if (methodStr.includes('pix')) {
      cat = 'pix';
      label = 'PIX';
    } else if (methodStr.includes('dinheiro') || methodStr.includes('cash')) {
      cat = 'dinheiro';
      label = 'Dinheiro';
    }

    return [{
      id: 'legacy-paid-1',
      category: cat,
      label,
      value: paid
    }];
  }

  return [];
}

/**
 * Salva pagamentos e o total da OS via RPC atômica register_or_update_os_payments com fallback seguro
 */
export async function saveOsPayments({
  osId,
  totalValue,
  entries,
  targetDate
}: RegisterOsPaymentParams): Promise<SaveOsPaymentResult> {
  const consolidated = consolidateOsPaymentEntries(entries);
  const numericTotal = Number(Number(totalValue || 0).toFixed(2));

  try {
    const { data, error } = await supabase.rpc('register_or_update_os_payments', {
      p_os_id: osId,
      p_total_value: numericTotal,
      p_credit_value: consolidated.credit_value,
      p_debit_value: consolidated.debit_value,
      p_pix_transfer_value: consolidated.pix_transfer_value,
      p_cash_value: consolidated.cash_value,
      p_other_value: consolidated.other_value,
      p_payment_method_text: consolidated.payment_method,
      p_target_date: targetDate || new Date().toISOString().split('T')[0]
    });

    if (error) {
      console.warn('[saveOsPayments] Erro no RPC, tentando fallback direto:', error);
      return await fallbackDirectSave({ osId, totalValue: numericTotal, consolidated, targetDate });
    }

    if (data && data.success === false) {
      return { success: false, error: data.error || 'Erro ao registrar pagamentos da OS.' };
    }

    return { success: true, data };
  } catch (err: any) {
    console.warn('[saveOsPayments] Exceção no RPC, tentando fallback direto:', err);
    return await fallbackDirectSave({ osId, totalValue: numericTotal, consolidated, targetDate });
  }
}

/**
 * Fallback defensivo caso o RPC esteja inacessível em ambiente desconectado
 */
async function fallbackDirectSave({
  osId,
  totalValue,
  consolidated,
  targetDate
}: {
  osId: string;
  totalValue: number;
  consolidated: ConsolidatedOsPayments;
  targetDate?: string;
}): Promise<SaveOsPaymentResult> {
  try {
    const status = consolidated.paid_value >= totalValue - 0.05 && totalValue > 0
      ? 'finalizado'
      : (consolidated.paid_value > 0 ? 'pago_parcial' : 'em_aberto');

    const { data, error } = await supabase
      .from('patio_os')
      .update({
        total_value: totalValue,
        paid_value: consolidated.paid_value,
        credit_value: consolidated.credit_value,
        debit_value: consolidated.debit_value,
        pix_transfer_value: consolidated.pix_transfer_value,
        cash_value: consolidated.cash_value,
        payment_method: consolidated.payment_method,
        status,
        last_payment_date: targetDate || new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      })
      .eq('id', osId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || String(err) };
  }
}
