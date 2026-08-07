# Proposal: Automação Cron e Interface de Telemetria Híbrida (060-oficina-sync-ui-cron)

## Problema
1. O motor de sincronização recém-criado (`sync-oficina`) não está sendo engatilhado periodicamente, o que significa que o banco só atualiza se for acionado manualmente via UI (o que quebra a promessa de "sincronização automática via bot").
2. O usuário não consegue ver os logs da IA ou as entradas em cache, pois a tela `LogsAgentePanel` está buscando em `bot_logs` com filtros errados ou não está exibindo os logs da tabela `mcp_logs`, onde a Edge Function efetivamente registra a ação das ferramentas (tools). O Cache das OSs também é uma caixa preta invisível para o usuário.

## Solução Proposta
- **[Infra]** Implementar o Cron Job oficial usando a extensão `pg_cron` nativa do Supabase (com `pg_net`) para fazer requisições HTTP `POST` para a nossa Edge Function `sync-oficina` de tempos em tempos (ex: a cada hora).
- **[UI]** Atualizar a telemetria do Agente (aba Logs) para consumir não só `bot_logs`, mas de forma unificada ou corrigida os `mcp_logs` gerados pela LLM e ferramentas, com visibilidade clara de falhas e execuções de fallback.
- **[UI]** Criar um novo painel (aba "Cache & Sincronização") na tela do Agente para mostrar as OSs que estão cacheadas e o status de sincronização (Última Sincronização de Contas).

## Contratos de Dados
- **Tabelas Existentes**:
  - `mcp_logs` (onde a ferramenta da IA loga as ações - ajustar leitura na UI)
  - `oficina_os_cache` (exibir na nova aba)
  - `oficina_contas` (verificar ultima att)
- **Supabase Extensions**: Ativação do `pg_net` e `pg_cron`. Criação da função de trigger na migration.

## API / Interface
- `LogsAgentePanel.tsx`: Modificar consulta para ler de `mcp_logs` e formatar as chamadas das ferramentas `consulta_os_detalhe_completo`, `consulta_contas_pagar_oficina`, etc.
- `CacheAgentePanel.tsx` (NOVO): Nova aba na rota `/agente` exibindo a tabela `oficina_os_cache`.

## Features Existentes Impactadas
- Tela de Agente de IA (`src/routes/agente.tsx`, `src/components/agente/LogsAgentePanel.tsx`).

## Risco Principal
- `pg_net` pode ter permissões de segurança ou restrições de schema no Supabase dependendo da versão, podendo exigir execução com `postgres` role via raw SQL. Vamos precisar gerar o SQL exato da migration e testá-lo ou aplicá-lo via painel se localmente falhar.
