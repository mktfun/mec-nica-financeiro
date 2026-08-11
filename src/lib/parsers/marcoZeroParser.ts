import * as XLSX from 'xlsx';
import { parseISO, isValid, parse } from 'date-fns';

export interface MarcoZeroExtraction {
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

export const parseMarcoZeroPlanilha = async (file: File): Promise<MarcoZeroExtraction> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });

        // 1. Extração da Aba SALDO
        const saldoSheetName = workbook.SheetNames.find(n => n.toUpperCase().includes('SALDO'));
        if (!saldoSheetName) throw new Error("Aba 'SALDO' não encontrada no arquivo.");
        
        const saldoSheet = workbook.Sheets[saldoSheetName];
        const saldoData = XLSX.utils.sheet_to_json(saldoSheet, { header: 1 });

        let dinheiroMp = 0;
        let aReceber = 0;
        let negativo = 0;
        let caixaAnterior = 0;

        // Varrer a aba SALDO procurando pelas chaves
        for (let i = 0; i < saldoData.length; i++) {
          const row: any[] = saldoData[i] as any[];
          for (let j = 0; j < row.length; j++) {
            const cellVal = String(row[j] || '').toUpperCase().trim();
            if (cellVal.includes('DINHEIRO MP')) {
              // Pegar o valor na célula à direita ou em alguma das próximas
              dinheiroMp = cleanNumber(row[j + 1] || row[j + 2] || 0);
            }
            if (cellVal.includes('A RECEBER')) {
              aReceber = cleanNumber(row[j + 1] || row[j + 2] || 0);
            }
            if (cellVal === 'NEGATIVO') {
              negativo = cleanNumber(row[j + 1] || row[j + 2] || 0);
            }
            if (cellVal.includes('CAIXA ATUAL')) {
              caixaAnterior = cleanNumber(row[j + 1] || row[j + 2] || 0);
            }
          }
        }

        // 2. Extração da Aba OS (O Passivo)
        const osSheetName = workbook.SheetNames.find(n => n.toUpperCase() === 'OS');
        if (!osSheetName) throw new Error("Aba 'OS' não encontrada no arquivo.");
        
        const osSheet = workbook.Sheets[osSheetName];
        // Usar sheet_to_json com raw para tratar células mescladas melhor
        const osData = XLSX.utils.sheet_to_json(osSheet, { header: 1, raw: false });

        const osPendentes = [];
        
        // Identificar colunas chaves baseadas na linha de cabeçalho
        // Pelo log do Python, a linha 3 (índice 3 ou 4) possui "OS:", "Data:", "Valor:", "PAGAMENTOS"
        let osColIdx = -1;
        let dataColIdx = -1;
        let valorColIdx = -1;
        let pagamentosColIdx = -1;

        // Localizar as colunas
        for (let i = 0; i < 20; i++) {
          if (!osData[i]) continue;
          const row: any[] = osData[i] as any[];
          row.forEach((cell, idx) => {
            const val = String(cell || '').toUpperCase().trim();
            if (val.includes('OS:')) osColIdx = idx;
            if (val === 'DATA:') dataColIdx = idx;
            if (val.includes('VALOR:')) valorColIdx = idx;
            if (val.includes('PAGAMENTOS')) pagamentosColIdx = idx;
          });
          if (osColIdx !== -1 && dataColIdx !== -1 && valorColIdx !== -1) break;
        }

        if (osColIdx === -1 || valorColIdx === -1) {
          throw new Error("Não foi possível identificar as colunas 'OS:' ou 'Valor:' na aba OS.");
        }

        // Extrair OSs que estão vazias em pagamento
        for (let i = 0; i < osData.length; i++) {
          const row: any[] = osData[i] as any[];
          const osStr = String(row[osColIdx] || '').trim();
          
          // Ignorar se não for um número de OS válido (apenas dígitos)
          if (!osStr || !/^\d+$/.test(osStr)) continue;

          const valorVal = cleanNumber(row[valorColIdx]);
          if (valorVal <= 0) continue;

          // Verificar se há pagamentos preenchidos
          const pagamentosVal = pagamentosColIdx !== -1 ? String(row[pagamentosColIdx] || '').trim() : '';
          
          // Se o campo pagamentos estiver vazio, significa que a OS está PENDENTE na loja
          if (!pagamentosVal || pagamentosVal === 'null' || pagamentosVal === 'undefined' || pagamentosVal === '') {
            osPendentes.push({
              numero_os: osStr,
              data_os: parseDate(row[dataColIdx]) || new Date().toISOString(),
              valor_os: valorVal
            });
          }
        }

        resolve({
          dinheiroMp,
          aReceber,
          negativo,
          caixaAnterior,
          osPendentes
        });

      } catch (error: any) {
        reject(new Error("Erro ao processar Marco Zero: " + error.message));
      }
    };

    reader.onerror = () => reject(new Error("Falha ao ler o arquivo."));
    reader.readAsBinaryString(file);
  });
};
