# Spec Plan: Automação Híbrida de Importação e Fix do Agente IA (059-oficina-bot-automation)

## Tasks

- [ ] [BACKEND] Criar nova tabela `oficina_contas` (id, store_id, id_interno, fornecedor, valor_original, valor_em_aberto, vencimento, status, tipo).
- [ ] [BACKEND] Criar nova tabela `oficina_os_cache` (id, store_id, os_number, status_cache, payload_completo, updated_at).
- [ ] [BACKEND] Criar Edge Function `sync-oficina` que faça fetch do resumo (Contas a Pagar/OSs List) e execute upsert nessas tabelas locais.
- [ ] [BACKEND] Refatorar `supabase/functions/ai-chat/tools-oficina.ts`: Expandir `AbortSignal.timeout` para 45000ms nas rotas live.
- [ ] [BACKEND] Refatorar `consulta_os_detalhe_completo` para implementar a verificação de Cache (se status != FINALIZADO, busca no bot e faz UPSERT; se FINALIZADO, lê do cache local).
- [ ] [BACKEND] Refatorar as demais tools (Contas a Pagar) para lerem do banco.
- [ ] [FRONTEND] Inserir botão "Sincronização Cloud (Bot)" no componente `CentralImportWizard` para chamar a Edge Function `sync-oficina` sob demanda.
- [ ] [TEST] Verificar cenário 1: Clicar no botão e checar se `oficina_contas` é preenchida.
- [ ] [TEST] Verificar cenário 2: Simular busca na IA por uma OS e conferir se ela salva o JSON no `oficina_os_cache`.
