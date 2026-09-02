# Proposal: Correção de Case Sensitivity em Importações UI (Button) para Deploy Linux / Lovable (351)

## Problema
No ambiente de deploy Lovable / Linux (sistema de arquivos case-sensitive), o build falhou com o erro:
```
[UNLOADABLE_DEPENDENCY] Could not load src/components/ui/button
at src/components/importacoes/OcrBatchDropzoneAndPaste.tsx:3:24
```
O componente no disco é `src/components/ui/Button.tsx` (PascalCase), mas estava sendo importado com minúsculo (`@/components/ui/button`) em dois componentes da esteira OCR. No Windows (case-insensitive) o build passava, mas no Linux/Cloudflare o build falha.

---

## Solução Proposta (Foco em Reuso e Correção)
Normalizar as importações para o caminho canônico PascalCase `@/components/ui/Button` nos arquivos identificados pela varredura:
1. `[MODIFY] src/components/importacoes/OcrBatchDropzoneAndPaste.tsx`
2. `[MODIFY] src/components/importacoes/OcrBatchReviewGrid.tsx`

---

## Investigação e Análise de Reuso (Relatório dos Subagentes)
- **Varredura Completa de Imports:** Executada busca regex em todo o diretório `src/` por `from '@/components/ui/[a-z]'`.
- **Arquivos com Inconsistência Encontrados:**
  - `src/components/importacoes/OcrBatchDropzoneAndPaste.tsx:3` (`@/components/ui/button` -> `@/components/ui/Button`)
  - `src/components/importacoes/OcrBatchReviewGrid.tsx:5` (`@/components/ui/button` -> `@/components/ui/Button`)
- `src/components/ui/table` é um diretório com `index.ts`, logo `@/components/ui/table` é válido e está correto.

---

## Contratos de Dados & SQL (Supabase)
Nenhuma alteração de banco ou RPC necessária.

---

## API & Componentes (Frontend)
- `[MODIFY] src/components/importacoes/OcrBatchDropzoneAndPaste.tsx`: Ajustar import para `import { Button } from '@/components/ui/Button';`
- `[MODIFY] src/components/importacoes/OcrBatchReviewGrid.tsx`: Ajustar import para `import { Button } from '@/components/ui/Button';`

---

## Risco Principal e Mitigação
- **Risco:** Outras importações com casing incorreto quebrarem deploys no Linux.
- **Mitigação:** Varredura exaustiva com regex case-sensitive em todo o código-fonte garantindo que todos os imports de `@/components/ui/`, `@/hooks/` e `@/lib/` correspondem exatamente ao case do sistema de arquivos.
