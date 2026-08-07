﻿# Proposal: Fix Payment Method Column (114)

## Problema
A RPC calculate_daily_conciliation falha novamente ao ser executada no backend com o erro column "payment_methods" does not exist. Assim como o problema do parsed_pix_transfer, a consulta SQL de extraçÁo do PIX referenciou a coluna no plural (payment_methods), enquanto a tabela patio_os utiliza o singular (payment_method). Isso continua impedindo o Dashboard de carregar.

## SoluçÁo Proposta
Corrigir a string SQL substituindo a ocorrência de payment_methods por payment_method na query do PIX dentro de calculate_daily_conciliation.

## Contratos de Dados
- Nenhuma nova tabela será criada.
- A funçÁo existente calculate_daily_conciliation sofrerá correçÁo da tipografia da coluna referenciada.

## API / Interface
- O Frontend passará a receber os cálculos do backend em vez do erro 400.

## Features Existentes Impactadas
- RPC calculate_daily_conciliation e consequentemente a exibiçÁo de dados do PIX no Dashboard.
- O fluxo de importaçÁo OFX/Excel nÁo foi tocado por essas otimizações de cálculo, portanto ele continua funcionando e gravando no Supabase perfeitamente.

## Risco Principal
- Nenhum. Tratativa direta de erro de digitaçÁo de schema (Typo).
