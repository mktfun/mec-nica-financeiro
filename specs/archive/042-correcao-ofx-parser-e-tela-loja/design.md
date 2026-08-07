# Design — Spec 042

## Backend / Parser

### `src/lib/parsers/ofxParser.ts`
Adicionar filtro de linhas de saldo antes de fazer push:
```
const JUNK_KEYWORDS = ['SALDO ANTERIOR', 'SALDO TOTAL', 'SALDO DISPONIVEL', 'SALDO INICIAL'];
const isJunk = JUNK_KEYWORDS.some(k => title.toUpperCase().includes(k));
if (isJunk) continue;
```
Além disso, extrair `acctId` e retornar junto com as transações para uso no mapeamento do Wizard.

### `src/lib/parsers/ofxParser.ts` — Retorno
Mudar interface para incluir metadado:
```ts
export interface OfxParseResult {
  alias: string;       // "BANCO - CONTA"
  transactions: OfxTransaction[];
}
```

## Frontend / Wizard OFX (`WizardImportacao.tsx`)

### Passo 2 do Wizard de OFX
Quando `category === 'OFX'`, após processar os arquivos, extrair os aliases únicos dos OFX e exibir a mesma tela de mapeamento que Despesas já usa (alias → loja). Salvar no localStorage com chave `@mecanica/ofx-store-mappings`.

Ao confirmar, inserir as transações com o `store_id` resolvido a partir do mapeamento.

## Frontend / Tela da Loja (`loja.$lojaId.tsx`)

### Seção "Divergências" — Redesign
Remover completamente a lógica de "Entradas sem OS Vinculada".
Substituir por:
- **Card Extrato Banco:** Soma das transações OFX (`source = 'ofx'`) da loja no período
- **Card Apurado Sistema:** Soma das transações do sistema (`source IN ('patio', 'maquininha', 'despesa')`) da loja no período
- **Card Diferença:** Banco - Sistema
- Se diferença > 0: "Banco maior que sistema — possível receita não lançada"
- Se diferença < 0: "Sistema maior que banco — possível lançamento não recebido"

### Gráfico de Distribuição de Despesas
Filtrar para mostrar apenas transações `source = 'despesa'` agrupadas por `subtitle` (categoria da despesa), não por `store_id`.
