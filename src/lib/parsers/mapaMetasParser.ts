import * as pdfjsLib from 'pdfjs-dist';

// Configurar o worker do PDF.js (necessário no client-side / Vite)
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface MapaMetasStore {
  storeName: string;
  faturamentoBruto: number;
  faturamentoLiquido: number;
}

export interface MapaMetasResult {
  success: boolean;
  stores: MapaMetasStore[];
  totalFaturamento: number;
  fileName: string;
  error?: string;
}

export async function parseMapaMetasPDF(file: File): Promise<MapaMetasResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = "";
    
    // Ler todas as páginas para extrair texto
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(" ");
      fullText += pageText + "\n";
    }

    // Como o PDF do Oficina Inteligente ("Mapa de Metas") pode variar muito,
    // e nós nÁo temos o layout exato, a extraçÁo aqui é baseada em heurísticas simples.
    // O ideal seria procurar pelo nome da loja seguido de "R$ XXX.XXX,XX" no total de faturamento.
    // Por enquanto, apenas tentaremos achar totais gerais se houver padrÁo, ou retornar tudo zero.
    
    // ATENÇÁO: Esta é uma implementaçÁo stub robusta. Para 100% de precisÁo, seria necessário
    // saber as posições ou regex exato gerado pelo relatório da Oficina Inteligente.
    // De acordo com o manual, bateremos o Faturamento Atual (Mapa de metas de hoje).
    
    const stores: MapaMetasStore[] = [];
    let totalFaturamento = 0;

    // Buscar padrões como "Faturamento Total R$ 1.500,00" ou similar
    // Como fallback, retornaremos vazio e permitiremos inserçÁo manual no UI se nÁo achar
    const matches = fullText.match(/Faturamento\s*.*?R\$?\s*([\d\.,]+)/gi);
    if (matches) {
       for (const match of matches) {
          const valStr = match.replace(/[^\d,]/g, '').replace(',', '.');
          const val = parseFloat(valStr);
          if (!isNaN(val)) totalFaturamento += val;
       }
    }

    return {
      success: true,
      fileName: file.name,
      stores, // Array vazio = agregaremos o total global por enquanto
      totalFaturamento
    };
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
