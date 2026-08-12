import * as XLSX from 'xlsx';
import { parseISO, isValid, parse } from 'date-fns';
import { normalizeRedeStoreName, REDE_STORE_MAPPING } from './storeMapping';

export interface MarcoZeroGlobalData {
  dinheiroMp: number;
  aReceber: number;
  negativo: number;
  caixaAnterior: number;
}

export interface MarcoZeroStoreData {
  storeName: string;
  saldoLoja: number;
  osPendentes: { numero_os: string; data_os: string; valor_os: number }[];
}

export interface MarcoZeroResult {
  global: MarcoZeroGlobalData;
  stores: MarcoZeroStoreData[];
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
  if (val instanceof Date) return val.toISOString();
  
  if (typeof val === 'number') {
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    return isValid(date) ? date.toISOString() : null;
  }

  const str = String(val).trim();
  const dateStr = parse(str, 'dd/MM/yyyy', new Date());
  if (isValid(dateStr)) return dateStr.toISOString();
  
  const isoDate = parseISO(str);
  if (isValid(isoDate)) return isoDate.toISOString();

  return null;
};

const isKnownStore = (rawName: string): string | null => {
  if (!rawName) return null;
  const norm = rawName.trim().toLowerCase();
  
  // Ignora palavras comuns de rótulos de saldo
  if (
    norm.length < 3 || 
    norm.includes('saldo') || 
    norm.includes('limite') || 
    norm.includes('cartão') || 
    norm.includes('cartao') || 
    norm.includes('dinheiro') ||
    norm.includes('investimento') ||
    norm.includes('taxa')
  ) return null;
  
  if (REDE_STORE_MAPPING[norm]) return REDE_STORE_MAPPING[norm];
  
  const val = Object.values(REDE_STORE_MAPPING).find(v => v.toLowerCase() === norm);
  if (val) return val;
  
  // Fuzzy match estrito
  if (norm.includes('santo andr')) return REDE_STORE_MAPPING['mpsantoandre'];
  if (norm.includes('kennedy')) return REDE_STORE_MAPPING['mpkennedy'];
  if (norm.includes('jabaquara')) return REDE_STORE_MAPPING['mpjabaquara'];
  if (norm.includes('maua') || norm.includes('mauá')) return REDE_STORE_MAPPING['reidooleomaua'];
  if (norm.includes('piraporinha')) return REDE_STORE_MAPPING['mppiraporinha'];
  if (norm.includes('planalto')) return REDE_STORE_MAPPING['mpplanalto'];
  if (norm.includes('rudge')) return REDE_STORE_MAPPING['mprudge'];
  if (norm.includes('beretta')) return REDE_STORE_MAPPING['mpjorgeberetta'];
  if (norm.includes('módulo') || norm.includes('modulo')) return REDE_STORE_MAPPING['reidomodulo'];
  if (norm.includes('pedro') || norm === 'dp') return REDE_STORE_MAPPING['mpdompedro1'];
  
  return null;
};

export const parseMarcoZeroPlanilha = async (file: File): Promise<MarcoZeroResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        
        const globalData: MarcoZeroGlobalData = {
          dinheiroMp: 0,
          aReceber: 0,
          negativo: 0,
          caixaAnterior: 0
        };

        const storesMap: Record<string, MarcoZeroStoreData> = {};

        const getOrCreateStore = (name: string) => {
          if (!storesMap[name]) {
            storesMap[name] = {
              storeName: name,
              saldoLoja: 0,
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
            for (let i = 0; i < rawData.length; i++) {
              const row: any[] = rawData[i] as any[];
              if (!row || row.length === 0) continue;
              
              // 1. Extração Global: Coluna G (índice 6) = Valor, Coluna H (índice 7) = Rótulo
              const valColG = cleanNumber(row[6]);
              const labelColH = String(row[7] || '').toUpperCase().trim();
              
              if (valColG !== 0 && labelColH) {
                if (labelColH.includes('DINHEIRO MP') || labelColH === 'DINHEIRO:') {
                  globalData.dinheiroMp += valColG;
                } else if (labelColH.includes('A RECEBER') || labelColH.includes('CARTÃO') || labelColH.includes('CARTAO')) {
                  globalData.aReceber += valColG;
                } else if (labelColH.includes('NEGATIVO') || labelColH.includes('SALDO BANCO') || labelColH.includes('LIMITE')) {
                  globalData.negativo += Math.abs(valColG);
                } else if (labelColH.includes('CAIXA ATUAL') || labelColH.includes('CAIXA')) {
                  globalData.caixaAnterior += valColG;
                }
              }

              // 2. Extração de Saldo por Loja: Coluna B (índice 1) = Nome, Coluna D (índice 3) = Saldo
              const cellA = String(row[0] || '').trim();
              const cellB = String(row[1] || '').trim();
              
              const storeA = isKnownStore(cellA);
              const storeB = isKnownStore(cellB);
              
              const foundStore = storeB || storeA;
              if (foundStore) {
                const storeObj = getOrCreateStore(foundStore);
                const saldoDaLoja = cleanNumber(row[3]);
                if (saldoDaLoja !== 0) {
                  storeObj.saldoLoja = saldoDaLoja;
                }
              }
            }
          }

          if (upperSheet.includes('OS') || upperSheet.includes('PENDENTE')) {
            let activeStoreOS: MarcoZeroStoreData | null = null;
            
            for (let i = 0; i < rawData.length; i++) {
              const row: any[] = rawData[i] as any[];
              if (!row || row.length === 0) continue;

              const cellA = String(row[0] || '').trim();
              const cellB = String(row[1] || '').trim();
              
              const storeA = isKnownStore(cellA);
              const storeB = isKnownStore(cellB);
              
              const foundStore = storeB || storeA;
              if (foundStore) {
                activeStoreOS = getOrCreateStore(foundStore);
                continue;
              }
              
              if (activeStoreOS) {
                let osStr = '';
                let osDataStr = '';

                // Procura a OS nas primeiras 3 colunas
                for (let c = 0; c < 3; c++) {
                  const val = String(row[c] || '').trim();
                  if (/^\d{3,6}$/.test(val) && !osStr) {
                    osStr = val;
                  } else if ((val.includes('/') || val.includes('-') || row[c] instanceof Date) && !osDataStr) {
                    const d = parseDate(row[c]);
                    if (d) osDataStr = d;
                  }
                }

                // Só processa se de fato for uma linha com número de OS
                if (osStr) {
                  // O valor da OS fica estritamente na Coluna D (índice 3)
                  const osValor = cleanNumber(row[3]);
                  
                  // Coluna E (índice 4) ou F (índice 5) para status pago
                  const pagoStr = (String(row[4] || '') + String(row[5] || '')).toUpperCase();
                  const isPago = pagoStr.includes('PAGO') || pagoStr.includes('OK') || pagoStr.includes('PAGAMENTO');

                  if (osValor > 0 && !isPago) {
                    activeStoreOS.osPendentes.push({
                      numero_os: osStr,
                      data_os: osDataStr || new Date().toISOString(),
                      valor_os: osValor
                    });
                  }
                }
              }
            }
          }
        });

        const storeResult = Object.values(storesMap).filter(ext => 
          ext.saldoLoja !== 0 || ext.osPendentes.length > 0
        );

        resolve({
          global: globalData,
          stores: storeResult
        });

      } catch (error: any) {
        reject(new Error("Erro ao processar Marco Zero: " + error.message));
      }
    };

    reader.onerror = () => reject(new Error("Falha ao ler o arquivo."));
    reader.readAsBinaryString(file);
  });
};
