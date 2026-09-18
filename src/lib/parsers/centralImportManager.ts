import * as XLSX from 'xlsx';
import { parseOFXFile, OfxParseResult } from '@/lib/parsers/ofxParser';
import { isItauBankStatementPDF, parseItauBankStatementPDF } from '@/lib/parsers/itauPdfParser';
import { processOsFiles, OsImportResult } from '@/hooks/useOsImportProcessor';
import { parseRedeFile, RedeResult } from '@/lib/parsers/redeParser';
import { parseMapaMetasPDF, MapaMetasResult } from '@/lib/parsers/mapaMetasParser';
import { parseContasAPagarFile } from '@/lib/parsers/contasPagarParser';
import { ContasAPagarParseResult } from '@/types/contasPagar';
import { extractNumber } from '@/lib/parsers/numberUtils';
import { parseConciliacaoExcel, isConciliacaoExcel } from '@/lib/parsers/conciliacaoExcelParser';

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

export interface IngestionAlerts {
  duplicatedOfx: Array<{ fileName: string; storeAlias: string; reason: string }>;
  duplicatedOs: Array<{ fileName: string; storeAlias: string }>;
  ignoredEmptyRede: Array<{ fileName: string; storeName: string; reason?: string }>;
  duplicatedRede: Array<{ fileName: string; storeName: string; keptFile: string }>;
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
  alerts: IngestionAlerts;
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
    alerts: {
      duplicatedOfx: [],
      duplicatedOs: [],
      ignoredEmptyRede: [],
      duplicatedRede: [],
    },
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

