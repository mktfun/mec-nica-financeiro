# Design: Ativação do Bot Oficina Inteligente (157)

## Arquitetura Técnica
Botão (CentralImportWizard) → Loop nas Lojas ativas → `supabase.functions.invoke('sync-oficina')` → Edge Function Supabase → Node Proxy VPS → PM2 Playwright Bot

## Interfaces TypeScript
Nenhuma nova interface. Utilizaremos o SDK oficial de functions do Supabase.

## Componentes / Hooks / Funções
- `src/components/importacoes/CentralImportWizard.tsx` (Alteração do botão)

## Fluxo de UI
1. Usuário acessa Importações.
2. Clica em "Sincronizar Oficina Agora".
3. O botão exibe estado de `isLoading` com um spinner e a mensagem "Acordando bot na Nuvem...".
4. O componente itera sobre a array de `stores` vinda de `useStores()`.
5. Uma promessa `Promise.all` chama a Edge function `sync-oficina` repassando `{ loja: store.id }`.
6. Retorna toast de sucesso: "Sincronização completa! O Bot atualizou os dados no banco."

## Infra / Deploy
Sem alterações de variáveis de ambiente no front. O Supabase client será usado localmente.
Para deploy: N/A, apenas front.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- Cenário 1: [Mock ativo] → [Clicar em sincronizar] → [Retornar alert mock] (Anterior)
- Cenário 2: [Botão refatorado] → [Clicar Sincronizar] → [Spinner aparece, function é invocada, toast de sucesso após Promise.all]
