import * as XLSX from 'xlsx';
import { parseOFXFile, OfxParseResult } from '@/lib/parsers/ofxParser';
import { processOsFiles, OsImportResult } from '@/hooks/useOsImportProcessor';
import { parseRedeFile, RedeResult } from '@/lib/parsers/redeParser';
import { parseMapaMetasPDF, MapaMetasResult } from '@/lib/parsers/mapaMetasParser';
import { parseContasAPagarFile } from '@/lib/parsers/contasPagarParser';
import { ContasAPagarParseResult } from '@/types/contasPagar';
import { extractNumber } from '@/lib/parsers/numberUtils';

export type NormalizedOfxResult = OfxParseResult & {
  success: boolean;
  storeAlias?: string;
  accountKey?: string;
  error?: string;
};

export interface MaquininhaItem {
  fileName: string;
  storeName: string;
  amount: number;
  dateVenda?: string;
  dateCredito?: string;
}

export interface CentralImportResults {
  osFiles: OsImportResult[];
  redeResults: RedeResult[];
  ofxResults: NormalizedOfxResult[];
  contasPagarResults: ContasAPagarParseResult[];
  contasAPagarResults: ContasAPagarParseResult[];
  maquininhaItems: MaquininhaItem[];
  mapaMetasResults: MapaMetasResult[];
  validData: any[];
  errors: string[];
}

export async function processMaquininha(file: File, options?: { sessionId?: string }): Promise<MaquininhaItem[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
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
}

export async function parseCentralImports(
  files: File | File[],
  options?: { sessionId?: string }
): Promise<CentralImportResults> {
  const fileList = Array.isArray(files) ? files : [files];

  const results: CentralImportResults = {
    osFiles: [],
    redeResults: [],
    ofxResults: [],
    contasPagarResults: [],
    contasAPagarResults: [],
    maquininhaItems: [],
    mapaMetasResults: [],
    validData: [],
    errors: [],
  };

  const excelFiles = fileList.filter(f => 
    f.name.toLowerCase().endsWith('.xlsx') || 
    f.name.toLowerCase().endsWith('.xls') || 
    f.name.toLowerCase().endsWith('.csv')
  );
  const ofxFiles = fileList.filter(f => 
    f.name.toLowerCase().endsWith('.ofx') || 
    f.name.toLowerCase().endsWith('.ret')
  );
  const pdfFiles = fileList.filter(f => 
    f.name.toLowerCase().endsWith('.pdf')
  );

  // 1. Processa OFX / RET de forma assíncrona
  for (const file of ofxFiles) {
    try {
      const result = await parseOFXFile(file, { sessionId: options?.sessionId });
      const normalized: NormalizedOfxResult = {
        ...result,
        success: true,
        storeAlias: result.alias,
        accountKey: result.alias,
      };
      results.ofxResults.push(normalized);
    } catch (err: any) {
      console.error(`Erro ao processar OFX ${file.name}:`, err);
      const msg = `Erro no extrato ${file.name}: ${err.message || String(err)}`;
      results.errors.push(msg);
      results.ofxResults.push({
        alias: file.name,
        fileName: file.name,
        transactions: [],
        success: false,
        storeAlias: file.name,
        accountKey: file.name,
        error: err.message || String(err),
      });
    }
    await new Promise(r => setTimeout(r, 0));
  }

  // 2. Processa PDF (Mapa de Metas)
  for (const file of pdfFiles) {
    try {
      const result = await parseMapaMetasPDF(file);
      results.mapaMetasResults.push(result);
      if (!result.success && result.error) {
        results.errors.push(`Erro no PDF ${file.name}: ${result.error}`);
      }
    } catch (err: any) {
      console.error(`Erro ao processar PDF ${file.name}:`, err);
      const msg = `Erro no PDF ${file.name}: ${err.message || String(err)}`;
      results.errors.push(msg);
      results.mapaMetasResults.push({
        success: false,
        stores: [],
        totalFaturamento: 0,
        fileName: file.name,
        error: err.message || String(err),
      });
    }
    await new Promise(r => setTimeout(r, 0));
  }

  // 3. Processa Excel / CSV (Contas a Pagar -> Rede -> OS -> Fallback Contas -> Maquininha Genérica)
  for (let i = 0; i < excelFiles.length; i++) {
    const file = excelFiles[i];
    await new Promise(r => setTimeout(r, 0));

    // A) Se o nome sugerir Contas a Pagar
    const isContasName = file.name.toLowerCase().includes('contas') || file.name.toLowerCase().includes('pagar');
    if (isContasName) {
      try {
        const contasRes = await parseContasAPagarFile(file, file.name);
        if (contasRes.success && contasRes.totalBills > 0) {
          results.contasPagarResults.push(contasRes);
          results.contasAPagarResults.push(contasRes);
          continue;
        }
      } catch (e) {
        console.warn(`Tentativa de parse de contas em ${file.name} falhou:`, e);
      }
    }

    // B) Testa se é Rede
    try {
      const redeRes = await parseRedeFile(file, { sessionId: options?.sessionId });
      if (redeRes.success && redeRes.transactions && redeRes.transactions.length > 0) {
        results.redeResults.push(redeRes);
        continue;
      }
    } catch (e) {
      // Não é Rede
    }

    // C) Testa se é OS
    try {
      const osRes = await processOsFiles([file], { sessionId: options?.sessionId });
      if (osRes && osRes[0] && osRes[0].success && osRes[0].osArray && osRes[0].osArray.length > 0) {
        results.osFiles.push(osRes[0]);
        continue;
      }
    } catch (e) {
      // Não é OS
    }

    // D) Fallback para Contas a Pagar caso o nome não contivesse "contas"/"pagar"
    if (!isContasName) {
      try {
        const contasRes = await parseContasAPagarFile(file, file.name);
        if (contasRes.success && contasRes.totalBills > 0) {
          results.contasPagarResults.push(contasRes);
          results.contasAPagarResults.push(contasRes);
          continue;
        }
      } catch (e) {
        // Não é Contas a Pagar
      }
    }

    // E) Fallback para Maquininha Genérica
    try {
      const maqItems = await processMaquininha(file, { sessionId: options?.sessionId });
      if (maqItems && maqItems.length > 0) {
        results.maquininhaItems.push(...maqItems);
        continue;
      } else {
        const msg = `Arquivo ${file.name} ignorado: Não é OS, Rede, Contas nem Maquininha reconhecida.`;
        console.warn(msg);
        results.errors.push(msg);
      }
    } catch (err: any) {
      console.error(`Erro processando ${file.name} como maquininha genérica:`, err);
      results.errors.push(`Erro processando maquininha em ${file.name}: ${err.message || String(err)}`);
    }
  }

  return results;
}
