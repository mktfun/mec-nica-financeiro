﻿# Proposal: Remove Phantom Column (113)

## Problema
A RPC calculate_daily_conciliation falha com o erro column "parsed_pix_transfer" does not exist quando chamada pelo frontend (PostgREST). Isso ocorre porque a consulta SQL agregada de PIX faz referência a essa coluna que, na verdade, não existe no schema da tabela patio_os. Isso quebra o cálculo do Dashboard de Conciliação Diária, resultando em retornos 400 (Bad Request).

## Solução Proposta
Criar uma migration que utilize um simples CREATE OR REPLACE FUNCTION para atualizar a RPC calculate_daily_conciliation, removendo permanentemente a referência ao parsed_pix_transfer do código. Focaremos apenas na coluna pix_transfer_value que de fato existe na base de dados.

## Contratos de Dados
- Nenhuma nova tabela será criada.
- A função existente calculate_daily_conciliation sofrerá modificação de lógica (remoção de parsed_pix_transfer).

## API / Interface
- O Frontend não sofrerá nenhuma alteração, mas passará a receber o cálculo de volta sem erros (Status 200).

## Features Existentes Impactadas
- RPC calculate_daily_conciliation no Supabase (Feature Central do Dashboard).
- Fluxo de caixa de PIX, que agora lerá estritamente da coluna verdadeira.

## Risco Principal
- Nenhum, apenas a correção do erro 42703 para reestabelecer o dashboard.
