# Proposal: Fix UI Overlaps, Value Discrepancies, and Relocate Cash Modal

## Context
The user reported three main issues in the daily reconciliation (conciliação) dashboard:
1. **Broken Layout in "Dinheiro" Modal:** The `CashVaultCompositionModal` has severe overlapping issues on smaller screens. The header title overlaps with the action button, and the top metrics cards have text bleeding out of their containers, making the amounts unreadable.
2. **"Contas (Manual)" Value Discrepancy:** The "Contas (Manual)" card on the main dashboard (`ResumoDiaPanel`) shows a subtotal that includes both the base accounts (`contasManualValor`) and the network interest (`jurosRedeValor`), e.g., `25.276,95`. However, when opening the "Ver Contas" modal (`ContasManualModal`), the total displayed is only the base accounts (e.g., `22.112,91`). This causes confusion, leading the user to believe one of the values is incorrect.
3. **Misplaced Cash Management Trigger:** The user pointed out that the screen for managing cash expenses ("tirar do dinheiro") should be accessible from the "Dinheiro MP" card, not from the "Dinheiro no Cofre" indicator inside the banks card.

## Proposed Solution

1. **Fix CashVaultCompositionModal Layout:**
   - Update the modal header to use `flex-wrap` and ensure text containers have `min-w-0` so they truncate correctly instead of overlapping adjacent flex items.
   - Adjust the grid layout for the metrics cards to be more responsive (e.g., `grid-cols-2 lg:grid-cols-4`).
   - Add `break-all` or adjust text sizes (`text-sm md:text-lg`) with `tracking-tighter` for the currency values in the metrics cards to prevent them from bleeding into neighboring cards.

2. **Align "Contas" Values (ResumoDiaPanel & ContasManualModal):**
   - **ContasManualModal:** Update the modal to explicitly receive and display the `jurosRedeValor`. We will change the modal's top summary card to clearly show the math: `Base Contas + Juros Rede = Total a Cobrir (Subtotal)`. This will perfectly align the modal's total with the outside dashboard's subtotal.
   - **ResumoDiaPanel:** Pass the `jurosRedeValor` into the modal as a prop.

3. **Relocate Cash Management Modal:**
   - In `ResumoDiaPanel.tsx`, remove the `onClick` event and hover styles that trigger `setIsCashVaultModalOpen(true)` from the "Dinheiro no Cofre" badge.
   - Add the `onClick` trigger and an intuitive visual indicator (like a button or hover effect) to the "Dinheiro MP" card so the user can manage cash fractions and expenses directly from there.

## Impact
- Clean, responsive UI for the cash modal without overlapping text.
- Transparent and consistent financial values, eliminating user confusion regarding the accounts subtotal.
- Correct conceptual mapping of cash management to the "Dinheiro MP" card, aligning with the user's operational workflow.
