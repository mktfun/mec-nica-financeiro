import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { parseOFXFile, OfxParseResult } from '@/lib/parsers/ofxParser';
import { processOsFiles, OsImportResult } from '@/hooks/useOsImportProcessor';
import { extractNumber } from '@/lib/parsers/numberUtils';
import { parseRedeFile, RedeResult } from '@/lib/parsers/redeParser';
import type { MapaMetasResult } from '@/lib/parsers/mapaMetasParser';
import { supabase } from '@/lib/supabase';
import { traceLog } from '@/lib/logger';

export type UnifiedImportResult = {
  osFiles: OsImportResult[];
  maquininhaItems: MaquininhaItem[];
  redeResults: RedeResult[];
  ofxResults: OfxParseResult[];
  mapaMetasResults: MapaMetasResult[];
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
    redeResults: [],
    ofxResults: [],
    mapaMetasResults: []
  });

  const processMaquininha = async (file: File, options?: { sessionId?: string }): Promise<MaquininhaItem[]> => {
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
        
        let dateVenda = dateVendaIndex !== -1 ? row[dateVendaIndex] : undefined;
        let dateCredito = dateCreditoIndex !== -1 ? row[dateCreditoIndex] : undefined;
        
        // Converte números de data do Excel para dd/mm/yyyy
        const parseExcelDate = (val: any) => {
           if (!val) return undefined;
           if (typeof val === 'number') {
             // 25569 = Dias de 01/01/1900 a 01/01/1970
             const date = new Date(Math.round((val - 25569) * 86400 * 1000) + (new Date().getTimezoneOffset() * 60000));
             return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
           }
           return String(val);
        };

        dateVenda = parseExcelDate(dateVenda);
        dateCredito = parseExcelDate(dateCredito);

        if (!isNaN(val) && val > 0) {
          items.push({ fileName: file.name, storeName: estab, amount: val, dateVenda, dateCredito });
        }
      }
    }

    if (options?.sessionId && items.length > 0) {
      traceLog('3_EXTRACTION_EXCEL', 'DEBUG', `Extração Completa Maquininha Genérica: ${file.name}`, options.sessionId, {
        transactions_extracted: items.length,
        extracted_values: items.map(i => ({ amount: i.amount, dateVenda: i.dateVenda, storeName: i.storeName }))
      });
    }

    return items;
  };

  const isConsolidatedSummaryFile = (file: File): boolean => {
    const name = file.name.toUpperCase();
    return name.includes('CONCILIAC') || name.includes('CONCILIATION') || name.includes('RESUMO_GERAL') || name.includes('CONSOLIDADO');
  };

  const processFiles = useCallback(async (files: File[], options?: { sessionId?: string }) => {
    setIsProcessing(true);
    const newResults: UnifiedImportResult = { osFiles: [], maquininhaItems: [], redeResults: [], ofxResults: [], mapaMetasResults: [] };

    try {
      // 0. Filtrar planilhas consolidadas manuais (ex: CONCILIAÇÃO 2307.xlsx) para evitar travamento
      const validFiles = files.filter(file => {
        if (isConsolidatedSummaryFile(file)) {
          console.warn(`[CentralImport] Arquivo "${file.name}" ignorado automaticamente por ser uma planilha consolidada de conferência.`);
          return false;
        }
        return true;
      });

      // 1. Separar arquivos por extensão
      const ofxFiles = validFiles.filter(f => f.name.toLowerCase().endsWith('.ofx'));
      const pdfFiles = validFiles.filter(f => f.name.toLowerCase().endsWith('.pdf'));
      const excelFiles = validFiles.filter(f => f.name.toLowerCase().endsWith('.xls') || f.name.toLowerCase().endsWith('.xlsx'));

      // Processa OFX
      for (const file of ofxFiles) {
        const result = await parseOFXFile(file, { sessionId: options?.sessionId });
        newResults.ofxResults.push(result);
        await new Promise(r => setTimeout(r, 0));
      }
      
      // Processa PDF — lazy import para evitar SSR crash (DOMMatrix is not defined)
      for (const file of pdfFiles) {
        const { parseMapaMetasPDF } = await import('@/lib/parsers/mapaMetasParser');
        const result = await parseMapaMetasPDF(file);
        newResults.mapaMetasResults.push(result);
        await new Promise(r => setTimeout(r, 0));
      }

      // 2. Processa os Excel (tenta Rede -> OS -> Maquininha Genérica)
      if (excelFiles.length > 0) {
        for (let i = 0; i < excelFiles.length; i++) {
          const file = excelFiles[i];
          await new Promise(r => setTimeout(r, 0)); // Cede o controle ao navegador
          
          // Primeiro, testa se é do formato Rede
          try {
            const redeRes = await parseRedeFile(file, { sessionId: options?.sessionId });
            if (redeRes.success && redeRes.transactions.length > 0) {
               newResults.redeResults.push(redeRes);
               continue; // Sucesso como Rede
            }
          } catch (e) {
            // Não é Rede, segue para OS
          }
          
          // Depois, testa se é OS
          try {
            const osRes = await processOsFiles([file], { sessionId: options?.sessionId });
            if (osRes && osRes[0] && osRes[0].success && osRes[0].osArray.length > 0) {
              newResults.osFiles.push(osRes[0]);
              continue; // Sucesso como OS
            }
          } catch (e) {
            // Não é OS, segue para Maquininha Genérica
          }
          
          // Falhou como Rede e OS, tenta Maquininha Genérica
          try {
            const maqItems = await processMaquininha(file, { sessionId: options?.sessionId });
            if (maqItems.length > 0) {
              newResults.maquininhaItems.push(...maqItems);
            } else {
              console.warn(`Arquivo ${file.name} ignorado: Não é OS, Rede nem Maquininha reconhecida.`);
            }
          } catch (err) {
            console.error(`Erro processando ${file.name} como maquininha genérica:`, err);
          }
        }
      }

      // 3. Puxa histórico do banco para calcular o verdadeiro delta_paid para o preview
      if (newResults.osFiles.length > 0) {
        const { data: existingOs } = await supabase.from('patio_os').select('os_number, paid_value');
        const existingMap = new Map((existingOs || []).map(o => [String(o.os_number), Number(o.paid_value)]));
        
        newResults.osFiles.forEach(osResult => {
          osResult.osArray.forEach(os => {
            const oldValue = existingMap.get(String(os.os_number)) || 0;
            (os as any).delta_paid = Math.max(0, os.paid_value - oldValue);
            (os as any).is_new_os = !existingMap.has(String(os.os_number));
          });
        });
      }

      setResults(newResults);
      return newResults;

    } catch (e: any) {
      console.error(e);
      // Log do erro sem travar com alert nativo que bloqueia a UI
    } finally {
      setIsProcessing(false);
    }
    return newResults;
  }, []);

  return { processFiles, isProcessing, results, setResults };
}
