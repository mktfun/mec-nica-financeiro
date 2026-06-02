# Tasks - 019 OS History & Layout Spacing

- [x] 1. Criar e aplicar migração no Supabase para adicionar a coluna `history_log` (JSONB) na tabela `patio_os`.
- [x] 2. Atualizar as tipagens TS exportadas do banco de dados (modificar `PatioOSRow` no `supabase.ts`).
- [x] 3. Ajustar `src/hooks/useImportProcessor.ts` para capturar `total_value`, `paid_value`, `status` e `history_log` existentes.
- [x] 4. No loop de inserção/update do processor, criar a lógica de detecção de mudanças (diff) e preencher/concatenar a array no payload do `update`.
- [x] 5. Ajustar o modal em `src/routes/patio.tsx` para listar graficamente os itens de `history_log` de forma estética.
- [x] 6. Ajustar `AppShell.tsx` modificando as classes de padding inferior do layout.
- [x] 7. Solicitar o QA e aprovação do usuário.
