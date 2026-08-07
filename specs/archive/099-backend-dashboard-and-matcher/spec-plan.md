# Spec Plan: Backend Dashboard & Matcher (Spec 099)

## Objective
Finalizar a migração pesada de conciliação transferindo a responsabilidade de "matching" (pareamento de transações OFX vs Rede vs PIX) e a macro-matemática exata do painel para o PostgreSQL.

## Tasks

### Fase 1: Matemática Inviolável
- [x] [BACKEND] Modificar `get_dashboard_metrics` para utilizar exatamente a matriz de cálculo de 10 passos definida na Spec.
- [ ] [FRONTEND] Simplificar `useDashboardV2.ts` para apenas mapear o retorno da nova RPC, deletando lógicas de agrupamento e recálculos locais.

### Fase 2: RPC de Pareamento (auto_match_transactions)
- [x] [BACKEND] Criar RPC `auto_match_transactions(p_date)` com PL/pgSQL que realize o pareamento OFX -> Rede.
- [x] [BACKEND] Adicionar cursor na RPC para agrupar múltiplas transações menores da máquina para igualar ao OFX total.
- [x] [BACKEND] Atualizar `transactions` e `patio_os` com `matched_ofx_id`.

### Fase 3: Telas de Conciliação Clientes
- [ ] [FRONTEND] Refatorar `RedeVsOfxTable.tsx` para listar pares baseando-se no `matched_ofx_id` ao invés de calcular tolerâncias.
- [ ] [FRONTEND] Refatorar `PixVsOfxTable.tsx` com o mesmo comportamento.

## Save-State
- Status Atual: Backend SQL Finalizado. Aguardando Frontend.
- Fase: 2
- Impedimentos: Aguardando usuário rodar no Supabase
