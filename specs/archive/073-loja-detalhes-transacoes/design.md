# Design: Loja Detalhes e Transações (073-loja-detalhes-transacoes)

## Arquitetura Técnica
1. Importador de OFX (Frontend) lê o arquivo `parseOFXFile(file)`.
2. A nova lógica regex encontra `<OVERDRAFTLIMIT>` ou `<CREDITLIMIT>`.
3. Retorna `{ ...OfxParseResult, accountLimit: number }`.
4. `ImportadorOfx.tsx` faz um UPDATE em `stores` salvando o `account_limit` assim que o OFX é validado e processado.
5. Na Rota `/loja/$lojaId.tsx`, o campo `account_limit` vindo do hook `useStores()` será exibido.
6. A página `/loja/$lojaId.tsx` vai renderizar o histórico utilizando `extrato.transactions` já providenciado por `useExtrato`.

## Interfaces TypeScript
```typescript
// Em src/lib/parsers/ofxParser.ts
export interface OfxParseResult {
  alias: string;
  transactions: OfxTransaction[];
  bankBalance?: number;
  previousBalance?: number;
  accountLimit?: number; // NOVO
  fileName?: string;
}

// Em src/lib/supabase.ts
export type StoreRow = {
  // ... (outros campos)
  account_limit: number | null; // NOVO
};
```

## Componentes / Hooks / Funções
- `src/lib/parsers/ofxParser.ts`: FunçÁo `parseOFXFile` modificada para regex das tags de limite.
- `src/components/importacoes/ImportadorOfx.tsx`: Modificado para fazer o supabase `UPDATE` no `store_id` associado, atualizando `account_limit`.
- `src/routes/loja.$lojaId.tsx`: AdiçÁo da seçÁo `Histórico de Transações` logo abaixo dos gráficos. Renderiza uma tabela (usando possivelmente um componente existente como base) que itera `extrato.transactions`. RenderizaçÁo do Limite da Conta no dashboard executivo (topo).

## Fluxo de UI
1. O usuário entra na tela da Loja.
2. Vê no cabeçalho executivo os valores: Saldo da Loja, Faturamento, Valor Disponível, Limite da Conta (novo).
3. Ao descer a página (ou trocar de aba para 'Extrato/Histórico'), visualiza uma tabela clássica de transações com data, tipo (entrada/saída), método de pagamento e valor.
4. Restrições visuais: Zinc-950, sem glassmorphism, flat UI, tabelas compactas e escaneáveis.

## Infra / Deploy
- Nenhuma alteraçÁo estrutural de infraestrutura necessária.
- Apenas uma Migration no Supabase para a tabela `stores`.

## Cenários de VerificaçÁo (SCAN → INFER → VERIFY → FIX)
- **Cenário 1**: [OFX com limite] → Fazer upload de um OFX que contenha `<BALAMT>` e limite → O limite deve ser lido, e o update executado na tabela `stores`. A tela da loja atualizará seu valor.
- **Cenário 2**: [OFX sem limite] → Upload normal → Tabela `stores` deve receber `null` ou nÁo atualizar, UI nÁo quebra e oculta ou exibe "R$ 0,00".
- **Cenário 3**: [VisualizaçÁo Tela de Loja] → Usuário acessa `/loja/id` → Deve aparecer a tabela com os itens do extrato que já estÁo retornando de `useExtrato`.
