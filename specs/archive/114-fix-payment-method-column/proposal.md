# Proposal: Fix Payment Method Column (114)

## Problema
A RPC calculate_daily_conciliation falha novamente ao ser executada no backend com o erro column "payment_methods" does not exist. Assim como o problema do parsed_pix_transfer, a consulta SQL de extração do PIX referenciou a coluna no plural (payment_methods), enquanto a tabela patio_os utiliza o singular (payment_method). Isso continua impedindo o Dashboard de carregar.

## Solução Proposta
Corrigir a string SQL substituindo a ocorrência de payment_methods por payment_method na query do PIX dentro de calculate_daily_conciliation.

## Contratos de Dados
- Nenhuma nova tabela será criada.
- A função existente calculate_daily_conciliation sofrerá correção da tipografia da coluna referenciada.

## API / Interface
- O Frontend passará a receber os cálculos do backend em vez do erro 400.

## Features Existentes Impactadas
- RPC calculate_daily_conciliation e consequentemente a exibição de dados do PIX no Dashboard.
- O fluxo de importação OFX/Excel não foi tocado por essas otimizações de cálculo, portanto ele continua funcionando e gravando no Supabase perfeitamente.

## Risco Principal
- Nenhum. Tratativa direta de erro de digitação de schema (Typo).
