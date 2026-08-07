﻿# Design: Fix Payment Method Column (114)

## Arquitetura Técnica
1. Nova Migration 20260807000006_fix_payment_method_typo.sql.
2. A migration redefine calculate_daily_conciliation alterando payment_methods para payment_method.
3. AplicaçÁo imediata ao banco de dados via script Node JS (bypass), garantindo que o PostgreSQL aceite a funçÁo com o schema correto de patio_os.

## Interfaces TypeScript
- Nenhuma alteraçÁo.

## Componentes / Hooks / Funções
- **RPC calculate_daily_conciliation** (Supabase).

## Fluxo de UI
- Ao acessar a página, o React Query completará com status 200, exibindo finalmente o resumo sem erros.

## Cenários de VerificaçÁo (SCAN → INFER → VERIFY → FIX)
- **Cenário 1:** Acessar a tela de ConciliaçÁo Diária no frontend → Sem erros 42703 → Dashboard renderiza.
