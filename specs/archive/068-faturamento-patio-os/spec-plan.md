# Checklist de ImplementaçÁo: Spec 068

## Tasks

- [x] [FRONTEND] Ajustar Fetching Inicial em `src/hooks/useDashboardV2.ts`
  - [x] Adicionar o campo `closed_at` na query de `patio_os`.

- [x] [FRONTEND] Substituir Fonte do Faturamento Diário (Cards e Tabela)
  - [x] Em vez de ler de `logsCurr.data`, iterar sobre `patioOs.data`.
  - [x] Se `closed_at.startsWith(dateAtual)`, somar `total_value` em `faturamentoAtualLog`.
  - [x] Distribuir o valor por loja no `fatByStore`.

- [x] [FRONTEND] Substituir Fonte do Histórico do Macro Chart
  - [x] Alterar o loop de preenchimento do `historicoMacro`.
  - [x] Extrair o Faturamento diário do cache local de `patioOs.data` usando filtro `closed_at.startsWith(data)`.
  - [x] Somar com os valores manuais diários de `snapshotsMacro.data`.

- [x] [FRONTEND] RemoçÁo Segura de Lixo Antigo (Opcional/Limpeza)
  - [x] Remover a query isolada de `import_logs` para Faturamento e Histórico, já que nÁo precisamos mais desse campo instável (Apenas no contexto de Faturamento). Deixar a tabela/query apenas se for usada em outra funcionalidade essencial (como quantidade de imports).

- [ ] [VERIFICAÇÁO] Validar com VLM se a Tabela Resultado por Loja agora exibe o Faturamento e se o Gráfico Macro possui Faturamentos retroativos preenchidos de acordo com o `closed_at`.
