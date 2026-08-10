# Design: Feedback Visual da Sincronização Cloud (159)

## Arquitetura Técnica
A alteração é restrita à UI (View Layer) do React. Substituiremos o uso de side-effects invisíveis (`addLog`) no Passo 1 por side-effects visíveis (`toast`).

## Interfaces TypeScript
N/A

## Componentes / Hooks / Funções
`src/components/importacoes/CentralImportWizard.tsx`
- Função afetada: Callback `onClick` do `<Button>Sincronizar Oficina Agora</Button>` (Linha ~853).

## Fluxo de UI
1. Usuário clica em "Sincronizar Oficina Agora".
2. O botão vira estado de _loading_ (spinner + "Sincronizando...").
3. As requisições à Edge Function terminam rapidamente.
4. **NOVO**: Um `toast.success` ou `toast("Sincronização completa!")` salta na tela imediatamente.
5. O botão volta ao estado normal. O Bot (background VPS) fará a mágica silenciosamente.

## Infra / Deploy
Deploy puramente Frontend (Vite/Next). Sem variáveis de ambiente.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- Cenário 1: [Clicar no botão Sincronizar] → [Promise responde em ~200ms] → [Aparece um Toast (notificação flutuante) de Sucesso na tela, confirmando a ação].
