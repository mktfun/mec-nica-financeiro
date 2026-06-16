import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { parseOFXFile, OfxParseResult } from '@/lib/parsers/ofxParser';
import { processOsFiles, OsImportResult } from '@/hooks/useOsImportProcessor';
import { extractNumber } from '@/lib/parsers/numberUtils';

export type UnifiedImportResult = {
  osFiles: OsImportResult[];
  maquininhaItems: MaquininhaItem[];
  ofxResults: OfxParseResult[];
};

export type MaquininhaItem = {
  fileName: string;
  storeName: string;
  amount: number;
  dateVenda?: string;
  dateCredito?: string;
};

export function useCentralImport() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<UnifiedImportResult>({
    osFiles: [],
    maquininhaItems: [],
    ofxResults: []
  });

  const processMaquininha = async (file: File): Promise<MaquininhaItem[]> => {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
    
    let headerRowIndex = 0;
    for (let i = 0; i < Math.min(10, json.length); i++) {
      const row = json[i];
      if (row && (row.includes('CNPJ') || row.includes('NOME DO ESTABELECIMENTO') || row.includes('nome do estabelecimento') || row.includes('Estabelecimento'))) {
        headerRowIndex = i;
        break;
      }
    }

    const headers = json[headerRowIndex] || [];
    const statusIndex = headers.findIndex((h: string) => typeof h === 'string' && h.toLowerCase().trim() === 'status da venda');
    const valueIndex = headers.findIndex((h: string) => typeof h === 'string' && h.toLowerCase().trim() === 'valor da venda original');
    const estabIndex = headers.findIndex((h: string) => typeof h === 'string' && (h.toLowerCase().trim() === 'nome do estabelecimento' || h.toLowerCase().trim() === 'estabelecimento'));
    
    // Tenta achar colunas de data
    const dateVendaIndex = headers.findIndex((h: string) => typeof h === 'string' && h.toLowerCase().trim() === 'data da venda');
    const dateCreditoIndex = headers.findIndex((h: string) => typeof h === 'string' && h.toLowerCase().includes('prevista de pagamento'));

    const items: MaquininhaItem[] = [];
    for (let i = headerRowIndex + 1; i < json.length; i++) {
      const row = json[i];
      if (!row || row.length === 0) continue;
      
      const status = statusIndex !== -1 ? String(row[statusIndex] || '').toLowerCase() : 'aprovada';
      if (status === 'aprovada' || status === 'pago') {
        const val = extractNumber(row[valueIndex]);
        const estab = estabIndex !== -1 ? String(row[estabIndex] || 'DESCONHECIDO') : 'DESCONHECIDO';
        
        const dateVenda = dateVendaIndex !== -1 ? String(row[dateVendaIndex] || '') : undefined;
        const dateCredito = dateCreditoIndex !== -1 ? String(row[dateCreditoIndex] || '') : undefined;

        if (!isNaN(val) && val > 0) {
          items.push({ fileName: file.name, storeName: estab, amount: val, dateVenda, dateCredito });
        }
      }
    }
    return items;
  };

  const processFiles = useCallback(async (files: File[]) => {
    setIsProcessing(true);
    const newResults: UnifiedImportResult = { osFiles: [], maquininhaItems: [], ofxResults: [] };

    try {
      // 1. Separar arquivos OFX
      const ofxFiles = files.filter(f => f.name.toLowerCase().endsWith('.ofx'));
      const excelFiles = files.filter(f => !f.name.toLowerCase().endsWith('.ofx'));

      // Processa OFX
      for (const file of ofxFiles) {
        const result = await parseOFXFile(file);
        newResults.ofxResults.push(result);
      }

      // 2. Processa os Excel (tenta OS, se falhar, tenta Maquininha)
      if (excelFiles.length > 0) {
        const osResults = await processOsFiles(excelFiles);
        
        for (let i = 0; i < excelFiles.length; i++) {
          const osRes = osResults.find(r => r.fileName === excelFiles[i].name);
          if (osRes && osRes.success) {
            newResults.osFiles.push(osRes);
          } else {
            // Falhou como OS, tentar como Maquininha
            try {
              const maqItems = await processMaquininha(excelFiles[i]);
              if (maqItems.length > 0) {
                newResults.maquininhaItems.push(...maqItems);
              } else {
                console.warn(`Arquivo ${excelFiles[i].name} ignorado: Não é OS nem Maquininha reconhecida.`);
              }
            } catch (err) {
              console.error(`Erro processando ${excelFiles[i].name} como maquininha:`, err);
            }
          }
        }
      }

      setResults(prev => ({
        osFiles: [...prev.osFiles, ...newResults.osFiles],
        maquininhaItems: [...prev.maquininhaItems, ...newResults.maquininhaItems],
        ofxResults: [...prev.ofxResults, ...newResults.ofxResults]
      }));

    } catch (e) {
      console.error(e);
      alert('Erro ao processar arquivos.');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return { processFiles, isProcessing, results, setResults };
}
