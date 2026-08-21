import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { parseOFXFile, OfxParseResult } from '@/lib/parsers/ofxParser';
import { processOsFiles, OsImportResult } from '@/hooks/useOsImportProcessor';
import { extractNumber } from '@/lib/parsers/numberUtils';
import { parseRedeFile, RedeResult } from '@/lib/parsers/redeParser';
import type { MapaMetasResult } from '@/lib/parsers/mapaMetasParser';
import { parseContasAPagarFile } from '@/lib/parsers/contasPagarParser';
import { ContasAPagarParseResult } from '@/types/contasPagar';
import { supabase } from '@/lib/supabase';
import { traceLog } from '@/lib/logger';

export type UnifiedImportResult = {
  osFiles: OsImportResult[];
  maquininhaItems: MaquininhaItem[];
  redeResults: RedeResult[];
  ofxResults: OfxParseResult[];
  mapaMetasResults: MapaMetasResult[];
  contasPagarResults: ContasAPagarParseResult[];
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
    mapaMetasResults: [],
    contasPagarResults: [],
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
    
    const dateVendaIndex = headers.findIndex((h: string) => typeof h === 'string' && h.toLowerCase().trim() === 'data da venda');
    const dateCreditoIndex = headers.findIndex((h: string) => typeof h === 'string' && h.toLowerCase().includes('prevista de pagamento'));

    const items: MaquininhaItem[] = [];

    for (let i = headerRowIndex + 1; i < json.length; i++) {
      const row = json[i];
      if (!row || row.length === 0) continue;

      if (statusIndex !== -1) {
        const status = String(row[statusIndex] || '').toLowerCase();
        if (!status.includes('aprovad') && !status.includes('paga') && !status.includes('confirmad')) {
          continue;
        }
      }

      const val = extractNumber(row[valueIndex]);
      if (val > 0) {
        const storeName = estabIndex !== -1 ? String(row[estabIndex] || 'Desconhecida') : 'Desconhecida';
        const dateVenda = dateVendaIndex !== -1 ? String(row[dateVendaIndex] || '') : undefined;
        const dateCredito = dateCreditoIndex !== -1 ? String(row[dateCreditoIndex] || '') : undefined;

        items.push({
          fileName: file.name,
          storeName,
          amount: val,
          dateVenda,
          dateCredito
        });
      }
    }

    return items;
  };

  const processFiles = useCallback(async (files: File[], options?: { sessionId?: string }) => {
    setIsProcessing(true);
    const newResults: UnifiedImportResult = {
      osFiles: [],
      maquininhaItems: [],
      redeResults: [],
      ofxResults: [],
      mapaMetasResults: [],
      contasPagarResults: [],
    };

    try {
      const excelFiles = files.filter(f => f.name.endsWith('.xlsx') || f.name.endsWith('.xls') || f.name.endsWith('.csv'));
      const ofxFiles = files.filter(f => f.name.toLowerCase().endsWith('.ofx') || f.name.toLowerCase().endsWith('.ret'));
      const pdfFiles = files.filter(f => f.name.toLowerCase().endsWith('.pdf'));

      // 1. Processa OFX de forma assíncrona
      for (const file of ofxFiles) {
        const result = await parseOFXFile(file, { sessionId: options?.sessionId });
        newResults.ofxResults.push(result);
        await new Promise(r => setTimeout(r, 0));
      }
      
      // Processa PDF
      for (const file of pdfFiles) {
        const { parseMapaMetasPDF } = await import('@/lib/parsers/mapaMetasParser');
        const result = await parseMapaMetasPDF(file);
        newResults.mapaMetasResults.push(result);
        await new Promise(r => setTimeout(r, 0));
      }

      // 2. Processa os Excel (Contas a Pagar -> Rede -> OS -> Maquininha Genérica)
      if (excelFiles.length > 0) {
        for (let i = 0; i < excelFiles.length; i++) {
          const file = excelFiles[i];
          await new Promise(r => setTimeout(r, 0));

          // A) Testa se é BuscaContasAPagar
          if (file.name.toLowerCase().includes('contas') || file.name.toLowerCase().includes('pagar')) {
            try {
              const contasRes = await parseContasAPagarFile(file, file.name);
              if (contasRes.success && contasRes.totalBills > 0) {
                newResults.contasPagarResults.push(contasRes);
                continue;
              }
            } catch (e) {
              console.warn(`Tentativa de parse de contas em ${file.name} falhou:`, e);
            }
          }
          
          // B) Testa se é Rede
          try {
            const redeRes = await parseRedeFile(file, { sessionId: options?.sessionId });
            if (redeRes.success && redeRes.transactions.length > 0) {
               newResults.redeResults.push(redeRes);
               continue;
            }
          } catch (e) {
            // Não é Rede
          }
          
          // C) Testa se é OS
          try {
            const osRes = await processOsFiles([file], { sessionId: options?.sessionId });
            if (osRes && osRes[0] && osRes[0].success && osRes[0].osArray.length > 0) {
              newResults.osFiles.push(osRes[0]);
              continue;
            }
          } catch (e) {
            // Não é OS
          }
          
          // D) Fallback para Contas a Pagar caso o nome não contivesse "contas"
          try {
            const contasRes = await parseContasAPagarFile(file, file.name);
            if (contasRes.success && contasRes.totalBills > 0) {
              newResults.contasPagarResults.push(contasRes);
              continue;
            }
          } catch (e) {
            // Não é Contas a Pagar
          }

          // E) Fallback para Maquininha Genérica
          try {
            const maqItems = await processMaquininha(file, { sessionId: options?.sessionId });
            if (maqItems.length > 0) {
              newResults.maquininhaItems.push(...maqItems);
            } else {
              console.warn(`Arquivo ${file.name} ignorado: Não é OS, Rede, Contas nem Maquininha reconhecida.`);
            }
          } catch (err) {
            console.error(`Erro processando ${file.name} como maquininha genérica:`, err);
          }
        }
      }

      // 3. Puxa histórico do banco para calcular o delta_paid
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
    } finally {
      setIsProcessing(false);
    }
    return newResults;
  }, []);

  return { processFiles, isProcessing, results, setResults };
}
