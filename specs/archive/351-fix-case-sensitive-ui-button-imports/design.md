# Design: Correção de Case Sensitivity em Importações UI (351)

## Arquitetura e Fluxo de Importações

```
src/components/ui/Button.tsx (PascalCase no disco)
        ▲
        │  import { Button } from '@/components/ui/Button';
        │
        ├── src/components/importacoes/OcrBatchDropzoneAndPaste.tsx [MODIFY]
        └── src/components/importacoes/OcrBatchReviewGrid.tsx [MODIFY]
```

---

## Mutações em Arquivos Existentes [MODIFY]

### 1. `src/components/importacoes/OcrBatchDropzoneAndPaste.tsx`
- Linha 3: `import { Button } from '@/components/ui/button';` -> `import { Button } from '@/components/ui/Button';`

### 2. `src/components/importacoes/OcrBatchReviewGrid.tsx`
- Linha 5: `import { Button } from '@/components/ui/button';` -> `import { Button } from '@/components/ui/Button';`

---

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)

### Cenário 1: Build em Sistema de Arquivos Case-Sensitive
- **Estado Inicial:** Importações normalizadas com `@/components/ui/Button`.
- **Ação:** Executar `npm run build`.
- **Resultado Esperado:** Build conclui com sucesso (código 0) sem erros `[UNLOADABLE_DEPENDENCY]`.
