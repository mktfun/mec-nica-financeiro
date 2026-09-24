# Spec 440 — ModalKpiCard: Componente Canonico Unificado para Cards de KPI em Modais

## Problema

Os tres modais principais da tela de Conciliacao (PatioOsDetailModal, SaldoBancosDetailModal, CashVaultCompositionModal) renderizam seus cards de KPI de topo com padroes visuais completamente diferentes:

| Modal | Padrao Atual | Problema Principal |
|---|---|---|
| PatioOsDetailModal | <Card className=border-l-4 border-l-amber-500> + text-2xl + <AmountCell> | Usa <Card> generico (p-6, rounded-lg); fonte muito grande; cor hardcoded; sem dot-indicator |
| SaldoBancosDetailModal | <div> manual inline | Cheque Especial com bg-red-500/10 inconsistente; dois cards emerald identicos; sem dot-indicator |
| CashVaultCompositionModal | <div> + dot + label uppercase + valor + subtitulo | PADRAO CORRETO - porem duplicado a mao em cada modal |

## Solucao Proposta

Criar src/components/ui/ModalKpiCard.tsx encapsulando o padrao do Cofre e substituir os cards inline nos 3 modais.

## Skills Aplicadas
- frontend-design-pro, DESIGN.md, ui-components

## Interface TypeScript

type ModalKpiCardColor = amber | emerald | rose | blue | purple | red | zinc | default;
type ModalKpiCardVariant = dot | border-l;

interface ModalKpiCardProps {
  label: string;
  value: string | number | ReactNode;
  subtitle?: string;
  subtitleExtra?: ReactNode;
  color?: ModalKpiCardColor;
  variant?: ModalKpiCardVariant;
  icon?: React.ElementType;
  danger?: boolean;
  interactive?: boolean;
  onClick?: () => void;
  actionLabel?: string;
  className?: string;
}

## Arquivos Afetados

[NOVO] src/components/ui/ModalKpiCard.tsx

[MODIFICADOS]
- src/components/conciliacao/PatioOsDetailModal.tsx (4 Card border-l-4 -> ModalKpiCard variant=border-l)
- src/components/conciliacao/SaldoBancosDetailModal.tsx (4-5 div manuais -> ModalKpiCard)
- src/components/conciliacao/CashVaultCompositionModal.tsx (4 div manuais -> ModalKpiCard)

[NAO TOCADOS] Logica de negocio, hooks, RPCs, Modal.tsx, Card.tsx, Supabase.

## Plano de Rollback

git checkout -- src/components/conciliacao/PatioOsDetailModal.tsx
git checkout -- src/components/conciliacao/SaldoBancosDetailModal.tsx
git checkout -- src/components/conciliacao/CashVaultCompositionModal.tsx
# ModalKpiCard.tsx pode ser deletado sem efeito colateral (nenhum outro modulo importa)

## Risco Principal

PatioOsDetailModal usa <AmountCell value={...} tone=warning />. O ModalKpiCard aceita ReactNode no value, portanto compativel sem alterar o AmountCell.
