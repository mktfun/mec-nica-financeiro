# Proposal: Feedback Visual da Sincronização Cloud (159)

## Problema
O usuário clicou no botão "Sincronizar Oficina Agora" e relatou que "não aconteceu nada", mesmo os logs de rede provando que a Edge Function rodou com sucesso (`POST 200` em ~200ms).
Isso ocorre porque o componente `CentralImportWizard` está usando a função `addLog()` para registrar o sucesso/falha do clique. Porém, o log (estado `importLogs`) só é visível ao usuário no **Passo 4** do Wizard, enquanto o botão fica no **Passo 1**. O usuário fica às cegas, sem saber que o Bot na VPS foi ativado em background com sucesso.

## Solução Proposta
Em vez de depender apenas de `addLog()`, acoplaremos um feedback visual global (via biblioteca de `toast` já presente no ecosistema Lovable, tipicamente `sonner` ou `react-hot-toast`) diretamente no `onClick` do botão. Quando o `Promise.allSettled` retornar, o usuário receberá uma notificação verde flutuante no topo da tela, independentemente de onde ele esteja.

## Contratos de Dados
Nenhuma alteração em tabelas ou endpoints. Apenas estado de UI.

## API / Interface
- Componente afetado: `src/components/importacoes/CentralImportWizard.tsx`.
- Dependência: `import { toast } from 'sonner';` (ou equivalente como `react-hot-toast` / `lucide-react`). Validaremos a lib correta instalada no repositório.

## Features Existentes Impactadas
Melhora a UX da aba de Importações Cloud Automáticas sem afetar os uploads de Excel manuais.

## Risco Principal
- **Probabilidade:** Baixa.
- **Impacto:** Nulo.
- **Mitigação:** Trataremos os imports da biblioteca de UI com cuidado, verificando qual está instalada.
