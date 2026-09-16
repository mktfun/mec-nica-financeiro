// Import dinâmico para evitar SSR crash (DOMMatrix is not defined)
export interface MapaMetasStore {
  storeCode?: string;
  storeSigla?: string;
  storeName: string;
  faturamentoBruto: number;
  faturamentoLiquido: number;
  totalFaturamento: number;
  totalVendas?: number;
  ticketMedio?: number;
  percentualServ?: number;
  previsao?: number;
  mesAnterior?: number;
  anoAnterior?: number;
  meta?: number;
  percentualMeta?: number;
}

export interface MapaMetasResult {
  success: boolean;
  stores: MapaMetasStore[];
  totalFaturamento: number;
  fileName: string;
  targetDate?: string;
  totalVendas?: number;
  totalPrevisao?: number;
  totalMesAnterior?: number;
  totalAnoAnterior?: number;
  totalMeta?: number;
  percentualMetaTotal?: number;
  error?: string;
}

export function parsePtBrNumber(val: string): number {
  if (!val) return 0;
  const clean = val.trim().replace(/[^\d.,\-]/g, '');
  if (!clean) return 0;
  if (clean.includes(',') && clean.includes('.')) {
    return parseFloat(clean.replace(/\./g, '').replace(',', '.')) || 0;
  }
  if (clean.includes(',')) {
    return parseFloat(clean.replace(',', '.')) || 0;
  }
  return parseFloat(clean) || 0;
}

export function parseMapaMetasLines(lines: string[], fileName: string = 'MapaDeMetas.pdf'): MapaMetasResult {
  let targetDate: string | undefined;
  const stores: MapaMetasStore[] = [];
  let summaryTotalFaturamento = 0;
  let summaryTotalVendas = 0;
  let summaryTotalPrevisao = 0;
  let summaryTotalMesAnterior = 0;
  let summaryTotalAnoAnterior = 0;
  let summaryTotalMeta = 0;
  let summaryPercentualMeta: number | undefined;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // 1. Extrair Data do Cabeçalho (ex: "Data 07/09/2026")
    if (!targetDate) {
      const dateMatch = trimmed.match(/Data\s*[:\s]?\s*(\d{2})[/.-](\d{2})[/.-](\d{4})/i);
      if (dateMatch) {
        targetDate = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
      }
    }

    // 2. Linha de Filial (ex: "4045 MPdompedro1 00,00 0 1.360,00 2 4.340,00 4 ... 9.669,70 9 1.074 70 41.902,03 104.430,64 73.261,77 119.900,00 -65")
    const storeRowMatch = trimmed.match(/^(\d{2,5})\s+([A-Za-z0-9_]+)\s+(.+)$/);
    if (storeRowMatch) {
      const storeCode = storeRowMatch[1];
      const storeSigla = storeRowMatch[2];
      const rawValues = storeRowMatch[3].trim();
      const tokens = rawValues.split(/\s+/);

      if (tokens.length >= 7) {
        // Colunas a partir do final:
        // [-1] %M
        // [-2] Meta
        // [-3] AnoAnterior
        // [-4] MêsAnterior
        // [-5] Previsão
        // [-6] Serv
        // [-7] TK
        // [-8] V (Vendas)
        // [-9] Total Faturamento
        let percentualMeta: number | undefined;
        let meta: number | undefined;
        let anoAnterior: number | undefined;
        let mesAnterior: number | undefined;
        let previsao: number | undefined;
        let serv: number | undefined;
        let tk: number | undefined;
        let totalVendas: number | undefined;
        let storeTotal = 0;

        const lastTokenVal = parsePtBrNumber(tokens[tokens.length - 1]);
        const hasPct = lastTokenVal < 200 && !tokens[tokens.length - 1].includes('.');
        const offset = hasPct ? 1 : 0;

        if (tokens.length >= 8 + offset) {
          if (hasPct) percentualMeta = parsePtBrNumber(tokens[tokens.length - 1]);
          meta = parsePtBrNumber(tokens[tokens.length - 1 - offset]);
          anoAnterior = parsePtBrNumber(tokens[tokens.length - 2 - offset]);
          mesAnterior = parsePtBrNumber(tokens[tokens.length - 3 - offset]);
          previsao = parsePtBrNumber(tokens[tokens.length - 4 - offset]);
          serv = parsePtBrNumber(tokens[tokens.length - 5 - offset]);
          tk = parsePtBrNumber(tokens[tokens.length - 6 - offset]);
          totalVendas = parsePtBrNumber(tokens[tokens.length - 7 - offset]);
          storeTotal = parsePtBrNumber(tokens[tokens.length - 8 - offset]);
        } else {
          // Fallback para tokens menores
          storeTotal = parsePtBrNumber(tokens[tokens.length - 1]);
        }

        stores.push({
          storeCode,
          storeSigla,
          storeName: storeSigla,
          totalFaturamento: storeTotal,
          faturamentoBruto: storeTotal,
          faturamentoLiquido: storeTotal,
          totalVendas,
          ticketMedio: tk,
          percentualServ: serv,
          previsao,
          mesAnterior,
          anoAnterior,
          meta,
          percentualMeta
        });
        continue;
      }
    }

    // 3. Linha de Rodapé / Total Consolidado
    const isSummaryRow = 
      (trimmed.toLowerCase().includes('total') && /[\d\.,]{4,}/.test(trimmed)) ||
      (!trimmed.match(/^\d{2,5}\s+[A-Za-z]/) && trimmed.includes(',') && tokensCount(trimmed) >= 8);

    if (isSummaryRow && summaryTotalFaturamento === 0) {
      const tokens = trimmed.split(/\s+/).filter(t => t.length > 0);
      const lastSumVal = parsePtBrNumber(tokens[tokens.length - 1]);
      const sumHasPct = lastSumVal < 200 && !tokens[tokens.length - 1].includes('.');
      const sumOffset = sumHasPct ? 1 : 0;

      if (tokens.length >= 6 + sumOffset) {
        if (sumHasPct) summaryPercentualMeta = parsePtBrNumber(tokens[tokens.length - 1]);
        summaryTotalMeta = parsePtBrNumber(tokens[tokens.length - 1 - sumOffset]);
        summaryTotalAnoAnterior = parsePtBrNumber(tokens[tokens.length - 2 - sumOffset]);
        summaryTotalMesAnterior = parsePtBrNumber(tokens[tokens.length - 3 - sumOffset]);
        summaryTotalPrevisao = parsePtBrNumber(tokens[tokens.length - 4 - sumOffset]);
        summaryTotalVendas = parsePtBrNumber(tokens[tokens.length - 5 - sumOffset]);
        const possibleTotal = parsePtBrNumber(tokens[tokens.length - 6 - sumOffset]);
        if (possibleTotal > 0) {
          summaryTotalFaturamento = possibleTotal;
        }
      }
    }
  }

  // Se o total do rodapé não foi extraído diretamente, calcular pela soma das lojas
  const sumStoresTotal = stores.reduce((acc, s) => acc + (s.totalFaturamento || 0), 0);
  const finalTotal = summaryTotalFaturamento > 0 ? summaryTotalFaturamento : Number(sumStoresTotal.toFixed(2));

  return {
    success: finalTotal > 0 || stores.length > 0,
    fileName,
    targetDate,
    stores,
    totalFaturamento: finalTotal,
    totalVendas: summaryTotalVendas || stores.reduce((acc, s) => acc + (s.totalVendas || 0), 0),
    totalPrevisao: summaryTotalPrevisao || stores.reduce((acc, s) => acc + (s.previsao || 0), 0),
    totalMesAnterior: summaryTotalMesAnterior || stores.reduce((acc, s) => acc + (s.mesAnterior || 0), 0),
    totalAnoAnterior: summaryTotalAnoAnterior || stores.reduce((acc, s) => acc + (s.anoAnterior || 0), 0),
    totalMeta: summaryTotalMeta || stores.reduce((acc, s) => acc + (s.meta || 0), 0),
    percentualMetaTotal: summaryPercentualMeta
  };
}

