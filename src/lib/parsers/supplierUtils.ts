export interface BreakdownCategoryItem {
  name: string;
  value: number;
  count: number;
  percentage: number;
  color?: string;
}

export const MACRO_COLORS_EXPENSES = [
  '#f43f5e', // Rose / Vermelho
  '#f97316', // Laranja
  '#eab308', // Amarelo
  '#8b5cf6', // Roxo
  '#ec4899', // Rosa
  '#06b6d4', // Ciano
  '#3b82f6', // Azul
  '#64748b', // Slate / Outros
];

export const MACRO_COLORS_REVENUE = [
  '#10b981', // Esmeralda
  '#14b8a6', // Teal
  '#3b82f6', // Azul
  '#06b6d4', // Ciano
  '#8b5cf6', // Roxo
  '#f59e0b', // Âmbar
  '#64748b', // Slate
];

/**
 * Higieniza títulos bancários e contrapartes para extrair o nome limpo do fornecedor/favorecido.
 */
export function extractSupplierName(tx: {
  counterpart_name?: string | null;
  title?: string | null;
  manual_category?: string | null;
}): string {
  // 1. Se tiver categoria manual definida pelo usuário
  if (tx.manual_category && tx.manual_category.trim()) {
    const formatted = tx.manual_category.replace(/_/g, ' ').trim();
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }

  // 2. Se tiver contraparte válida (e não for "BANCO DESCONHECIDO - ...")
  if (
    tx.counterpart_name &&
    tx.counterpart_name.trim() &&
    !tx.counterpart_name.toUpperCase().startsWith('BANCO DESCONHECIDO')
  ) {
    return cleanRawText(tx.counterpart_name);
  }

  // 3. Sanitiza a partir do título bancário
  const title = (tx.title || '').trim();
  if (!title) return 'Outros Fornecedores';

  const upper = title.toUpperCase();

  if (upper.startsWith('BOLETO PAGO')) {
    return cleanRawText(title.substring(11));
  }
  if (upper.startsWith('PIX ENVIADO')) {
    return cleanRawText(title.substring(11));
  }
  if (upper.startsWith('SISPAG')) {
    return cleanRawText(title.substring(6));
  }
  if (upper.startsWith('SAQUE')) {
    return 'Saque em Espécie';
  }
  if (
    upper.startsWith('TAR ') ||
    upper.startsWith('TARIFA') ||
    upper.startsWith('IOF') ||
    upper.includes('MANUT CONTA')
  ) {
    return 'Tarifas Bancárias';
  }
  if (upper.includes('BRASICAR')) {
    return 'Brasicar Centro';
  }
  if (upper.includes('TOULOUSE')) {
    return 'Toulouse Imp.';
  }
  if (upper.includes('ALL IN')) {
    return 'All In Tecnologia';
  }
  if (upper.includes('FEMATH')) {
    return 'Femath Auto Peças';
  }
  if (upper.includes('NOVA DANIEL')) {
    return 'Nova Daniel';
  }

  return cleanRawText(title);
}

/**
 * Higieniza e categoriza a origem de uma receita/entrada.
 */
export function extractRevenueCategory(tx: {
  title?: string | null;
  source?: string | null;
  manual_category?: string | null;
}): string {
  if (tx.manual_category && tx.manual_category.trim()) {
    const formatted = tx.manual_category.replace(/_/g, ' ').trim();
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }

  const title = (tx.title || '').trim().toUpperCase();
  const source = (tx.source || '').toLowerCase();

  if (title.startsWith('REDE') || source === 'rede' || title.includes('IMPORTAÇÃO REDE')) {
    if (title.includes('VISA')) return 'Cartão REDE (Visa)';
    if (title.includes('MAST') || title.includes('MASTER')) return 'Cartão REDE (Mastercard)';
    if (title.includes('ELO')) return 'Cartão REDE (Elo)';
    return 'Cartão REDE (Maquininha)';
  }
  if (title.startsWith('PIX') || title.includes('PIX QRS') || title.includes('PIX TRANSF')) {
    return 'PIX Recebido';
  }
  if (title.startsWith('SISPAG') || title.includes('TED') || title.includes('DOC') || title.includes('TRANSF CC')) {
    return 'Transferências / TED';
  }
  if (title.startsWith('REND') || title.includes('APLIC AUT') || title.includes('APLICACAO')) {
    return 'Rendimento de Aplicação';
  }

  return 'Outras Receitas';
}

