import * as XLSX from 'xlsx';
import { extractNumber, roundCurrency } from './numberUtils';
import { normalizeRedeStoreName } from './storeMapping';

export interface MdrParsedTransaction {
  id?: string;
  storeName: string;
  terminalNumber?: string;
  cnpj?: string;
  acquirer: string;
  brand: string;
  method: 'Cartão Débito' | 'Cartão Crédito À Vista' | 'Cartão Parcelado 2-6x' | 'Cartão Parcelado 7-12x' | 'PIX' | 'Outros';
  date: string;
  creditDate?: string;
  grossAmount: number;
  netAmount: number;
  feeAmount: number;
  effectiveRatePct: number;
  contractedRatePct: number;
  divergencePct: number;
  overchargeAmount: number;
  status: 'conforme' | 'atencao' | 'divergente' | 'sem_contrato';
}

export interface MdrAuditParsedResult {
  success: boolean;
  fileName: string;
  totalGross: number;
  totalNet: number;
  totalFees: number;
  totalOvercharge: number;
  avgEffectiveRatePct: number;
  divergentCount: number;
  transactions: MdrParsedTransaction[];
  byBrand: Array<{
    brand: string;
    gross: number;
    net: number;
    fees: number;
    effectiveRatePct: number;
    contractedRatePct: number;
    overcharge: number;
  }>;
  byStore: Array<{
    storeName: string;
    gross: number;
    net: number;
    fees: number;
    effectiveRatePct: number;
    overcharge: number;
    divergentCount: number;
  }>;
  error?: string;
}

// Taxas padrão de referência (MDR Contratado)
export const DEFAULT_CONTRACT_RATES: Record<string, { debito: number; credito_vista: number; credito_2_6: number; credito_7_12: number; pix: number }> = {
  visa: { debito: 1.09, credito_vista: 2.09, credito_2_6: 2.89, credito_7_12: 3.49, pix: 0.69 },
  mastercard: { debito: 1.09, credito_vista: 2.09, credito_2_6: 2.89, credito_7_12: 3.49, pix: 0.69 },
  elo: { debito: 1.45, credito_vista: 2.89, credito_2_6: 3.49, credito_7_12: 4.19, pix: 0.69 },
  hipercard: { debito: 1.45, credito_vista: 2.89, credito_2_6: 3.49, credito_7_12: 4.19, pix: 0.69 },
  padrao: { debito: 1.10, credito_vista: 2.10, credito_2_6: 2.90, credito_7_12: 3.50, pix: 0.70 },
};

export function getContractRate(brand: string, method: MdrParsedTransaction['method']): number {
  const b = brand.toLowerCase();
  const rates = DEFAULT_CONTRACT_RATES[b] || DEFAULT_CONTRACT_RATES.padrao;

  if (method === 'Cartão Débito') return rates.debito;
  if (method === 'Cartão Crédito À Vista') return rates.credito_vista;
  if (method === 'Cartão Parcelado 2-6x') return rates.credito_2_6;
  if (method === 'Cartão Parcelado 7-12x') return rates.credito_7_12;
  if (method === 'PIX') return rates.pix;
  return rates.credito_vista;
}

