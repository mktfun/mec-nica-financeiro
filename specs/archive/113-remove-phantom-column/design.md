﻿# Design: Remove Phantom Column (113)

## Arquitetura Técnica
1. Migration 20260807000005_remove_phantom_pix_column.sql.
2. A migration redefine calculate_daily_conciliation.
3. Node.js runner bypassará falhas nas migrations locais antigas, aplicando a RPC diretamente no Banco Remoto.

## Interfaces TypeScript
- Nenhuma alteraçÁo.

## Componentes / Hooks / Funções
- **RPC calculate_daily_conciliation** (Supabase): Atualizada para corrigir falha na busca de propriedades.

## Fluxo de UI
- Ao carregar a página /conciliacao, o React Query fará POST /rest/v1/rpc/calculate_daily_conciliation.
- Resposta será uma lista em JSON com os cálculos sem o erro atual code: '42703'.

## Infra / Deploy
- Será aplicado de forma manual utilizando NodeJS pg Driver, pois as instâncias locais do banco possuem policies defeituosas bloqueando db push.

## Cenários de VerificaçÁo (SCAN → INFER → VERIFY → FIX)
- **Cenário 1:** Acessar a tela de ConciliaçÁo Diária no frontend (Dia 04) → As agregações sÁo retornadas → Tela é renderizada sem erros.
