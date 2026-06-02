# Research - 019 OS History & Layout Spacing

## Contexto e Problemas
1. **Histórico de OS:** O usuário notou que o valor da OS pode subir com o passar dos dias (novos serviços/peças) e que a reimportação diária das planilhas perde esse histórico, pois a tabela `patio_os` sofre um "upsert" (sobrescrita). Ele deseja visualizar o histórico de alterações (aumentos de valor, mudanças de status) diretamente nos Detalhes da OS, de forma "bonitinha".
2. **Espaçamento do Layout:** O fundo das telas está colado à base do navegador. A ausência de um "breathing room" (espaço de respiro) prejudica a percepção premium da interface.

## Análise de Código e Dependências
- **`useImportProcessor.ts`**: Atualmente o código busca `id, os_number` de `patio_os`. Precisaremos buscar também `total_value, paid_value, status` e o novo campo `history_log` para compará-los com o payload atual. Se houver diferença, concatenamos um novo evento ao `history_log`.
- **Tabela `patio_os` (Supabase)**: Precisará de uma migração para adicionar a coluna `history_log` (tipo `jsonb`, padrão `'[]'::jsonb`).
- **`src/routes/patio.tsx`**: O Modal de detalhes da OS precisará renderizar esse histórico visualmente.
- **`AppShell.tsx`**: O wrapper do `main` tem `h-full` e pouco padding inferior em resoluções onde o conteúdo estica demais. Ajustar as classes Tailwind.
