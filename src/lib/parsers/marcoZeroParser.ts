import * as XLSX from 'xlsx';
import { parseISO, isValid, parse } from 'date-fns';
import { normalizeRedeStoreName, REDE_STORE_MAPPING } from './storeMapping';

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

export const parseMarcoZeroPlanilha = async (file: File): Promise<MarcoZeroExtraction[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        
        const storesMap: Record<string, MarcoZeroExtraction> = {};

        const getOrCreateStore = (name: string) => {
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
            let activeStore: MarcoZeroExtraction | null = null;
            
            for (let i = 0; i < rawData.length; i++) {
              const row: any[] = rawData[i] as any[];
              if (!row || row.length === 0) continue;
              
              const cellA = String(row[0] || '').trim();
              const cellB = String(row[1] || '').trim();
              
              const storeA = isKnownStore(cellA);
              const storeB = isKnownStore(cellB);
              
              if (storeA) {
                activeStore = getOrCreateStore(storeA);
                continue;
              } else if (storeB) {
                activeStore = getOrCreateStore(storeB);
                continue;
              }

              if (activeStore) {
                const label = (cellA + ' ' + cellB).toUpperCase();
                
                // O usuário relatou que os valores financeiros tendem a estar na coluna D (index 3) ou C (index 2)
                const valD = cleanNumber(row[3]);
                const valC = cleanNumber(row[2]);
                const fallbackVal = valD !== 0 ? valD : valC;

                if (fallbackVal !== 0) {
                  if (label.includes('DINHEIRO MP') || label === 'DINHEIRO:') {
                    activeStore.dinheiroMp += fallbackVal;
                  } else if (label.includes('A RECEBER') || label.includes('CARTÃO') || label.includes('CARTAO')) {
                    activeStore.aReceber += fallbackVal;
                  } else if (label.includes('NEGATIVO') || label.includes('SALDO BANCO') || label.includes('LIMITE')) {
                    activeStore.negativo += Math.abs(fallbackVal);
                  } else if (label.includes('CAIXA ATUAL') || label.includes('CAIXA')) {
                    activeStore.caixaAnterior += fallbackVal;
                  }
                }
              }
            }
          }

          if (upperSheet.includes('OS') || upperSheet.includes('PENDENTE')) {
            let activeStoreOS: MarcoZeroExtraction | null = null;
            
            for (let i = 0; i < rawData.length; i++) {
              const row: any[] = rawData[i] as any[];
              if (!row || row.length === 0) continue;

              const cellA = String(row[0] || '').trim();
              const cellB = String(row[1] || '').trim();
              
              const storeA = isKnownStore(cellA);
              const storeB = isKnownStore(cellB);
              
              if (storeA) {
                activeStoreOS = getOrCreateStore(storeA);
                continue;
              } else if (storeB) {
                activeStoreOS = getOrCreateStore(storeB);
                continue;
              }
              
              if (activeStoreOS) {
                let osStr = '';
                let osDataStr = '';
                let osValor = 0;
                let statusPagamento = '';

                // Escaneia a linha buscando padrões de OS
                row.forEach((cell, idx) => {
                  const val = String(cell || '').trim();
                  const upVal = val.toUpperCase();
                  
                  if (/^\d{3,6}$/.test(val) && !osStr) {
                    osStr = val; 
                  } else if ((upVal.includes('/') || upVal.includes('-') || cell instanceof Date) && !osDataStr) {
                    const d = parseDate(cell);
                    if (d) osDataStr = d;
                  } else if (cleanNumber(cell) > 0 && !osValor) {
                    // Para evitar pegar valores aleatórios que não sejam o valor da OS, assumimos que o valor da OS é o primeiro número > 0 lido após a OS, ou o maior.
                    // Aqui pegamos o primeiro positivo que encontrar.
                    osValor = cleanNumber(cell);
                  }
                  
                  if (upVal === 'PAGO' || upVal === 'OK' || upVal.includes('PAGAMENTO')) {
                    statusPagamento = upVal;
                  }
                });

                if (osStr && osValor > 0 && !statusPagamento) {
                  activeStoreOS.osPendentes.push({
                    numero_os: osStr,
                    data_os: osDataStr || new Date().toISOString(),
                    valor_os: osValor
                  });
                }
              }
            }
          }
        });

        // Filtra para manter apenas lojas que de fato tiveram valores lidos
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
