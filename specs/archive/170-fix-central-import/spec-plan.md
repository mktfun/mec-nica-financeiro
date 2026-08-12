# Implementation Plan: Central Import Wizard Mapping Fixes

## Fases de Implementação

- [x] Modificar `useUnifiedStoreMapping` para aceitar `stores` via parâmetro.
- [x] Adicionar `useEffect` no hook para popular `mapping` usando localStorage e cruzar com os IDs das `stores`.
- [x] Atualizar as chamadas a `useUnifiedStoreMapping` em `CentralImportWizard.tsx` para passar `stores`.
- [x] Alterar `handleCloudDataSuccess` para nunca pular o `step(2)` se houver aliases identificados na extração (seja `fallback` ou não).
- [x] Modificar o botão final do `step 2` (SubStep 3 - Maquininha) para rotear dinamicamente para `3.5` caso `needsFallback` seja true.
- [x] Adicionar aviso preventivo na tela Preview (`step 3`) se os valores globais importados forem > 0, mas todas as lojas computarem 0, indicando que o usuário ignorou o mapeamento (ou colocar as lojas "órfãs" num array "Unmapped").
