# Proposal: Corrigir Violação de FK na Reimportação de OFX (bugfix-ofx-import-fk)

## Problema
Ao tentar reimportar um lote de conciliação que inclui Extratos Bancários (OFX) que já foram importados anteriormente, o sistema falha na etapa 4 (Gravando batch de transações) com o erro:
`update or delete on table "transactions" violates foreign key constraint "conciliation_matches_ofx_transaction_id_fkey" on table "conciliation_matches"`

Isso acontece porque o hook `useBulkInsertTransactions` realiza um UPSERT (Update/Insert) das transações de OFX baseando-se na chave composta `store_id, fitid`. No entanto, o `CentralImportWizard` injeta um UUID sintético recém-gerado (`crypto.randomUUID()`) na chave `id` da transação antes de enviá-la ao hook. O PostgreSQL tenta então atualizar a coluna `id` do registro existente, mas como esse `id` já está vinculado na tabela `conciliation_matches`, a violação de chave estrangeira é disparada.

## Solução Proposta
Omitir a coluna `id` do payload enviado ao Supabase para transações OFX (aquelas que possuem `fitid`) no momento do UPSERT.
Dessa forma:
1. Para registros novos: O PostgreSQL gerará automaticamente um novo UUID através da função `gen_random_uuid()`.
2. Para registros existentes (reimportação): O PostgreSQL atualizará os valores monetários, textos e outras colunas, mas **manterá o `id` original intacto**, evitando a violação da Foreign Key.

O mapeamento reverso no `CentralImportWizard.tsx` (que já consulta a tabela `transactions` pelo `fitid` logo após a gravação para recuperar o `id` real do banco e vincular os pares de conciliação) continuará funcionando perfeitamente, garantindo que o `conciliation_matches` use o `id` verdadeiro.

## Contratos de Dados
- **Tabela `transactions`**: Nenhuma alteração estrutural no banco. Apenas deixaremos de forçar a coluna `id` durante as requisições de UPSERT de OFX.
- **Tabela `conciliation_matches`**: Nenhuma alteração estrutural, continuará usando a FK `ofx_transaction_id` conectada ao `transactions.id`.

## API / Interface
- **Modificado**: `useBulkInsertTransactions` (em `src/hooks/useTransactions.ts`). A função de mapeamento antes do `upsert` será ajustada para extrair e remover explicitamente a chave `id` usando rest params: `const { id, ...rest } = t;`.

## Features Existentes Impactadas
- **Extrato Bancário e Conciliação**: Esta correção afeta diretamente o motor central da importação unificada. O comportamento para "Outras Transações" (OS e Maquininha), que utilizam INSERT puro e não UPSERT, não será modificado.

## Risco Principal
Garantir que a remoção do `id` no payload não quebre a lógica subsequente do `CentralImportWizard.tsx`. Como o Wizard já realiza uma query pós-gravação buscando por `fitid` para substituir o `id` sintético pelo `id` do banco antes de salvar `conciliation_matches`, o risco de desvincular a chave é nulo. A principal preocupação é evitar mexer nos fluxos de Rede e OS, aplicando o filtro de omissão de ID estritamente para registros OFX (aqueles com `fitid`).