export async function parseRedeSalesFile(file: File): Promise<MdrAuditParsedResult> {
  try {
    const buffer = await file.arrayBuffer();
    let rows: any[][] = [];

    if (file.name.endsWith('.csv')) {
      const text = new TextDecoder('utf-8').decode(buffer);
      // Suporte a separadores , ; \t
      const firstLine = text.split('\n')[0] || '';
      const sep = firstLine.includes(';') ? ';' : firstLine.includes('\t') ? '\t' : ',';
      
      rows = text.split('\n').map(line => {
        return line.split(sep).map(c => c.replace(/^["']|["']$/g, '').trim());
      }).filter(r => r.some(c => c.length > 0));
    } else {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, raw: false });
    }

    if (rows.length < 2) {
      throw new Error('Arquivo de vendas vazio ou sem registros válidos.');
    }

    // Localiza índice do cabeçalho
    let headerIdx = 0;
    for (let i = 0; i < Math.min(10, rows.length); i++) {
      const row = rows[i];
      if (Array.isArray(row)) {
        const rowStr = row.map(c => String(c).toLowerCase().trim());
        if (rowStr.some(c => c.includes('venda') || c.includes('bruto') || c.includes('líquido') || c.includes('liquido') || c.includes('estabelecimento') || c.includes('bandeira'))) {
          headerIdx = i;
          break;
        }
      }
    }

    const headers = rows[headerIdx].map((h: any) => String(h || '').toLowerCase().trim());

    // Mapeamento dinâmico de colunas
    const findCol = (...keywords: string[]) => {
      for (const kw of keywords) {
        const idx = headers.findIndex(h => h.includes(kw));
        if (idx !== -1) return idx;
      }
      return -1;
    };

    const storeCol = findCol('nome do estabelecimento', 'nome fantasia', 'estabelecimento', 'loja');
    const pvCol = findCol('número do estabelecimento', 'numero do estabelecimento', 'pv', 'terminal');
    const cnpjCol = findCol('cnpj');
    const grossCol = findCol('valor da venda atualizado', 'valor da venda original', 'valor bruto', 'venda bruta', 'valor da venda');
    const netCol = findCol('valor líquido', 'valor liquido', 'líquido', 'liquido');
    const feeCol = findCol('valor total das taxas', 'total das taxas', 'valor taxa', 'mdr');
    const methodCol = findCol('meio de pagamento', 'modalidade', 'produto', 'tipo');
    const brandCol = findCol('bandeira');
    const installmentsCol = findCol('parcelas', 'plano', 'número de parcelas', 'numero de parcelas');
    const dateCol = findCol('data da venda', 'data venda', 'data');
    const creditDateCol = findCol('data do crédito', 'data credito', 'data prevista');

    const transactions: MdrParsedTransaction[] = [];
    let totalGross = 0;
    let totalNet = 0;
    let totalFees = 0;
    let totalOvercharge = 0;
    let divergentCount = 0;

    for (let i = headerIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!Array.isArray(row) || row.length === 0) continue;

      const grossRaw = grossCol !== -1 ? row[grossCol] : undefined;
      if (!grossRaw) continue;

      const grossAmount = extractNumber(grossRaw);
      if (grossAmount <= 0) continue;

      const netAmount = netCol !== -1 ? extractNumber(row[netCol]) : grossAmount;
      let feeAmount = feeCol !== -1 ? extractNumber(row[feeCol]) : 0;
      if (feeAmount === 0 && grossAmount > netAmount) {
        feeAmount = roundCurrency(grossAmount - netAmount);
      }

      const rawStore = storeCol !== -1 ? String(row[storeCol] || '').trim() : 'Loja Principal';
      const storeName = normalizeRedeStoreName(rawStore);
      if (storeName === 'IGNORAR') continue;

      const terminalNumber = pvCol !== -1 ? String(row[pvCol] || '').trim() : undefined;
      const cnpj = cnpjCol !== -1 ? String(row[cnpjCol] || '').trim() : undefined;

      // Inferência de Bandeira
      let brand = 'Outras';
      const brandRaw = (brandCol !== -1 ? String(row[brandCol] || '') : '').toLowerCase();
      const methodRaw = (methodCol !== -1 ? String(row[methodCol] || '') : '').toLowerCase();
      const combined = `${brandRaw} ${methodRaw}`;

      if (combined.includes('visa')) brand = 'Visa';
      else if (combined.includes('mast')) brand = 'Mastercard';
      else if (combined.includes('elo')) brand = 'Elo';
      else if (combined.includes('hiper')) brand = 'Hipercard';
      else if (combined.includes('amex') || combined.includes('american')) brand = 'Amex';
      else if (combined.includes('pix')) brand = 'PIX';

      // Inferência de Modalidade
      let method: MdrParsedTransaction['method'] = 'Cartão Crédito À Vista';
      const instRaw = installmentsCol !== -1 ? String(row[installmentsCol] || '') : '';
      const installments = parseInt(instRaw.replace(/\D/g, '')) || 1;

      if (combined.includes('débito') || combined.includes('debito')) {
        method = 'Cartão Débito';
      } else if (combined.includes('pix')) {
        method = 'PIX';
      } else if (installments > 6) {
        method = 'Cartão Parcelado 7-12x';
      } else if (installments >= 2) {
        method = 'Cartão Parcelado 2-6x';
      } else if (combined.includes('parcelado') && (combined.includes('2') || combined.includes('3') || combined.includes('4') || combined.includes('5') || combined.includes('6'))) {
        method = 'Cartão Parcelado 2-6x';
      } else if (combined.includes('parcelado')) {
        method = 'Cartão Parcelado 7-12x';
      }

      // Cálculo de MDR Efetivo
      const effectiveRatePct = roundCurrency(((grossAmount - netAmount) / grossAmount) * 100);
      const contractedRatePct = getContractRate(brand, method);
      const divergencePct = roundCurrency(effectiveRatePct - contractedRatePct);

      let overchargeAmount = 0;
      let status: MdrParsedTransaction['status'] = 'conforme';

      if (divergencePct > 0.30) {
        status = 'divergente';
        overchargeAmount = roundCurrency((divergencePct * grossAmount) / 100);
        divergentCount++;
      } else if (divergencePct > 0.10) {
        status = 'atencao';
        overchargeAmount = roundCurrency((divergencePct * grossAmount) / 100);
      }

      // Formatação de data
      let date = new Date().toISOString().split('T')[0];
      const rawDate = dateCol !== -1 ? String(row[dateCol] || '') : '';
      const dateMatch = rawDate.match(/(\d{2})[/-](\d{2})[/-](\d{4})/);
      if (dateMatch) {
        date = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
      }

      let creditDate = undefined;
      const rawCreditDate = creditDateCol !== -1 ? String(row[creditDateCol] || '') : '';
      const creditMatch = rawCreditDate.match(/(\d{2})[/-](\d{2})[/-](\d{4})/);
      if (creditMatch) {
        creditDate = `${creditMatch[3]}-${creditMatch[2]}-${creditMatch[1]}`;
      }

      totalGross = roundCurrency(totalGross + grossAmount);
      totalNet = roundCurrency(totalNet + netAmount);
      totalFees = roundCurrency(totalFees + feeAmount);
      totalOvercharge = roundCurrency(totalOvercharge + overchargeAmount);

      transactions.push({
        storeName,
        terminalNumber,
        cnpj,
        acquirer: 'REDE',
        brand,
        method,
        date,
        creditDate,
        grossAmount,
        netAmount,
        feeAmount,
        effectiveRatePct,
        contractedRatePct,
        divergencePct,
        overchargeAmount,
        status,
      });
    }

    // Agrupamento por Bandeira
    const brandMap: Record<string, { gross: number; net: number; fees: number; overcharge: number; count: number; contractedRate: number }> = {};
    // Agrupamento por Loja
    const storeMap: Record<string, { gross: number; net: number; fees: number; overcharge: number; divergentCount: number }> = {};

    transactions.forEach(t => {
      // Brand
      if (!brandMap[t.brand]) {
        brandMap[t.brand] = { gross: 0, net: 0, fees: 0, overcharge: 0, count: 0, contractedRate: t.contractedRatePct };
      }
      brandMap[t.brand].gross = roundCurrency(brandMap[t.brand].gross + t.grossAmount);
      brandMap[t.brand].net = roundCurrency(brandMap[t.brand].net + t.netAmount);
      brandMap[t.brand].fees = roundCurrency(brandMap[t.brand].fees + t.feeAmount);
      brandMap[t.brand].overcharge = roundCurrency(brandMap[t.brand].overcharge + t.overchargeAmount);
      brandMap[t.brand].count++;

      // Store
      if (!storeMap[t.storeName]) {
        storeMap[t.storeName] = { gross: 0, net: 0, fees: 0, overcharge: 0, divergentCount: 0 };
      }
      storeMap[t.storeName].gross = roundCurrency(storeMap[t.storeName].gross + t.grossAmount);
      storeMap[t.storeName].net = roundCurrency(storeMap[t.storeName].net + t.netAmount);
      storeMap[t.storeName].fees = roundCurrency(storeMap[t.storeName].fees + t.feeAmount);
      storeMap[t.storeName].overcharge = roundCurrency(storeMap[t.storeName].overcharge + t.overchargeAmount);
      if (t.status === 'divergente') storeMap[t.storeName].divergentCount++;
    });

    const byBrand = Object.entries(brandMap).map(([brand, data]) => ({
      brand,
      gross: data.gross,
      net: data.net,
      fees: data.fees,
      overcharge: data.overcharge,
      effectiveRatePct: data.gross > 0 ? roundCurrency((data.fees / data.gross) * 100) : 0,
      contractedRatePct: data.contractedRate,
    })).sort((a, b) => b.gross - a.gross);

    const byStore = Object.entries(storeMap).map(([storeName, data]) => ({
      storeName,
      gross: data.gross,
      net: data.net,
      fees: data.fees,
      overcharge: data.overcharge,
      effectiveRatePct: data.gross > 0 ? roundCurrency((data.fees / data.gross) * 100) : 0,
      divergentCount: data.divergentCount,
    })).sort((a, b) => b.overcharge - a.overcharge);

    const avgEffectiveRatePct = totalGross > 0 ? roundCurrency((totalFees / totalGross) * 100) : 0;

    return {
      success: true,
      fileName: file.name,
      totalGross,
      totalNet,
      totalFees,
      totalOvercharge,
      avgEffectiveRatePct,
      divergentCount,
      transactions,
      byBrand,
      byStore,
    };
  } catch (error: any) {
    return {
      success: false,
      fileName: file.name,
      totalGross: 0,
      totalNet: 0,
      totalFees: 0,
      totalOvercharge: 0,
      avgEffectiveRatePct: 0,
      divergentCount: 0,
      transactions: [],
      byBrand: [],
      byStore: [],
      error: error.message || 'Erro ao processar arquivo de vendas.',
    };
  }
}
