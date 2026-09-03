import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  parseCentralImports, 
  CentralImportResults, 
  NormalizedOfxResult, 
  MaquininhaItem,
  processMaquininha
} from '@/lib/parsers/centralImportManager';
import type { OsImportResult } from '@/hooks/useOsImportProcessor';
import type { RedeResult } from '@/lib/parsers/redeParser';
import type { MapaMetasResult } from '@/lib/parsers/mapaMetasParser';
import type { ContasAPagarParseResult } from '@/types/contasPagar';

export type { MaquininhaItem, NormalizedOfxResult };
export { processMaquininha };

export type UnifiedImportResult = CentralImportResults;

export function useCentralImport() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<CentralImportResults>({
    osFiles: [],
    maquininhaItems: [],
    redeResults: [],
    ofxResults: [],
    mapaMetasResults: [],
    contasPagarResults: [],
    contasAPagarResults: [],
    validData: [],
    errors: [],
  });

  const processFiles = useCallback(async (files: File[], options?: { sessionId?: string }): Promise<CentralImportResults> => {
    setIsProcessing(true);
    let newResults: CentralImportResults = {
      osFiles: [],
      maquininhaItems: [],
      redeResults: [],
      ofxResults: [],
      mapaMetasResults: [],
      contasPagarResults: [],
      contasAPagarResults: [],
      validData: [],
      errors: [],
    };

    try {
      newResults = await parseCentralImports(files, options);

      // Hidratação com histórico do banco para calcular o delta_paid e is_new_os
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
      console.error('Erro em useCentralImport.processFiles:', e);
      newResults.errors.push(`Erro geral no processamento: ${e.message || String(e)}`);
    } finally {
      setIsProcessing(false);
    }
    return newResults;
  }, []);

  return { processFiles, isProcessing, results, setResults };
}
