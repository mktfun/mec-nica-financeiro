# Proposal: Correção de Import do Ícone Car em CentralImportWizard (352)

## Problema
Ao abrir a tela de importação (`/importacoes`), o console do navegador emitiu o erro em tempo de execução:
```
ReferenceError: Car is not defined
    at CentralImportWizard (CentralImportWizard.tsx:2187, 2746)
```
O componente `<Car ... />` foi introduzido nas etapas do Step 1.5 e Step 3, porém o identificador `Car` não foi incluído na lista de desestruturação do import de `lucide-react`.

---

## Solução Proposta (Foco em Reuso e Correção)
Adicionar explicitamente `Car` no import de `lucide-react` em `src/components/importacoes/CentralImportWizard.tsx`.

---

## Investigação e Análise de Reuso (Relatório dos Subagentes)
- **Componente Afetado:** `[MODIFY] src/components/importacoes/CentralImportWizard.tsx` (linhas 15-19).
- **Usos Identificados:**
  - Linha ~2187: `<Car className="w-5 h-5 text-emerald-400" />` (Header do Step 1.5)
  - Linha ~2746: `<Car size={13} />` (Botão de Gerenciar Pátio & Baixas no Step 3)
- Demais componentes (`ManualMatchOsModal.tsx`, `PatioManualStoreGrid.tsx`, `PatioManagementDualModal.tsx`) já importam `Car` corretamente.

---

## Contratos de Dados & SQL (Supabase)
Nenhuma alteração de banco ou RPC.

---

## API & Componentes (Frontend)
- `[MODIFY] src/components/importacoes/CentralImportWizard.tsx`: Incluir `Car` no bloco `import { ..., Car } from 'lucide-react';`.

---

## Risco Principal e Mitigação
- **Risco:** Outros ícones sem importação explícita gerarem falhas de runtime.
- **Mitigação:** Varredura exaustiva de todas as tags JSX de ícones contra a declaração de imports do arquivo.
