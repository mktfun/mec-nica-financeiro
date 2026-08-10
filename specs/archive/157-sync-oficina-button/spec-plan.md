# Spec Plan: Ativação do Bot Oficina Inteligente (157)

## Tasks

- [x] [FRONTEND] Importar biblioteca de UI (lucide-react, toast ou similares) para gerir estado visual de carregamento no botão "Sincronizar".
- [x] [FRONTEND] Criar estado local `isSyncing` (boolean) no `CentralImportWizard.tsx`.
- [x] [FRONTEND] Refatorar a função do `onClick` de "Sincronizar Oficina Agora" substituindo o `alert` por um loop de chamadas a `supabase.functions.invoke('sync-oficina', { body: { loja: store.id }})` executadas via `Promise.allSettled`.
- [x] [FRONTEND] Implementar tratamento de sucesso/erro e reset do estado `isSyncing`, além de disparar feedback (toast) para o usuário de que o processo terminou.
- [x] [TEST] Verificar cenário 2: Clicar no botão, inspecionar rede, verificar estado visual de `LoadingSpinner` e resposta final (200 OK na function).