function cleanRawText(str: string): string {
  let cleaned = str.replace(/\s+/g, ' ').trim();
  // Remove sufixos numéricos longos como " - 2783070820" ou códigos de autorização
  cleaned = cleaned.replace(/\s*-\s*\d{6,}$/g, '');
  cleaned = cleaned.replace(/\s+AT\d{6,}$/g, '');
  cleaned = cleaned.replace(/\s+DB\d{6,}$/g, '');
  if (!cleaned) return 'Outros Fornecedores';
  return cleaned;
}

/**
 * Agrupa transações de despesas por fornecedor, atribuindo percentuais e cores macro.
 */
export function groupTransactionsBySupplier(
  transactions: any[],
  topN = 6
): BreakdownCategoryItem[] {
  const outTxs = transactions.filter(t => t.type === 'out');
  const totalOut = outTxs.reduce((acc, t) => acc + Math.abs(Number(t.amount || 0)), 0);

  if (totalOut === 0) return [];

  const grouped: Record<string, { value: number; count: number }> = {};

  for (const tx of outTxs) {
    const name = tx.clean_supplier_name || extractSupplierName(tx);
    const amount = Math.abs(Number(tx.amount || 0));
    if (!grouped[name]) {
      grouped[name] = { value: 0, count: 0 };
    }
    grouped[name].value += amount;
    grouped[name].count += 1;
  }

  const sorted = Object.entries(grouped)
    .map(([name, data]) => ({
      name,
      value: data.value,
      count: data.count,
      percentage: Number(((data.value / totalOut) * 100).toFixed(1)),
    }))
    .sort((a, b) => b.value - a.value);

  // Top N fornecedores + consolidar menores em "Outros Fornecedores"
  const topItems: BreakdownCategoryItem[] = [];
  let otherValue = 0;
  let otherCount = 0;

  for (let i = 0; i < sorted.length; i++) {
    const item = sorted[i];
    if (i < topN && item.percentage >= 2.5) {
      topItems.push({
        ...item,
        color: MACRO_COLORS_EXPENSES[topItems.length % MACRO_COLORS_EXPENSES.length],
      });
    } else {
      otherValue += item.value;
      otherCount += item.count;
    }
  }

  if (otherValue > 0) {
    topItems.push({
      name: 'Outros Fornecedores',
      value: otherValue,
      count: otherCount,
      percentage: Number(((otherValue / totalOut) * 100).toFixed(1)),
      color: MACRO_COLORS_EXPENSES[MACRO_COLORS_EXPENSES.length - 1],
    });
  }

  return topItems;
}

/**
 * Agrupa transações de receitas por canal/origem, atribuindo percentuais e cores macro.
 */
export function groupTransactionsByRevenueSource(
  transactions: any[]
): BreakdownCategoryItem[] {
  const inTxs = transactions.filter(t => t.type === 'in');
  const totalIn = inTxs.reduce((acc, t) => acc + Math.abs(Number(t.amount || 0)), 0);

  if (totalIn === 0) return [];

  const grouped: Record<string, { value: number; count: number }> = {};

  for (const tx of inTxs) {
    const name = tx.clean_source_name || extractRevenueCategory(tx);
    const amount = Math.abs(Number(tx.amount || 0));
    if (!grouped[name]) {
      grouped[name] = { value: 0, count: 0 };
    }
    grouped[name].value += amount;
    grouped[name].count += 1;
  }

  const sorted = Object.entries(grouped)
    .map(([name, data], idx) => ({
      name,
      value: data.value,
      count: data.count,
      percentage: Number(((data.value / totalIn) * 100).toFixed(1)),
      color: MACRO_COLORS_REVENUE[idx % MACRO_COLORS_REVENUE.length],
    }))
    .sort((a, b) => b.value - a.value);

  return sorted;
}