function tokensCount(str: string): number {
  return str.split(/\s+/).filter(Boolean).length;
}

export async function parseMapaMetasPDF(file: File): Promise<MapaMetasResult> {
  try {
    if (typeof window === 'undefined') {
      return {
        success: false,
        stores: [],
        totalFaturamento: 0,
        fileName: file.name,
        error: 'PDF parsing only supported in browser environment'
      };
    }

    let pdfjsLib: any = (window as any).pdfjsLib;
    if (!pdfjsLib) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Falha ao carregar motor de PDF'));
        document.head.appendChild(script);
      });
      pdfjsLib = (window as any).pdfjsLib;
      if (pdfjsLib) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      }
    }

    if (!pdfjsLib) {
      throw new Error('Biblioteca PDF.js indisponível');
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    const reconstructedLines: string[] = [];
    let fullRawText = "";

    // Ler todas as páginas agrupando por coordenada Y para preservar alinhamento horizontal
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      const lineMap = new Map<number, { x: number; str: string }[]>();
      for (const item of textContent.items as any[]) {
        if (!item.str || !item.str.trim()) continue;
        const y = Math.round(item.transform[5]);
        let foundKey = Array.from(lineMap.keys()).find(k => Math.abs(k - y) <= 3);
        if (foundKey === undefined) {
          foundKey = y;
          lineMap.set(foundKey, []);
        }
        lineMap.get(foundKey)!.push({ x: item.transform[4], str: item.str });
      }

      // Ordenar linhas do topo para a base (Y decrescente no PDF)
      const sortedYs = Array.from(lineMap.keys()).sort((a, b) => b - a);
      for (const y of sortedYs) {
        const rowItems = lineMap.get(y)!.sort((a, b) => a.x - b.x);
        const lineText = rowItems.map(it => it.str).join(" ").trim();
        if (lineText) reconstructedLines.push(lineText);
      }

      const pageRawText = textContent.items.map((item: any) => item.str).join(" ");
      fullRawText += pageRawText + "\n";
    }

    // 1. Tentar parsear linhas estruturadas reconstruídas por Y
    let result = parseMapaMetasLines(reconstructedLines, file.name);

    // 2. Se não achou faturamento, tentar linhas do rawText
    if (!result.success || result.totalFaturamento === 0) {
      const rawLines = fullRawText.split(/\r?\n/).filter(Boolean);
      const rawResult = parseMapaMetasLines(rawLines, file.name);
      if (rawResult.totalFaturamento > 0 || rawResult.stores.length > 0) {
        result = rawResult;
      }
    }

    return result;
  } catch (error: any) {
    console.error("Erro ao fazer parse do PDF:", error);
    return {
      success: false,
      fileName: file.name,
      stores: [],
      totalFaturamento: 0,
      error: error.message || "Falha na leitura do PDF"
    };
  }
}

