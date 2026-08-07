# Spec Plan: Loja Detalhes e Transações (073-loja-detalhes-transacoes)

## Tasks

- [x] [BACKEND] Criar nova migration Supabase (`20260804000000_add_account_limit_to_stores.sql`) para adicionar a coluna `account_limit` (numeric, default null) na tabela `stores`.
- [/] [BACKEND] Rodar a migration no banco local via `supabase migration up`.
- [x] [TYPES] Atualizar `StoreRow` em `src/lib/supabase.ts` adicionando `account_limit: number | null`.
- [x] [FRONTEND/PARSER] Atualizar a funçÁo `parseOFXFile` em `src/lib/parsers/ofxParser.ts` para capturar `accountLimit` via regex (`<OVERDRAFTLIMIT>`, `<CREDITLIMIT>`, `<BALAMT>` - com prioridade adequada).
- [x] [FRONTEND] Atualizar `ImportadorOfx.tsx` para fazer um UPDATE na tabela `stores` (`account_limit`) após parse bem sucedido.
- [x] [FRONTEND/UI] Em `src/routes/loja.$lojaId.tsx`: Adicionar um campo exibindo o "Limite da Conta" perto do Saldo e Faturamento.
- [x] [FRONTEND/UI] Em `src/routes/loja.$lojaId.tsx`: Adicionar a Tabela de Histórico de Transações listando detalhadamente as propriedades do array `extrato.transactions` (data, tipo, método, quantia, memo).
- [x] [TEST] Verificar cenário 1: Upload de OFX e validaçÁo de gravaçÁo do limite na tabela `stores`.
- [x] [TEST] Verificar cenário 2: Acessar `/loja/id` e validar se a tabela de histórico carrega e renderiza sem erros.
