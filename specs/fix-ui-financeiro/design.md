# Technical Design: Fix UI Overlaps, Contas Values, and Modal Trigger

## 1. CashVaultCompositionModal.tsx
- **Header Section:**
  - Add `flex-wrap` to the main header container.
  - Add `min-w-0` to the text container (`div` wrapping the `h2` and `p`) to allow `truncate` to work properly.
- **Metrics Cards:**
  - Change the grid class from `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` to `grid-cols-2 lg:grid-cols-4`.
  - Change `text-base md:text-lg` to `text-sm sm:text-base md:text-lg truncate tracking-tighter` and ensure the parent has `min-w-0 overflow-hidden`.

## 2. ContasManualModal.tsx
- **Props update:** 
  - Add `jurosRedeValor?: number` to `ContasManualModalProps`.
- **Top Card update:**
  - Modify the right side of the summary card.
  - Calculate `finalTotal = displayTotal + (jurosRedeValor || 0)`.
  - Display `finalTotal` as the primary number.
  - Add a sub-text breakdown: `R$ {displayTotal} (Contas) + R$ {jurosRedeValor} (Juros)`.

## 3. ResumoDiaPanel.tsx
- **Modal Invocation:**
  - Pass `jurosRedeValor={jurosRedeValor}` to `<ContasManualModal />`.
- **Relocating CashVaultCompositionModal Trigger:**
  - **Remove:** From the "Dinheiro no Cofre" badge (lines ~760-773). Remove `onClick`, `cursor-pointer`, and hover styles that trigger the modal.
  - **Add:** To the "Dinheiro MP" card (lines ~789-820). 
    - Wrap the "Dinheiro MP" card in a clickable container or add `onClick={() => !isEditing && setIsCashVaultModalOpen(true)}` to its main `div`.
    - Add hover states (`hover:border-teal-500/50 hover:bg-[var(--bg-surface-hover)] cursor-pointer group`) when not editing.
    - Add a visual indicator (like a small "Gerenciar ↗" badge similar to "Contas (Manual)").
