# Checklist de ImplementaçÁo: Spec 072

## Tasks

- [x] [BACKEND] Refatorar `useDashboardV2.ts`
  - [x] Ler o `faturamento_outros_valor` histórico da data anterior (`dateAnterior`).
  - [x] Somar esse valor em `faturamentoAnterior` para garantir que o `% vs ANTERIOR` reflita o Bootstrap.

- [x] [FRONTEND] Criar a Tela de Bootstrap
  - [x] Criar `src/routes/bootstrap.tsx`.
  - [x] Configurar a rota `/bootstrap` no roteador do App (via file-based routing do Tanstack).
  - [x] Montar o form com 1 input de Data e um Grid mapeando as lojas ativas.
  - [x] Lógica de Upsert iterando sobre as lojas preenchidas.

- [x] [FRONTEND] ValidaçÁo Final
  - [x] Acessar `/bootstrap` e preencher dados falsos para dia `2026-07-30`.
  - [x] Conferir se o Dashboard processou a métrica de `% vs ANTERIOR` usando esses dados.