  // 1. Processa OFX / RET de forma assíncrona com deduplicação
  for (const file of ofxFiles) {
    try {
      const result = await parseOFXFile(file, { sessionId: options?.sessionId });
      const normalized: NormalizedOfxResult = {
        ...result,
        success: true,
        storeAlias: result.alias,
        accountKey: result.alias,
      };

      // Deduplicação inteligente de OFX por conta / alias
      const existingOfxIdx = results.ofxResults.findIndex(o => 
        (normalized.accountKey && o.accountKey === normalized.accountKey) ||
        (normalized.alias && o.alias === normalized.alias) ||
        (normalized.alias && o.alias && normalized.alias.replace(/\D/g, '') === o.alias.replace(/\D/g, '') && normalized.alias.replace(/\D/g, '').length >= 8)
      );

      if (existingOfxIdx !== -1) {
        const existing = results.ofxResults[existingOfxIdx];
        results.alerts.duplicatedOfx.push({
          fileName: file.name,
          storeAlias: normalized.alias,
          reason: `Extrato bancário da mesma conta (${normalized.alias}) já importado pelo arquivo "${existing.fileName}". Mantida apenas uma instância.`
        });
        if ((normalized.transactions?.length || 0) > (existing.transactions?.length || 0)) {
          results.ofxResults[existingOfxIdx] = normalized;
        }
        continue;
      }

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

  // 2. Processa PDF (Extrato Bancário Itaú OU Mapa de Metas)
  for (const file of pdfFiles) {
    try {
      // Auto-detecção: verifica se o PDF é um Extrato Bancário Itaú
      const isBankStatement = await isItauBankStatementPDF(file);
      if (isBankStatement) {
        const result = await parseItauBankStatementPDF(file, { sessionId: options?.sessionId });
        const normalized: NormalizedOfxResult = {
          ...result,
          success: true,
          storeAlias: result.alias,
          accountKey: result.alias,
        };

        // Deduplicação inteligente com outros extratos (OFX ou PDF da mesma conta)
        const existingOfxIdx = results.ofxResults.findIndex(o => 
          (normalized.accountKey && o.accountKey === normalized.accountKey) ||
          (normalized.alias && o.alias === normalized.alias) ||
          (normalized.alias && o.alias && normalized.alias.replace(/\D/g, '') === o.alias.replace(/\D/g, '') && normalized.alias.replace(/\D/g, '').length >= 8)
        );

        if (existingOfxIdx !== -1) {
          const existing = results.ofxResults[existingOfxIdx];
          results.alerts.duplicatedOfx.push({
            fileName: file.name,
            storeAlias: normalized.alias,
            reason: `Extrato bancário da mesma conta (${normalized.alias}) já importado pelo arquivo "${existing.fileName}". Mantida apenas uma instância.`
          });
          if ((normalized.transactions?.length || 0) > (existing.transactions?.length || 0)) {
            results.ofxResults[existingOfxIdx] = normalized;
          }
          continue;
        }

        results.ofxResults.push(normalized);
        continue;
      }

      // Se não for extrato bancário, processa como Mapa de Metas
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
      if (redeRes.success && redeRes.transactions) {
        const storeName = redeRes.transactions[0]?.storeName || file.name;
        const totalNet = Number((redeRes.totalNet ?? redeRes.transactions.reduce((acc, t) => acc + Number(t.netAmount || 0), 0)).toFixed(2));
        const totalGross = Number((redeRes.totalGross ?? redeRes.transactions.reduce((acc, t) => acc + Number(t.grossAmount || 0), 0)).toFixed(2));

        // 1. Regra do usuário: Rede sem movimento não é importada
        if (redeRes.transactions.length === 0 || (totalNet <= 0 && totalGross <= 0)) {
          results.alerts.ignoredEmptyRede.push({
            fileName: file.name,
            storeName,
            reason: 'Arquivo sem movimentação financeira (R$ 0,00) ignorado.'
          });
          continue;
        }

        // 2. Regra do usuário: se tiver duplicado, notificar e considerar apenas um
        const existingRedeIdx = results.redeResults.findIndex(r => {
          const rStore = r.transactions[0]?.storeName;
          return rStore && storeName && rStore.toUpperCase() === storeName.toUpperCase();
        });

        if (existingRedeIdx !== -1) {
          const existing = results.redeResults[existingRedeIdx];
          results.alerts.duplicatedRede.push({
            fileName: file.name,
            storeName,
            keptFile: existing.fileName || 'arquivo anterior'
          });
          if ((redeRes.transactions?.length || 0) > (existing.transactions?.length || 0)) {
            results.redeResults[existingRedeIdx] = redeRes;
          }
          continue;
        }

        results.redeResults.push(redeRes);
        continue;
      }
    } catch (e) {
      // Não é Rede
    }

    // B.2) Testa se é Planilha Consolidada de CONCILIAÇÃO (com aba 'OS' das 10 lojas)
    const isConciliacao = isConciliacaoExcel(file);
    if (isConciliacao) {
      try {
        const concRes = await parseConciliacaoExcel(file, file.name);
        if (concRes && concRes.length > 0) {
          results.osFiles.push(...concRes);
          continue;
        }
      } catch (e: any) {
        console.warn(`Tentativa de parse de conciliação em ${file.name} falhou:`, e);
      }
    }

    // C) Testa se é OS individual/Conferência com deduplicação
    const isOsName = isConciliacao || file.name.toLowerCase().includes('conferencia') || file.name.toLowerCase().includes('os');
    let osErrorDetail = '';

    try {
      const osRes = await processOsFiles([file], { sessionId: options?.sessionId });
      if (osRes && osRes[0] && osRes[0].success && osRes[0].osArray && osRes[0].osArray.length > 0) {
        const osItem = osRes[0];
        const existingOsIdx = results.osFiles.findIndex(o => 
          o.storeAlias && osItem.storeAlias && o.storeAlias.toUpperCase() === osItem.storeAlias.toUpperCase()
        );

        if (existingOsIdx !== -1) {
          const existing = results.osFiles[existingOsIdx];
          results.alerts.duplicatedOs.push({
            fileName: file.name,
            storeAlias: osItem.storeAlias
          });
          if ((osItem.osArray?.length || 0) > (existing.osArray?.length || 0)) {
            results.osFiles[existingOsIdx] = osItem;
          }
          continue;
        }

        results.osFiles.push(osItem);
        continue;
      } else if (osRes && osRes[0] && !osRes[0].success && osRes[0].error) {
        osErrorDetail = osRes[0].error;
      }
    } catch (e: any) {
      osErrorDetail = e.message || String(e);
    }

    // C.2) Fallback para Conciliação se não foi pego pelo nome mas contém aba 'OS'
    if (!isConciliacao) {
      try {
        const concFallback = await parseConciliacaoExcel(file, file.name);
        if (concFallback && concFallback.length > 0) {
          results.osFiles.push(...concFallback);
          continue;
        }
      } catch {
        // Não é conciliação consolidada
      }
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
        const msg = isOsName && osErrorDetail
          ? `Falha no processamento de OS ${file.name}: ${osErrorDetail}`
          : `Arquivo ${file.name} ignorado: Não é OS, Rede, Contas nem Maquininha reconhecida.`;
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

/**
 * Escaneia a cobertura das 10 lojas ativas identificando extratos OFX e planilhas de OS faltantes
 */
export function scanStoreCoverage(
  results: CentralImportResults,
  activeStores: Array<{ id: string; name: string; aliases?: string[] }>,
  resolveStoreForOfx?: (ofx: any) => string,
  mapping: Record<string, string> = {}
) {
  const missingOfx: Array<{ id: string; name: string }> = [];
  const missingOs: Array<{ id: string; name: string }> = [];
  const coveredOfx: Array<{ id: string; name: string }> = [];
  const coveredOs: Array<{ id: string; name: string }> = [];

  for (const store of activeStores) {
    // 1. Verifica OFX
    const hasOfx = (results.ofxResults || []).some(o => {
      const mappedStoreId = (resolveStoreForOfx ? resolveStoreForOfx(o) : '') || mapping[o.alias] || mapping[o.accountKey || ''] || '';
      return mappedStoreId === store.id || (o.storeAlias && store.name.toLowerCase().includes(o.storeAlias.toLowerCase()));
    });

    if (hasOfx) coveredOfx.push(store);
    else missingOfx.push(store);

    // 2. Verifica OS
    const hasOs = (results.osFiles || []).some(os => {
      const mappedStoreId = mapping[os.storeAlias] || '';
      return mappedStoreId === store.id || store.name.toLowerCase().includes(os.storeAlias.toLowerCase());
    });

    if (hasOs) coveredOs.push(store);
    else missingOs.push(store);
  }

  return { missingOfx, missingOs, coveredOfx, coveredOs };
}
