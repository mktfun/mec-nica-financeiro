export interface CentralImportResults {
  validData: any[];
  errors: string[];
}

export async function parseCentralImports(file: File): Promise<CentralImportResults> {
  return {
    validData: [],
    errors: []
  };
}
