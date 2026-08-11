import * as XLSX from 'xlsx';
import { parseISO, isValid, parse } from 'date-fns';
import { normalizeRedeStoreName } from './storeMapping';

export interface MarcoZeroExtraction {
  storeName: string;
  dinheiroMp: number;
  aReceber: number;
  negativo: number;
  caixaAnterior: number;
  osPendentes: { numero_os: string; data_os: string; valor_os: number }[];
}

// Helpers para limpeza de string para number
const cleanNumber = (val: any): number => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const str = String(val).replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
};

// Helpers para parse de data
const parseDate = (val: any): string | null => {
  if (!val) return null;
  // Se já for objeto Date do JS
  if (val instanceof Date) return val.toISOString();
  
  // Se for número de série do Excel (ex: 45123)
  if (typeof val === 'number') {
    // Excel base date is 1899-12-30
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    return isValid(date) ? date.toISOString() : null;
  }

  // Se for string no formato pt-BR
  const str = String(val).trim();
  const dateStr = parse(str, 'dd/MM/yyyy', new Date());
  if (isValid(dateStr)) return dateStr.toISOString();
  
  // Se for string ISO
  const isoDate = parseISO(str);
  if (isValid(isoDate)) return isoDate.toISOString();

  return null;
};

export const parseMarcoZeroPlanilha = async (file: File): Promise<MarcoZeroExtraction[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        
        const storesMap: Record<string, MarcoZeroExtraction> = {};

        const getOrCreateStore = (rawName: string) => {
          const name = normalizeRedeStoreName(rawName) || rawName.trim();
          if (!name) return null;
          if (!storesMap[name]) {
            storesMap[name] = {
              storeName: name,
              dinheiroMp: 0,
              aReceber: 0,
              negativo: 0,
              caixaAnterior: 0,
              osPendentes: []
            };
          }
          return storesMap[name];
        };

        workbook.SheetNames.forEach(sheetName => {
          const sheet = workbook.Sheets[sheetName];
          const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });

          const upperSheet = sheetName.toUpperCase();

          if (upperSheet.includes('SALDO') || upperSheet.includes('PLAN1')) {
            // Find columns
            let colMp = -1, colReceber = -1, colNegativo = -1, colCaixa = -1;
            
            // Try to find headers
            for (let i = 0; i < Math.min(10, rawData.length); i++) {
              if (!rawData[i]) continue;
              const row: any[] = rawData[i] as any[];
              row.forEach((cell, idx) => {
                const val = String(cell || '').toUpperCase().trim();
                if (val.includes('DINHEIRO MP')) colMp = idx;
                if (val.includes('A RECEBER')) colReceber = idx;
                if (val === 'NEGATIVO') colNegativo = idx;
                if (val.includes('CAIXA ATUAL') || val.includes('CAIXA')) colCaixa = idx;
              });
              if (colMp !== -1) break;
            }

            // Fallback column indexes se não achar os cabeçalhos exatos
            if (colMp === -1) colMp = 1;
            if (colReceber === -1) colReceber = 2;
            if (colNegativo === -1) colNegativo = 3;
            if (colCaixa === -1) colCaixa = 4;

            // Read rows
            for (let i = 0; i < rawData.length; i++) {
              const row: any[] = rawData[i] as any[];
              const storeRaw = String(row[0] || '').trim();
              
              if (!storeRaw || storeRaw.toUpperCase().includes('LOJA') || storeRaw.toUpperCase() === 'TOTAIS' || storeRaw.length < 3) continue;

              const storeExt = getOrCreateStore(storeRaw);
              if (!storeExt) continue;

              if (colMp !== -1 && row[colMp] !== undefined) storeExt.dinheiroMp = cleanNumber(row[colMp]);
              if (colReceber !== -1 && row[colReceber] !== undefined) storeExt.aReceber = cleanNumber(row[colReceber]);
              if (colNegativo !== -1 && row[colNegativo] !== undefined) storeExt.negativo = cleanNumber(row[colNegativo]);
              if (colCaixa !== -1 && row[colCaixa] !== undefined) storeExt.caixaAnterior = cleanNumber(row[colCaixa]);
            }
          }

          if (upperSheet.includes('OS') || upperSheet.includes('PENDENTE')) {
            // Find columns
            let osColIdx = -1, dataColIdx = -1, valorColIdx = -1, pagamentosColIdx = -1;

            for (let i = 0; i < Math.min(10, rawData.length); i++) {
              if (!rawData[i]) continue;
              const row: any[] = rawData[i] as any[];
              row.forEach((cell, idx) => {
                const val = String(cell || '').toUpperCase().trim();
                if (val.includes('OS:') || val === 'OS' || val === 'O.S') osColIdx = idx;
                if (val === 'DATA:' || val === 'DATA') dataColIdx = idx;
                if (val.includes('VALOR:') || val === 'VALOR') valorColIdx = idx;
                if (val.includes('PAGAMENTOS') || val === 'STATUS') pagamentosColIdx = idx;
              });
              if (osColIdx !== -1 && dataColIdx !== -1 && valorColIdx !== -1) break;
            }

            // Fallback column indexes
            if (osColIdx === -1) osColIdx = 1;
            if (dataColIdx === -1) dataColIdx = 2;
            if (valorColIdx === -1) valorColIdx = 3;

            for (let i = 0; i < rawData.length; i++) {
              const row: any[] = rawData[i] as any[];
              const storeRaw = String(row[0] || '').trim();
              
              // Verifica se a primeira coluna parece ser nome de loja válido
              if (!storeRaw || storeRaw.toUpperCase().includes('LOJA') || storeRaw.toUpperCase() === 'TOTAIS' || storeRaw.length < 3) continue;
              
              const osStr = String(row[osColIdx] || '').trim();
              if (!osStr || !/^\d+$/.test(osStr)) continue;

              const valorVal = cleanNumber(row[valorColIdx]);
              if (valorVal <= 0) continue;

              const pagamentosVal = pagamentosColIdx !== -1 ? String(row[pagamentosColIdx] || '').trim() : '';
              if (!pagamentosVal || pagamentosVal === 'null' || pagamentosVal === 'undefined' || pagamentosVal === '') {
                const storeExt = getOrCreateStore(storeRaw);
                if (storeExt) {
                  storeExt.osPendentes.push({
                    numero_os: osStr,
                    data_os: parseDate(row[dataColIdx]) || new Date().toISOString(),
                    valor_os: valorVal
                  });
                }
              }
            }
          }
        });

        const result = Object.values(storesMap).filter(ext => 
          ext.dinheiroMp !== 0 || ext.aReceber !== 0 || ext.negativo !== 0 || ext.caixaAnterior !== 0 || ext.osPendentes.length > 0
        );

        resolve(result);

      } catch (error: any) {
        reject(new Error("Erro ao processar Marco Zero: " + error.message));
      }
    };

    reader.onerror = () => reject(new Error("Falha ao ler o arquivo."));
    reader.readAsBinaryString(file);
  });
};
