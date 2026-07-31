import * as XLSX from 'xlsx';
import { ParsedExpense, parseContasAPagar } from '../lib/parsers/contasAPagarParser';
import { parseJurosRede } from '../lib/parsers/jurosRedeParser';

export type ExpenseImportResult = {
  fileName: string;
  success: boolean;
  expenses: ParsedExpense[];
  error?: string;
};

export async function processExpenseFiles(files: File[]): Promise<ExpenseImportResult[]> {
  const results: ExpenseImportResult[] = [];

  for (const file of files) {
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      
      let parsed: ParsedExpense[] = [];
      const fileNameLower = file.name.toLowerCase();

      // Heurística de roteamento de parser:
      if (fileNameLower.includes('juros') || fileNameLower.includes('rede')) {
        parsed = parseJurosRede(workbook);
      } else {
        // Fallback pro contas a pagar (que tem a coluna "Emp" etc)
        parsed = parseContasAPagar(workbook);
      }

      results.push({
        fileName: file.name,
        success: true,
        expenses: parsed
      });

    } catch (error: any) {
      results.push({
        fileName: file.name,
        success: false,
        expenses: [],
        error: error.message || 'Erro desconhecido ao ler o arquivo'
      });
    }
  }

  return results;
}
