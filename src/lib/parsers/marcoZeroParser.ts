import * as XLSX from 'xlsx';
import { parseISO, isValid, parse } from 'date-fns';
import { normalizeRedeStoreName, REDE_STORE_MAPPING } from './storeMapping';
import { extractNumber, roundCurrency } from './numberUtils';

export interface MarcoZeroGlobalData {
  dinheiroMp: number;
  aReceber: number;
  negativo: number;
  caixaAnterior: number;
  caixaAtual: number;
  faturamentoAtual: number;
  fluxoCaixa: number;
  faturamentoAnterior: number;
  valorDisponivelContas: number;
  valorDasContas: number;
  diferenca: number;
  jurosAtual: number;
  contas: number;
  prolaboreDaniel: number;
  prolaboreHenrique: number;
  saldoBancos: number;
  totalPatio: number;
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
  return extractNumber(val);
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
  if (norm.includes('santo andr') || norm.includes('santo andre')) return REDE_STORE_MAPPING['mpsantoandre'] || 'Santo André - HD';
  if (norm.includes('kennedy')) return REDE_STORE_MAPPING['mpkennedy'] || 'Kennedy - MP';
  if (norm.includes('jabaquara')) return REDE_STORE_MAPPING['mpjabaquara'] || 'Jabaquara - JAB';
  if (norm.includes('maua') || norm.includes('mauá')) return REDE_STORE_MAPPING['reidooleomaua'] || 'Maua - MHE';
  if (norm.includes('piraporinha')) return REDE_STORE_MAPPING['mppiraporinha'] || 'Piraporinha - EMPORIO';
  if (norm.includes('planalto')) return REDE_STORE_MAPPING['mpplanalto'] || 'Planalto - BRASICAR';
  if (norm.includes('rudge')) return REDE_STORE_MAPPING['mprudge'] || 'Rudge Ramos - CAP';
  if (norm.includes('beretta') || norm.includes('jorge')) return REDE_STORE_MAPPING['mpjorgeberetta'] || 'Jorge Beretta - DHJV';
  if (norm.includes('módulo') || norm.includes('modulo')) return REDE_STORE_MAPPING['reidomodulo'] || 'Rei do Módulo - MP';
  if (norm.includes('pedro') || norm === 'dp' || norm.includes('dom pedro')) return REDE_STORE_MAPPING['mpdompedro1'] || 'Dom Pedro - DP';
  
  return null;
};

