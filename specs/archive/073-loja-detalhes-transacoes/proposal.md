# Proposal: Loja Detalhes e Transações (073-loja-detalhes-transacoes)

## Problema
A tela de detalhes da loja (`/loja/$lojaId`) atualmente mostra apenas totais consolidados (Faturado, Pago, Saldo) e gráficos de pizza das categorias. O usuário precisa visualizar o **histórico detalhado de transações** linha a linha (entradas e saídas) para entender a origem dos números. Além disso, a tela precisa exibir o **limite da conta**, informação que vem contida no extrato bancário (OFX), mas que atualmente não é extraída ou exibida.

## Solução Proposta
1. Atualizar a página `loja.$lojaId.tsx` para incluir uma nova seção com uma Tabela/Lista do histórico de transações filtradas pelo período. 
2. Atualizar o `ofxParser.ts` para detectar e extrair a tag referente ao limite de crédito/conta (ex: `<CREDITLIMIT>`, `<OVERDRAFTLIMIT>` ou tag correspondente do banco).
3. Salvar esse limite extraído. Atualizaremos a tabela `stores` para persistir o `account_limit`, atualizando-o toda vez que um OFX for importado.
4. Exibir o limite da conta nos painéis superiores da tela da loja, logo abaixo do "Saldo da Loja" ou "Valor Disponível".

## Contratos de Dados
- **Tabela `stores`**: Adicionar a coluna `account_limit` (numeric, default 0 ou nulo).
- **Types**: Atualizar `StoreRow` em `src/lib/supabase.ts` para incluir `account_limit: number | null`.
- **Mutações**: A importação de OFX (`ImportadorOfx.tsx`) precisará fazer um UPDATE na tabela `stores` caso o OFX contenha um limite válido.

## API / Interface
- **Componentes**: 
  - Adição de uma tabela baseada nas transações já carregadas pelo hook `useExtrato(lojaId, startDate, endDate)`.
  - Atualização do parser `parseOFXFile` para retornar o limit na interface `OfxParseResult`.

## Features Existentes Impactadas
- Importador de OFX (`src/lib/parsers/ofxParser.ts` e `ImportadorOfx.tsx`)
- Tela da Loja (`src/routes/loja.$lojaId.tsx`)

## Risco Principal
Bancos diferentes usam tags diferentes para limite no padrão OFX (alguns usam `<CREDITLIMIT>`, outros `<OVERDRAFTLIMIT>`, e outros simplesmente não informam). O parser precisará ser flexível com Regex para extrair a tag, e a UI não deve quebrar caso o limite venha nulo.
