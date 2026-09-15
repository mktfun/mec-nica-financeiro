import { OfxParseResult, OfxTransaction } from './ofxParser';
import { generateDeterministicHash } from './hashUtils';
import { extractNumber } from './numberUtils';

/**
 * Ensures PDF.js library is loaded in the browser environment.
 */
export async function getPdfJsLib(): Promise<any> {
  if (typeof window === 'undefined') {
    throw new Error('PDF parsing is only supported in browser environment');
  }

  let pdfjsLib: any = (window as any).pdfjsLib;
  if (pdfjsLib) return pdfjsLib;

  // Verify if a script tag is already loading pdf.js
  const existingScript = document.querySelector('script[src*="pdf.min.js"]');
  if (existingScript) {
    await new Promise<void>((resolve, reject) => {
      if ((window as any).pdfjsLib) return resolve();
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', () => reject(new Error('Falha ao carregar motor de PDF')));
      setTimeout(() => resolve(), 3000);
    });
  } else {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Falha ao carregar motor de PDF'));
      document.head.appendChild(script);
    });
  }

  pdfjsLib = (window as any).pdfjsLib;
  if (pdfjsLib && !pdfjsLib.GlobalWorkerOptions?.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }

  return pdfjsLib;
}

/**
 * Checks whether a PDF file is an Itaú bank statement.
 */
export async function isItauBankStatementPDF(file: File): Promise<boolean> {
  try {
    if (typeof window === 'undefined') return false;
    const pdfjsLib = await getPdfJsLib();
    if (!pdfjsLib) return false;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    if (!pdf || pdf.numPages === 0) return false;

    const page1 = await pdf.getPage(1);
    const textContent = await page1.getTextContent();
    const text = textContent.items.map((it: any) => it.str || '').join(' ').toUpperCase();

    const hasBranch = text.includes('AGÊNCIA') || text.includes('AGENCIA');
    const hasAccount = text.includes('CONTA');
    const hasStatementSignature = 
      text.includes('SALDO TOTAL') || 
      text.includes('LANÇAMENTOS DO PERÍODO') || 
      text.includes('LANCAMENTOS DO PERIODO') ||
      text.includes('SALDO ANTERIOR') ||
      text.includes('SALDO EM CONTA CORRENTE') ||
      text.includes('EXTRATO');

    return hasBranch && hasAccount && hasStatementSignature;
  } catch (err) {
    console.warn(`[isItauBankStatementPDF] Erro ao verificar arquivo ${file.name}:`, err);
    return false;
  }
}

function formatDateToIso(dateBr: string): string {
  const parts = dateBr.split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return dateBr;
}

