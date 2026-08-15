# Design: 208-fix-store-conciliation-details-views-and-matching

## 1. Arquitetura e Fluxo de Dados

```
               ┌──────────────────────────────┐
               │    Base de Dados Supabase    │
               ├──────────────┬───────────────┤
               │   patio_os   │ transactions  │
               └──────┬───────┴───────┬───────┘
                      │               │
                      ▼               ▼
           ┌─────────────────────────────────────┐
           │   useReconciliationViews(loja, d)   │
           ├─────────────────────────────────────┤
           │ 1. Busca patio_os da loja na data   │
           │ 2. Busca transactions (rede/ofx)    │
           │ 3. Pareia Cartão OS ↔ Rede          │
           │ 4. Pareia Rede Líq ↔ Depósitos OFX  │
           │ 5. Pareia PIX OS ↔ Entradas PIX OFX │
           │ 6. Agrupa Entradas OFX Sem Origem   │
           └──────────────────┬──────────────────┘
                              │
     ┌────────────────────────┼────────────────────────┬────────────────────────┐
     ▼                        ▼                        ▼                        ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│ 1. OsVsRedeTable │ │ 2. RedeVsOfxTable│ │ 3. PixVsOfxTable │ │4.OfxSemMatchTbl│
│  Cartão OS ↔ Rede│ │  Rede Líq ↔ OFX  │ │  PIX OS ↔ OFX    │ │ Entradas Avulsas│
└──────────────────┘ └──────────────────┘ └──────────────────┘ └──────────────────┘
```

## 2. Detalhamento dos Componentes e Lógicas

### 2.1 Hook `useReconciliationViews` (`src/hooks/useConciliacao.ts`)
- **Query 1**: `supabase.from('transactions').select('*').eq('store_id', storeId).eq('target_date', date)`
- **Query 2**: `supabase.from('patio_os').select('*').eq('store_id', storeId)`
- **Construção de `osVsRede`**:
  - Para cada transação da REDE (`source: 'rede'` / `'maquininha'`):
    - `rede_bruto` = `t.gross_amount || t.amount`
    - `taxa_brl` = `t.fee_amount || (rede_bruto - t.amount)`
    - `taxa_percent` = `rede_bruto > 0 ? (taxa_brl / rede_bruto * 100) : 0`
    - `rede_liquido` = `t.amount`
    - Associação com OS: se `t.os_number` estiver preenchido, busca em `patio_os`. Se não, faz matching com OSs de cartão (`credit_value > 0` ou `debit_value > 0`) da filial.
    - `os_total` = `os ? (os.paid_value || os.total_value) : 0`
    - `delta` = `rede_bruto - os_total`
- **Construção de `redeVsOfx`**:
  - Depósitos OFX de Adquirente: transações `source: 'ofx'`, `type: 'in'`, onde título contém `REDE`, `REDEMULTI`, `CARTAO`, `CIELO`, `VISA`, `MAST`, `CRED`, etc.
  - Verifica se o total líquido da Rede da loja no dia entrou no OFX ou se há depósitos correspondentes.
- **Construção de `pixVsOfx`**:
  - OSs com PIX: `patio_os` onde `pix_transfer_value > 0` ou `payment_method ILIKE '%pix%'` ou `payment_method ILIKE '%transf%'`.
  - Entradas PIX OFX: `transactions` (`source: 'ofx'`, `type: 'in'`) contendo `PIX` / `TRANSF` / `TED` no título ou descrição.
  - Pareamento 1:1 por valor e proximidade temporal.
- **Construção de `ofxSemMatch`**:
  - Entradas bancárias OFX que não são de adquirente nem foram associadas a PIX de OS.

### 2.2 `OsVsRedeTable.tsx`
- Cabeçalhos claros com formatação monetária e percentual.
- Exibição de OS legível (ex: `OS #12345`) com link para abrir `OsDetailModal`.
- Exibição do nome do cliente e placa quando a OS for encontrada.
- Se a OS não for localizada automaticamente, badge amigável `Sem OS Vinculada` com botão para vincular manualmente.

### 2.3 `RedeVsOfxTable.tsx`
- Cards de resumo: `Total Bruto Maquininha`, `Total Taxas Descontadas`, `Total Líquido Maquininha`.
- Tabela com colunas: `OS Vinculada | Valor Bruto | Taxa (%) | Taxa (R$) | Valor Líquido | Status OFX`.
- Identificação precisa de `ENTROU NO BANCO (OFX)` ou `PENDENTE DE CRÉDITO`.

### 2.4 `PixVsOfxTable.tsx`
- Cards de resumo: `Total PIX Pátio`, `PIX Entrou no Banco`, `PIX Pendente`.
- Tabela com colunas: `OS Vinculada | Cliente / Placa | Valor Declarado | Lançamento Bancário (OFX) | Status`.

### 2.5 `OfxSemMatchTable.tsx`
- Tabela limpa listando lançamentos de entrada avulsos com data, descrição, valor e badge de identificação.
