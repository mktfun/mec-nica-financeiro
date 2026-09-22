# Spec Plan: Fix UI Overlaps, Contas Values, and Modal Trigger

- [x] 1. Update `CashVaultCompositionModal.tsx` to fix header layout (`flex-wrap`) and prevent metrics cards text from overflowing (`min-w-0`, `truncate`, `tracking-tighter`).
- [x] 2. Update `ContasManualModal.tsx` to accept `jurosRedeValor` as a prop and display the true subtotal (Contas + Juros) in the header summary card.
- [x] 3. Update `ResumoDiaPanel.tsx` to:
  - Pass `jurosRedeValor` into `ContasManualModal`.
  - Remove `CashVaultCompositionModal` trigger from "Dinheiro no Cofre".
  - Add `CashVaultCompositionModal` trigger to "Dinheiro MP" card with visual cues.
