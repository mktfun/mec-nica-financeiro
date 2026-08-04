# Proposal: Correção de Salvar Bootstrap (074-fix-bootstrap)

## Problema
O usuário relata o erro `POST https://cnwzsvowkfymtdiryhqc.supabase.co/rest/v1/daily_snapshots?on_conflict=store_id%2Cdate 400 (Bad Request)` ao tentar salvar a Carga Inicial (Dia Zero) na tela de Bootstrap.
Esse erro ocorre porque o componente frontend `BootstrapPage` tenta iterar por cada loja e realizar um UPSERT na tabela `daily_snapshots` utilizando a chave de conflito `store_id,date` e enviando campos incorretos como `store_id` e `saldo_final`.
A tabela `daily_snapshots` foi desenhada desde o início como uma tabela **global** da rede (não possui a coluna `store_id` e a unique key é apenas a `date`). Isso causa a rejeição imediata da requisição pela API do Supabase.

## Solução Proposta
Modificar a lógica de persistência do `bootstrap.tsx`:
1. Manter o loop de lojas APENAS para popular a tabela `reconciliations` (que é de fato por loja e aceita `store_id`).
2. Acumular os totais globais de `faturamento` e `contas` (e `saldo`) informados no formulário.
3. Realizar um **único** UPSERT global na tabela `daily_snapshots` utilizando apenas `date` como a chave de onConflict, sem incluir o campo inexistente `store_id`. O campo incorreto `saldo_final` será alterado para `saldo_bancario`.

## Contratos de Dados
- Tabela `daily_snapshots` (existente)
- Não haverá alteração no banco de dados. A mutação no frontend na tabela `daily_snapshots` será corrigida para o formato correto esperado pelo Supabase.

## API / Interface
- Nenhuma alteração visual. Apenas correção da lógica no `handleSave` em `src/routes/bootstrap.tsx`.

## Features Existentes Impactadas
- N/A. Refatoração restrita à tela de inicialização.

## Risco Principal
Pequeno. O único risco é esquecer de somar todas as lojas antes de enviar o payload único para `daily_snapshots`.