export const parseMarcoZeroPlanilha = async (file: File): Promise<MarcoZeroResult> => {
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: true });
    
    const globalData: MarcoZeroGlobalData = {
      dinheiroMp: 0,
      aReceber: 0,
      negativo: 0,
      caixaAnterior: 0,
      caixaAtual: 0,
      faturamentoAtual: 0,
      fluxoCaixa: 0,
      faturamentoAnterior: 0,
      valorDisponivelContas: 0,
      valorDasContas: 0,
      diferenca: 0,
      jurosAtual: 0,
      contas: 0,
      prolaboreDaniel: 0,
      prolaboreHenrique: 0,
      saldoBancos: 0,
      totalPatio: 0
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
      const rawData = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, raw: true });
      const upperSheet = sheetName.toUpperCase();

      if (upperSheet.includes('SALDO') || upperSheet.includes('PLAN1')) {
        let currentStoreContext: MarcoZeroStoreData | null = null;

        for (let i = 0; i < rawData.length; i++) {
          const row = rawData[i];
          if (!row || row.length === 0) continue;
          
          // 1. Extração Global Resiliente
          for (let j = 0; j < row.length; j++) {
            const cell = row[j];
            if (typeof cell === 'string') {
              const label = String(cell || '').toUpperCase().trim();
              const cleanLabel = label.replace('ITAÁŠ', 'ITAÚ').replace('Â±', '±');
              
              let valColG = 0;
              const isTargetLabel = 
                cleanLabel === 'DINHEIRO MP' || 
                cleanLabel === 'A RECEBER' || 
                cleanLabel.includes('NEGATIVO') || 
                cleanLabel === 'CAIXA ANTERIOR' || 
                cleanLabel === 'CAIXA ATUAL' || 
                cleanLabel.includes('FATURAMENTO ATUAL') || 
                cleanLabel.includes('FATURAMENTO ANTERIOR') || 
                cleanLabel.includes('FLUXO CAIXA') || 
                cleanLabel.includes('FLUXO DE CAIXA') || 
                cleanLabel.includes('PAGAMENTO DE CONTAS') || 
                cleanLabel === 'VALOR DAS CONTAS' || 
                cleanLabel === 'JUROS ATUAL' || 
                cleanLabel === 'CONTAS' || 
                cleanLabel === 'SALDO' ||
                cleanLabel.includes('PROLABORE DANIEL') || 
                cleanLabel.includes('PROLABORE HENRIQUE');

              if (cleanLabel && isTargetLabel) {
                for (let k = j - 1; k >= 0; k--) {
                  const possibleNum = cleanNumber(row[k]);
                  if (possibleNum !== 0 || row[k] === 0 || row[k] === '0') {
                    valColG = possibleNum;
                    break;
                  }
                }
                if (valColG === 0) {
                  for (let k = j + 1; k < row.length; k++) {
                    const possibleNum = cleanNumber(row[k]);
                    if (possibleNum !== 0 || row[k] === 0 || row[k] === '0') {
                      valColG = possibleNum;
                      break;
                    }
                  }
                }

                if (cleanLabel === 'DINHEIRO MP') {
                  globalData.dinheiroMp = valColG;
                } else if (cleanLabel === 'A RECEBER') {
                  globalData.aReceber = valColG;
                } else if (cleanLabel.includes('NEGATIVO')) {
                  globalData.negativo = Math.abs(valColG);
                } else if (cleanLabel === 'CAIXA ANTERIOR') {
                  globalData.caixaAnterior = valColG;
                } else if (cleanLabel === 'CAIXA ATUAL') {
                  globalData.caixaAtual = valColG;
                } else if (cleanLabel.includes('FATURAMENTO ATUAL')) {
                  globalData.faturamentoAtual = valColG;
                } else if (cleanLabel.includes('FATURAMENTO ANTERIOR')) {
                  globalData.faturamentoAnterior = valColG;
                } else if (cleanLabel.includes('FLUXO CAIXA') || cleanLabel.includes('FLUXO DE CAIXA')) {
                  globalData.fluxoCaixa = valColG;
                } else if (cleanLabel.includes('PAGAMENTO DE CONTAS')) {
                  globalData.valorDisponivelContas = valColG;
                } else if (cleanLabel === 'VALOR DAS CONTAS') {
                  globalData.valorDasContas = valColG;
                } else if (cleanLabel === 'JUROS ATUAL') {
                  globalData.jurosAtual = valColG;
                } else if (cleanLabel === 'CONTAS') {
                  globalData.contas = valColG;
                } else if (cleanLabel === 'SALDO' && globalData.saldoBancos === 0 && valColG > 1000) {
                  globalData.saldoBancos = valColG;
                } else if (cleanLabel.includes('PROLABORE DANIEL')) {
                  globalData.prolaboreDaniel = valColG;
                } else if (cleanLabel.includes('PROLABORE HENRIQUE')) {
                  globalData.prolaboreHenrique = valColG;
                }
              }
            }
          }

          // 2. Extração de Contexto de Loja e Saldo Bancário por Loja (Multi-linha)
          const cellA = String(row[0] || '').trim();
          const cellB = String(row[1] || '').trim();
          
          const storeA = isKnownStore(cellA);
          const storeB = isKnownStore(cellB);
          const foundStore = storeB || storeA;

          if (foundStore) {
            currentStoreContext = getOrCreateStore(foundStore);
          }

          const rowText = row.map(c => String(c || '')).join(' ').toLowerCase();
          if (currentStoreContext && (rowText.includes('saldo banco') || rowText.includes('saldo itaú') || rowText.includes('saldo itau'))) {
            let saldoDaLoja = 0;
            for (let c = 0; c < row.length; c++) {
              const val = cleanNumber(row[c]);
              if (val > 0 && c !== 0) {
                saldoDaLoja = val;
                break;
              }
            }
            if (saldoDaLoja > 0 && currentStoreContext.saldoLoja === 0) {
              currentStoreContext.saldoLoja = saldoDaLoja;
            }
          }
        }

        globalData.diferenca = roundCurrency(globalData.valorDisponivelContas - globalData.valorDasContas);
      }

      if (upperSheet.includes('OS') || upperSheet.includes('PENDENTE')) {
        let activeStoreOS: MarcoZeroStoreData | null = null;
        
        for (let i = 0; i < rawData.length; i++) {
          const row = rawData[i];
          if (!row || row.length === 0) continue;

          const cellA = String(row[0] || '').trim();
          const cellB = String(row[1] || '').trim();
          
          const storeA = isKnownStore(cellA);
          const storeB = isKnownStore(cellB);
          
          const foundStore = storeB || storeA;
          if (foundStore && !cellA.toLowerCase().includes('os') && !cellB.toLowerCase().includes('os')) {
            activeStoreOS = getOrCreateStore(foundStore);
            continue;
          }
          
          if (activeStoreOS) {
            let osStr = '';
            let osDataStr = '';

            for (let c = 0; c < 3; c++) {
              const val = String(row[c] || '').trim();
              if (/^\d{3,6}$/.test(val) && !osStr) {
                osStr = val;
              } else if ((val.includes('/') || val.includes('-') || row[c] instanceof Date) && !osDataStr) {
                const d = parseDate(row[c]);
                if (d) osDataStr = d;
              }
            }

            if (osStr) {
              const osValor = cleanNumber(row[3]);
              const pagoStr = (String(row[4] || '') + String(row[5] || '')).toUpperCase();
              const isPago = pagoStr.includes('PAGO') || (pagoStr.includes('OK') && !pagoStr.includes('PIX:') && !pagoStr.includes('CREDITO:'));

              if (osValor > 0 && !isPago) {
                activeStoreOS.osPendentes.push({
                  numero_os: osStr,
                  data_os: osDataStr || new Date().toISOString(),
                  valor_os: osValor
                });
                globalData.totalPatio += osValor;
              }
            }
          }
        }
      }
    });

    // Se saldoBancos não veio explícito, calcula da soma das lojas
    const sumLojaBancos = Object.values(storesMap).reduce((acc, curr) => acc + curr.saldoLoja, 0);
    if (globalData.saldoBancos === 0 && sumLojaBancos > 0) {
      globalData.saldoBancos = sumLojaBancos - (globalData.negativo || 0);
    }

    const storeResult = Object.values(storesMap).filter(ext => 
      ext.saldoLoja !== 0 || ext.osPendentes.length > 0
    );

    const result: MarcoZeroResult = {
      global: globalData,
      stores: storeResult
    };

    console.log('[MarcoZeroParser] Extração concluída com sucesso:', result);
    console.log('[MarcoZeroParser] Globais extraídos:', globalData);
    console.log('[MarcoZeroParser] Lojas extraídas:', storeResult);

    return result;
  } catch (error: any) {
    console.error('[MarcoZeroParser] Erro ao processar Marco Zero:', error);
    throw new Error("Erro ao processar Marco Zero: " + error.message);
  }
};