interface PdfItem {
  page: number;
  str: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Parses an Itaú Bank Statement PDF into a normalized OfxParseResult.
 */
export async function parseItauBankStatementPDF(
  file: File,
  _options?: { sessionId?: string }
): Promise<OfxParseResult> {
  const pdfjsLib = await getPdfJsLib();
  if (!pdfjsLib) {
    throw new Error('Biblioteca PDF.js não disponível');
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const allItems: PdfItem[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const pageObj = await pdf.getPage(p);
    const textContent = await pageObj.getTextContent();
    const pageItems: PdfItem[] = textContent.items
      .filter((it: any) => it.str && it.str.trim())
      .map((it: any) => ({
        page: p,
        str: String(it.str).trim(),
        x: Math.round(it.transform[4]),
        y: Math.round(it.transform[5]),
        w: Math.round(it.width || 0),
        h: Math.round(it.height || 0),
      }));
    allItems.push(...pageItems);
  }

  // 1. Extração do Cabeçalho (Razão Social, CNPJ, Agência, Conta)
  const headerLineItems = allItems
    .filter(it => it.y >= 730 && it.y <= 770 && it.page === 1)
    .sort((a, b) => a.x - b.x);
  let headerText = headerLineItems.map(it => it.str).join(' ');

  if (!headerText.includes('Agência') && !headerText.includes('Agencia')) {
    const p1Items = allItems.filter(it => it.page === 1).sort((a, b) => b.y - a.y || a.x - b.x);
    headerText = p1Items.slice(0, 20).map(it => it.str).join(' ');
  }

  const cnpjMatch = headerText.match(/CNPJ\s+([0-9.\/-]+)/i);
  const agenciaMatch = headerText.match(/Ag[eê]ncia\s+(\d+)/i);
  const contaMatch = headerText.match(/Conta\s+([0-9-]+)/i);
  const razaoSocial = headerText.replace(/CNPJ[\s\S]*/i, '').trim();

  const agencia = agenciaMatch ? agenciaMatch[1].trim() : '';
  const conta = contaMatch ? contaMatch[1].trim() : '';
  const cleanAgencia = agencia.replace(/\D/g, '').padStart(4, '0');
  const cleanConta = conta.replace(/\D/g, '');
  const combinedAccountKey = `${cleanAgencia}_${cleanConta}`;
  const alias = cleanAgencia && cleanConta 
    ? `ITAU - ${cleanAgencia}_${cleanConta}` 
    : `ITAU - ${file.name.replace(/\.[^.]+$/, '')}`;

  // 2. Extração de Saldos e Limite do cabeçalho
  let bankBalance: number | undefined;
  let accountLimit: number | undefined;
  const balanceItems = allItems
    .filter(it => it.y >= 680 && it.y <= 705 && it.page === 1)
    .sort((a, b) => a.x - b.x);
  const balanceText = balanceItems.map(it => it.str).join(' ');
  const amountsMatch = balanceText.match(/R\$\s*([0-9.,-]+)/g);
  if (amountsMatch && amountsMatch.length >= 1) {
    bankBalance = extractNumber(amountsMatch[0]);
    if (amountsMatch.length >= 2) {
      accountLimit = extractNumber(amountsMatch[1]);
    }
  }

  // 3. Processamento dos Lançamentos da Tabela
  const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
  let previousBalance: number | undefined;
  const transactions: OfxTransaction[] = [];
  const hashOccurrences = new Map<string, number>();

  const maxPage = Math.max(...allItems.map(it => it.page));
  for (let p = 1; p <= maxPage; p++) {
    const pageItems = allItems.filter(it => it.page === p);

    const headerItem = pageItems.find(it => 
      it.x >= 20 && it.x <= 55 && it.str.toUpperCase() === 'DATA'
    );
    const tableHeaderY = headerItem ? headerItem.y : 635;

    const dateAnchors = pageItems
      .filter(it => it.x >= 25 && it.x <= 75 && dateRegex.test(it.str))
      .sort((a, b) => b.y - a.y);

    for (let i = 0; i < dateAnchors.length; i++) {
      const anchor = dateAnchors[i];
      const prevAnchor = i > 0 ? dateAnchors[i - 1] : null;
      const nextAnchor = i < dateAnchors.length - 1 ? dateAnchors[i + 1] : null;

      const upperY = prevAnchor 
        ? (prevAnchor.y + anchor.y) / 2 
        : Math.min(anchor.y + 12, tableHeaderY - 1);
      const lowerY = nextAnchor 
        ? (anchor.y + nextAnchor.y) / 2 
        : anchor.y - 20;

      const rowItems = pageItems.filter(it => 
        it.y < upperY && 
        it.y >= lowerY
      ).sort((a, b) => {
        if (Math.abs(a.y - b.y) > 2) return b.y - a.y;
        return a.x - b.x;
      });

      // Distribuição pelas colunas baseada nas coordenadas X do layout Itaú
      const lancamentoItems = rowItems.filter(it => it.x >= 75 && it.x < 220);
      const razaoItems = rowItems.filter(it => it.x >= 220 && it.x < 360);
      const docItems = rowItems.filter(it => it.x >= 360 && it.x < 460);
      const valorItems = rowItems.filter(it => it.x >= 460 && it.x < 515);
      const saldoItems = rowItems.filter(it => it.x >= 515);

      const title = lancamentoItems.map(it => it.str).join(' ').trim();
      const counterpart = razaoItems.map(it => it.str).join(' ').trim();
      const doc = docItems.map(it => it.str).join(' ').trim();
      const valorStr = valorItems.map(it => it.str).join(' ').trim();
      const saldoStr = saldoItems.map(it => it.str).join(' ').trim();

      // SALDO ANTERIOR
      if (title.toUpperCase().includes('SALDO ANTERIOR')) {
        previousBalance = extractNumber(saldoStr || valorStr);
        continue;
      }

      // Linhas de saldo acumulado / fechamento do dia (ignorar como transação)
      if (
        title.toUpperCase().includes('SALDO TOTAL DISPON') ||
        title.toUpperCase().includes('SALDO EM CONTA CORRENTE')
      ) {
        const lastSaldo = extractNumber(saldoStr || valorStr);
        if (bankBalance === undefined && lastSaldo !== 0) {
          bankBalance = lastSaldo;
        }
        continue;
      }

      if (!valorStr) continue;

      const amountNum = extractNumber(valorStr);
      if (amountNum === 0) continue;

      const type: 'in' | 'out' = amountNum >= 0 ? 'in' : 'out';
      const absAmount = Math.abs(amountNum);
      const dateIso = formatDateToIso(anchor.str);

      let cleanDoc: string | undefined = undefined;
      if (doc) {
        const docMatch = doc.match(/(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}|\d{3}\.\d{3}\.\d{3}-\d{2})/);
        if (docMatch) cleanDoc = docMatch[1];
      }

      let fitid = generateDeterministicHash(dateIso, absAmount, title, 'itau_pdf');
      const count = (hashOccurrences.get(fitid) || 0) + 1;
      hashOccurrences.set(fitid, count);
      if (count > 1) {
        fitid = `${fitid}_${count}`;
      }

      transactions.push({
        storeName: alias,
        amount: absAmount,
        type,
        date: dateIso,
        title: title || 'Transação Bancária Itaú',
        fitid,
        cnpj_cpf: cleanDoc,
        counterpart_name: counterpart || undefined,
      });
    }
  }

  return {
    alias,
    transactions,
    bankBalance,
    previousBalance,
    accountLimit,
    fileName: file.name,
  };
}
