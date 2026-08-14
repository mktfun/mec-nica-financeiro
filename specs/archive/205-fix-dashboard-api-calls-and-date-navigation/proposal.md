# Proposta de Especificação Técnica: Correção das Chamadas de API do Dashboard e Navegação Inteligente por Datas (Spec 205)

## Diagnóstico e Causa Raiz

1. **Erro HTTP 406 ao buscar última data (`import_logs`):**
   - O hook `useBackendDashboard.ts` e `useAvailableConciliacaoDates` realizam queries na tabela `import_logs`. Como a arquitetura foi modularizada para `daily_snapshots`, `import_batches` e `reconciliations`, o PostgREST retorna `406 Not Acceptable`.
2. **Erro HTTP 400 na RPC `calculate_daily_conciliation`:**
   - A função PostgreSQL `calculate_daily_conciliation` tentava acessar a coluna `description` em `ofx_transactions`, que foi renomeada para `title`.
3. **Navegação Cega por Setas no Frontend:**
   - O seletor de data e as setas incrementavam dias de forma linear/cega sem validar se existiam registros de fechamento nessas datas, gerando telas vazias e carregamentos travados.

---

## Objetivos da Especificação

1. **Substituir Consultas à Tabela Obsoleta `import_logs`:**
   - Atualizar `useAvailableConciliacaoDates` e `useBackendDashboard` para buscar datas reais consolidadas a partir de `daily_snapshots`, `import_batches` e `reconciliations`.
2. **Corrigir a RPC `calculate_daily_conciliation` no PostgreSQL:**
   - Atualizar a função SQL para usar a coluna correta `title` (em vez de `description`) e tratar identificadores de filial com segurança.
3. **Implementar Navegação Inteligente por Setas no Dashboard (`src/routes/index.tsx`):**
   - Integrar `useAvailableConciliacaoDates()` no Dashboard principal.
   - Navegar estritamente pelas datas com fechamento real existente.
   - Desabilitar as setas anterior/próxima nos limites (início e fim da lista de datas).
4. **Migration SQL:**
   - Criar e aplicar `supabase/migrations/20260814150000_fix_calculate_daily_conciliation.sql`.

---

## Critérios de Aceite
- [x] Zero erros HTTP 406 no console de rede ao carregar Dashboard ou Conciliação.
- [x] Zero erros HTTP 400 ao invocar RPCs de cálculo diário.
- [x] Navegação por setas (esquerda/direita) no Dashboard transitando exclusivamente entre datas com dados gravados.
- [x] `npm run build` aprovado 100% verde.
