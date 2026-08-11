import * as XLSX from 'xlsx';
import { parseISO, isValid, parse } from 'date-fns';

export interface MarcoZeroExtraction {
  sheetName: string;
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
        
        const extractions: MarcoZeroExtraction[] = [];

        workbook.SheetNames.forEach(sheetName => {
          const sheet = workbook.Sheets[sheetName];
          const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });

          let dinheiroMp = 0;
          let aReceber = 0;
          let negativo = 0;
          let caixaAnterior = 0;
          const osPendentes: any[] = [];

          let hasAnyData = false;

          // 1. Procurar saldos
          for (let i = 0; i < rawData.length; i++) {
            const row: any[] = rawData[i] as any[];
            for (let j = 0; j < row.length; j++) {
              const cellVal = String(row[j] || '').toUpperCase().trim();
              if (cellVal.includes('DINHEIRO MP')) {
                dinheiroMp = cleanNumber(row[j + 1] || row[j + 2] || 0);
                hasAnyData = true;
              }
              if (cellVal.includes('A RECEBER')) {
                aReceber = cleanNumber(row[j + 1] || row[j + 2] || 0);
                hasAnyData = true;
              }
              if (cellVal === 'NEGATIVO') {
                negativo = cleanNumber(row[j + 1] || row[j + 2] || 0);
                hasAnyData = true;
              }
              if (cellVal.includes('CAIXA ATUAL')) {
                caixaAnterior = cleanNumber(row[j + 1] || row[j + 2] || 0);
                hasAnyData = true;
              }
            }
          }

          // 2. Procurar OSs (O Passivo)
          let osColIdx = -1;
          let dataColIdx = -1;
          let valorColIdx = -1;
          let pagamentosColIdx = -1;

          for (let i = 0; i < Math.min(50, rawData.length); i++) {
            if (!rawData[i]) continue;
            const row: any[] = rawData[i] as any[];
            row.forEach((cell, idx) => {
              const val = String(cell || '').toUpperCase().trim();
              if (val.includes('OS:')) osColIdx = idx;
              if (val === 'DATA:') dataColIdx = idx;
              if (val.includes('VALOR:')) valorColIdx = idx;
              if (val.includes('PAGAMENTOS')) pagamentosColIdx = idx;
            });
            if (osColIdx !== -1 && dataColIdx !== -1 && valorColIdx !== -1) break;
          }

          if (osColIdx !== -1 && valorColIdx !== -1) {
            for (let i = 0; i < rawData.length; i++) {
              const row: any[] = rawData[i] as any[];
              const osStr = String(row[osColIdx] || '').trim();
              
              if (!osStr || !/^\d+$/.test(osStr)) continue;

              const valorVal = cleanNumber(row[valorColIdx]);
              if (valorVal <= 0) continue;

              const pagamentosVal = pagamentosColIdx !== -1 ? String(row[pagamentosColIdx] || '').trim() : '';
              
              if (!pagamentosVal || pagamentosVal === 'null' || pagamentosVal === 'undefined' || pagamentosVal === '') {
                osPendentes.push({
                  numero_os: osStr,
                  data_os: parseDate(row[dataColIdx]) || new Date().toISOString(),
                  valor_os: valorVal
                });
                hasAnyData = true;
              }
            }
          }

          if (hasAnyData) {
            extractions.push({
              sheetName,
              dinheiroMp,
              aReceber,
              negativo,
              caixaAnterior,
              osPendentes
            });
          }
        });

        resolve(extractions);

      } catch (error: any) {
        reject(new Error("Erro ao processar Marco Zero: " + error.message));
      }
    };

    reader.onerror = () => reject(new Error("Falha ao ler o arquivo."));
    reader.readAsBinaryString(file);
  });
};
