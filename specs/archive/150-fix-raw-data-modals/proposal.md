# Proposal: Fix Raw Data Modals (150)

## Problema

Os modais de "Raio-X de Lotes" (Pátio OS, Maquininha, Banco OFX) não funcionam corretamente após implementação da spec 149. Foram identificados **4 bugs distintos** por inspeção cirúrgica do código vs. schema real do banco:

### Bug 1 — API do `<Modal>` quebrada (CRÍTICO)
O componente `Modal` existente em `src/components/ui/Modal.tsx` exige a prop `title: string` como obrigatória e controla internamente o header. O `ImportSourceBadges.tsx` passou `className` arbitrário e tentou renderizar o header manualmente dentro do modal, ignorando a API real. O modal quebra ou não abre.

### Bug 2 — Tipo errado nas RPCs: `store_id` é `text`, não `uuid` (CRÍTICO)
As 3 RPCs foram criadas com `p_store_id uuid`. Porém os campos `store_id` nas tabelas `patio_os`, `pos_transactions` e `ofx_transactions` são do tipo **`text`** (confirmado via `information_schema.columns`). Isso faz com que a comparação `WHERE store_id = p_store_id` retorne **0 linhas** silenciosamente — o modal abre, mas aparece vazio.

### Bug 3 — Filtro de data errado na OS (CRÍTICO)
A `get_raw_os_data` filtra por `opened_at::date = p_date`. Mas a tela de conciliação usa **`targetDate`** como data do lote importado (campo `target_date` na tabela). Uma OS aberta em 05/08 pode ter sido importada no lote de 10/08. O filtro correto deve usar `po.opened_at::date` **ou** um campo `target_date` se existir — mas alinhado com o mesmo critério das outras tabelas que já usam `target_date::date`.

### Bug 4 — Import inexistente `formatDate` em `RawOsTable` (CRÍTICO)
`RawOsTable.tsx` importa `{ formatCurrency, formatDate }` de `@/lib/utils`, mas `formatDate` **não existe** nesse módulo (apenas `formatCurrency` e `cn`). A tela crasha em runtime ao abrir o modal de OS.

## Solução Proposta

Correção cirúrgica e mínima em **4 pontos**:

1. **Reescrever `ImportSourceBadges.tsx`** para usar a API real do `Modal` (`title` prop + children sem header manual)
2. **Corrigir as 3 RPCs** no banco: mudar `p_store_id uuid` → `p_store_id text` em todas as funções (via nova migration `CREATE OR REPLACE`)
3. **Corrigir o filtro de data nas RPCs**: usar `target_date = p_date` onde o campo existir, e `occurred_at::date = p_date` onde não existir `target_date`
4. **Remover import inexistente `formatDate`** de `RawOsTable.tsx` e usar `format()` do `date-fns` diretamente (já importado)

## Contratos de Dados

### Tabelas (sem mudança de schema — apenas corrigir tipo nos parâmetros)
- `patio_os.store_id` → `text`
- `pos_transactions.store_id` → `text`, `target_date` → `date`
- `ofx_transactions.store_id` → `text`, `target_date` → `date`
- `stores.id` → `uuid` (único que é uuid de verdade)

### RPCs corrigidas
| Função | Parâmetro corrigido | Filtro de data corrigido |
|---|---|---|
| `get_raw_os_data(p_store_id text, p_date date)` | `text` | `opened_at::date = p_date` (sem campo target_date) |
| `get_raw_rede_data(p_store_id text, p_date date)` | `text` | `target_date = p_date` |
| `get_raw_ofx_data(p_store_id text, p_date date)` | `text` | `target_date = p_date` |
| `get_raw_ofx_data` — `account_limit` | `stores.id uuid` | cast: `WHERE id = p_store_id::uuid` |

## API / Interface

### `Modal` (API real existente)
```tsx
<Modal isOpen={bool} onClose={fn} title="string">
  {children}
</Modal>
```
Sem `className` externo, sem header manual dentro.

### Hook (sem mudança)
`useRawOs`, `useRawRede`, `useRawOfx` — apenas o backend muda, o frontend chama igual.

## Features Existentes Impactadas
- `ImportSourceBadges` → reescrito
- `RawOsTable` → import corrigido
- RPCs `get_raw_os_data`, `get_raw_rede_data`, `get_raw_ofx_data` → recriadas via `CREATE OR REPLACE`

## Risco Principal

**Probabilidade: Média**
**Impacto: Reversível** (são `CREATE OR REPLACE` — nenhuma migration destrutiva)
**Mitigação:** Testar cada RPC isoladamente no console do Supabase antes de marcar como concluída, verificando retorno com um `store_id` real de texto.
