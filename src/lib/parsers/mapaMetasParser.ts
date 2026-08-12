// Import removido do topo para evitar SSR crash (DOMMatrix is not defined)
// O import dinâmico foi movido para dentro da função parseMapaMetasPDF
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
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

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
    // e nós não temos o layout exato, a extração aqui é baseada em heurísticas simples.
    // O ideal seria procurar pelo nome da loja seguido de "R$ XXX.XXX,XX" no total de faturamento.
    // Por enquanto, apenas tentaremos achar totais gerais se houver padrão, ou retornar tudo zero.
    
    // ATENÇÃO: Esta é uma implementação stub robusta. Para 100% de precisão, seria necessário
    // saber as posições ou regex exato gerado pelo relatório da Oficina Inteligente.
    // De acordo com o manual, bateremos o Faturamento Atual (Mapa de metas de hoje).
    
    const stores: MapaMetasStore[] = [];
    let totalFaturamento = 0;

    // Buscar padrões como "Faturamento Total R$ 1.500,00" ou similar
    // Como fallback, retornaremos vazio e permitiremos inserção manual no UI se não achar
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
