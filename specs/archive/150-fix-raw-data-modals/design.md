# Design: Fix Raw Data Modals (150)

## Arquitetura Técnica

```
[Usuário clica no badge]
   → ImportSourceBadges.tsx (setActiveModal)
   → useRawOs/Rede/Ofx (React Query, enabled=true)
   → Supabase RPC (get_raw_os_data / get_raw_rede_data / get_raw_ofx_data)
   → banco: filtra por store_id TEXT + target_date DATE
   → retorna dados
   → Modal.tsx (API: title + children)
   → RawOsTable / RawRedeTable / RawOfxTable (renderiza)
```

## Correções por Arquivo

### [BACKEND] `supabase/migrations/20260810170000_fix_raw_rpc_store_id_type.sql`
```sql
-- Recriar as 3 RPCs com p_store_id text e filtros corretos
CREATE OR REPLACE FUNCTION get_raw_os_data(p_store_id text, p_date date) ...
  WHERE po.store_id = p_store_id
  AND po.opened_at::date = p_date

CREATE OR REPLACE FUNCTION get_raw_rede_data(p_store_id text, p_date date) ...
  WHERE pt.store_id = p_store_id
  AND pt.target_date = p_date  -- campo target_date existe

CREATE OR REPLACE FUNCTION get_raw_ofx_data(p_store_id text, p_date date) ...
  -- stores.id é uuid, então: WHERE id = p_store_id::uuid
  WHERE ot.store_id = p_store_id
  AND ot.target_date = p_date  -- campo target_date existe
```

### [FRONTEND] `src/hooks/useRawImportData.ts`
- Mudar tipo de `storeId` de `uuid` implícito para `string` (já está, sem mudança)

### [FRONTEND] `src/components/conciliacao/ImportSourceBadges.tsx`
- Remover o header manual (title, X button, ícone)
- Passar `title` corretamente como prop do `Modal`
- Remover `className` passado ao `Modal` (não suportado pela API)
- Manter os 3 botões/badges e o conteúdo das tabelas como `children`

```tsx
// ANTES (errado):
<Modal isOpen={...} onClose={...} className="max-w-5xl...">
  <div> {/* header manual */} </div>
  <div> {/* body */} </div>
</Modal>

// DEPOIS (correto):
<Modal
  isOpen={activeModal !== 'none'}
  onClose={closeModal}
  title={modalTitle}  // ex: "Raio-X: Pátio OS"
>
  {activeModal === 'os' && <RawOsTable ... />}
  {activeModal === 'rede' && <RawRedeTable ... />}
  {activeModal === 'ofx' && <RawOfxTable ... />}
</Modal>
```

### [FRONTEND] `src/components/conciliacao/RawOsTable.tsx`
- Remover `formatDate` do import (não existe em utils)
- Usar apenas `format` do `date-fns` (já importado) para formatar datas

## Interfaces TypeScript

```ts
// useRawImportData.ts — sem mudança de tipos, apenas o backend muda
export function useRawOs(storeId: string, date: string, enabled: boolean)
export function useRawRede(storeId: string, date: string, enabled: boolean)
export function useRawOfx(storeId: string, date: string, enabled: boolean)
```

## Fluxo de UI

1. Usuário entra na `/conciliacao/:lojaId?date=YYYY-MM-DD`
2. Vê os 3 badges: **Pátio OS** (verde), **Maquininha** (âmbar), **Banco OFX** (azul)
3. Clica em qualquer badge → `setActiveModal('os' | 'rede' | 'ofx')`
4. React Query dispara a RPC correspondente (lazy — `enabled: activeModal === tipo`)
5. `Modal` abre com o `title` correto (ex: "Raio-X: Pátio OS")
6. Tabela renderiza com dados reais
7. Usuário fecha → `setActiveModal('none')`

### Restrições visuais
- Seguir API existente do `Modal`: `title`, `children`, `footer?`, `position?`
- Dark UI Zinc-950, sem glassmorphism
- Tabelas com `overflow-x-auto` para telas pequenas

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)

- **Cenário 1:** Clicar em "Pátio OS" → modal abre com título correto, tabela mostra OSs importadas para aquela data alvo da loja → ✅
- **Cenário 2:** Clicar em "Maquininha" → tabela mostra transações da maquininha da loja naquela data alvo → ✅
- **Cenário 3:** Clicar em "Banco OFX" → exibe transações OFX, `account_limit` e `previous_balance` → ✅
- **Cenário 4 (edge):** Loja sem dados importados para a data → tabela exibe "Nenhum registro encontrado" sem crash → ✅
- **Cenário 5 (edge):** `account_limit` nulo na `stores` → exibe "Não configurado" sem crash → ✅
