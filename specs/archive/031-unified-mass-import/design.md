# Design: Central de Fechamento Massivo (031)

## 1. Arquitetura de UI (Frontend / Liquid Glass 2026)

A aba principal de "ConciliaçÁo" deixará de ter seções separadas de importaçÁo. Todo o topo será ocupado por uma "Magic Dropzone".

### 1.1 Magic Dropzone `<UniversalDropzone />`
- **Visual:** Um contêiner pontilhado grande com um efeito de Glow responsivo (Apple Liquid Glass) ao passar um arquivo por cima. Ícones de Banco, Maquininha e Excel girando suavemente em background.
- **Funcionamento:** O input aceita múltiplos arquivos. Ao dar drop, os arquivos entram numa esteira de processamento visual (Cards pequenos com spinners de Loading).
- **Tipografia e Microinterações:** "Arraste tudo que tiver para cá: Extratos, Vendas, Juros" com texto 2xl (Maximalismo Tátil).

### 1.2 File Router & Triage Modal
- Durante a leitura dos XLSX em memória, o sistema define se é maquininha ou juros.
- Uma modal de triagem agrupa arquivos nÁo reconhecidos:
  ```
  [Icone Excel] arquivo-rede-maio.xlsx -> Selecione a Loja [Dropdown]
  [Icone Banco] extrato-bb.ofx         -> Selecione a Loja [Dropdown]
  ```
- O processamento principal só acende (BotÁo "Executar Match Global") quando o mapeamento de todos os arquivos estiver em 100%.

### 1.3 Dashboard de Fechamento Consolidado `<ConsolidatedBankDashboard />`
Substitui o `BankReconciliationDashboard`.
- **VisÁo por Lojas:** Em vez de uma tabela gigante, teremos seções colapsáveis (Accordion) ou Grids por loja. Exemplo:
  - **Loja Piraporinha**
    - `Maquininha (Importado): R$ 10.000`
    - `OFX Match (Sucesso): 95 transações (R$ 9.800)`
    - `Custos de Juros (Importado): R$ 400`
    - `Divergência Banco: - R$ 200` [Alerta Vermelho]
- **BotÁo Hero (Save All):** Um Floating Action Button gigante no final da tela: "Finalizar Fechamento Global".

## 2. Modelagem do Banco (Supabase)

Esta Spec é primariamente de Frontend e OrquestraçÁo (UX refactor). NÁo há necessidade de alterar as tabelas no Supabase (já temos as colunas `machine_total`, `ofx_imported`, `bank_divergence` e `machine_fees` preparadas pela Spec 030 e 029).
As chamadas de rede usarÁo um `Promise.all` em loop sobre as mutações `useSaveBankReconciliation` e `useSaveMachineTotal`.

## 3. Lógica do Smart File Router (TypeScript)

```typescript
type FileCategory = 'OFX' | 'MACHINE' | 'FEES' | 'UNKNOWN';

async function classifyFile(file: File): Promise<FileCategory> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  
  if (ext === 'ofx') return 'OFX';
  
  if (ext === 'xlsx' || ext === 'xls') {
    // Lê apenas os primeiros bytes para pegar o nome da sheet ou cabeçalhos
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'buffer', sheetRows: 10 });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    const textContent = JSON.stringify(json).toLowerCase();
    
    // Heurísticas de identificaçÁo
    if (textContent.includes('taxa juros') || textContent.includes('valor cobrado')) {
      return 'FEES';
    }
    if (textContent.includes('cnpj') && textContent.includes('bruto')) {
      return 'MACHINE';
    }
  }
  
  return 'UNKNOWN';
}
```
