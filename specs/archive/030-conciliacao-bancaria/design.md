# Design: ConciliaçÁo Bancária & Juros da Rede (030)

## 1. Arquitetura de UI (Frontend & Stitch MCP)

A ConciliaçÁo Bancária exige uma interface comparativa. Diferente da tela atual que compara "Físico vs Sistema vs Maquininha", a nova tela (ou uma nova tab na mesma tela) terá um painel "Extrato vs Sistema".

### 1.1 Componentes Essenciais
- **`<OfxImportZone />`**: Componente de "Dropzone" (Drag-and-Drop) para arquivos `.ofx`. Ficará no topo ou num modal. Usará `input type="file" accept=".ofx"`. 
- **`<BankReconciliationDashboard />`**: Painel principal pós-importaçÁo.
  - Exibe "Score de ConciliaçÁo": Ex: `95% Matched` (Liquid Glass verde) ou `Incongruência Crítica!` (Vermelho Alerta).
  - Um controle de Filtro por Data (do Extrato).
- **`<TransactionMatchList />`**: Tabela dividida em 2 lados ou em formato de colunas lado a lado:
  - **Lado Esquerdo:** Dados do Banco (`Extrato OFX`): `Data`, `DescriçÁo Original`, `Valor`.
  - **Lado Direito:** Lançamento no Sistema (OS, Pagamento, Venda, Despesa Paga): `Id/Título`, `Valor`.
  - **Meio (Ícone de Status):** Ícone Verde (Match Exato ou < R$ 10) ou Link Quebrado Vermelho (Incongruência).
- **`<UnmatchedOrphansPanel />`**: Lista destacada abaixo para itens que só existem no Extrato (Saída misteriosa, possível fraude) ou itens que só existem no Sistema (dinheiro que nÁo entrou na conta).

### 1.2 UX/UI Estética 2026
- **Maximalismo Tátil**: Os cards de "Match Perfeito" devem ter uma leve sombra neon ao redor (ex: Drop shadow verde neon). Incongruências piscam sutilmente em micro-animaçÁo para atrair o olho do gestor.
- **Micro-interações:** Ao arrastar o OFX para a tela, um efeito "Liquid Glass" deve preencher a dropzone confirmando a leitura.
- **Acessibilidade:** Textos grandes para valores financeiros e ícones descritivos.

## 2. Modelagem do Banco de Dados (Backend & Supabase MCP)

A validaçÁo OFX nÁo necessariamente precisa gerar milhares de linhas novas no banco, mas o *Estado da ConciliaçÁo Bancária* deve ser guardado para relatórios futuros.

### 2.1 Alterações na Tabela `reconciliations`
Se a tabela atual de fechamento (`reconciliations`) serve como "Fechamento do Dia", podemos adicionar:
- `ofx_imported`: booleano (`DEFAULT FALSE`)
- `bank_divergence`: NUMERIC(10,2) (`DEFAULT 0`). (Valor de divergência pós-banco).
- `machine_fees`: NUMERIC(10,2) (`DEFAULT 0`). (Custos/Juros apurados da máquina).

### 2.2 Tabela Temporária / VirtualizaçÁo
Como transações do extrato bancário nÁo criam dados permanentes (se houver furo, a ideia é que o operador corrija o sistema), grande parte do match é calculado *On the Fly* no Frontend através do cruzamento com a tabela `transactions` (extrato interno).

Se decidirmos guardar os Extratos brutos:
- Criar tabela `bank_statements` (OFX dumps processados).
  - `id` UUID
  - `store_id` UUID
  - `date` DATE
  - `raw_data` JSONB (array das transações bancárias)
  - `matched` BOOLEAN

*DecisÁo recomendada:* Começar com o Match *On the Fly* (apenas UI). O OFX lido compara na tela com os dados do `useTransactions()`. Após verificar e "dar o de acordo", o gerente salva o dia como "ConciliaçÁo Bancária Aprovada", atualizando a tabela `reconciliations` e salvando as discrepâncias de taxas.

## 3. Lógica do Algoritmo de Match (Engine Frontend)
```typescript
interface OfxTransaction {
  id: string; // FITID
  date: string;
  amount: number;
  description: string;
  type: 'CREDIT' | 'DEBIT';
}

function matchTransactions(ofxList: OfxTransaction[], systemList: TransactionRow[], tolerance = 10) {
  const matched = [];
  const unmatchedOfx = [];
  const unmatchedSystem = [...systemList];

  for (const ofx of ofxList) {
    // 1. Achar candidatos (mesmo dia e tipo/sinal de valor).
    // 2. Achar o mais próximo onde Math.abs(ofx.amount - sys.amount) <= tolerance
    // Se achar, move pra 'matched', remove de 'unmatchedSystem'
    // Se nÁo achar, adiciona ofx a 'unmatchedOfx'
  }

  return { matched, unmatchedOfx, unmatchedSystem };
}
```
*ObservaçÁo:* Para as taxas da maquininha (Excel Juros), o algoritmo cruza a string do bloco ("PIRAPORINHA") contra as lojas, extrai `valor cobrado` e acumula nas Despesas da Loja ou como coluna `machine_fees` nas reconciliações.
