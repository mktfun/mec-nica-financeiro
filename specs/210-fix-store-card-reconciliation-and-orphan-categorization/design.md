# Design: 210-fix-store-card-reconciliation-and-orphan-categorization

## 1. Arquitetura Técnica

```
  ┌────────────────────────────────────────────────────────┐
  │         Aba 1: Cartão (Maquininha → OFX / OS)          │
  │                                                        │
  │  Rede Bruto Loja: R$ 5.054,52                          │
  │  Taxa MDR Retida: R$ 143,04                            │
  │  Líquido Creditado no OFX: R$ 4.911,48                 │
  └───────────────────────────┬────────────────────────────┘
                              │
               (Cruzamento com Entradas Adquirente)
                              │
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │  Tabela osVsRede:                                      │
  │  - Transação: "Importação Rede (DP)"                   │
  │  - Rede (Bruto): R$ 5.054,52                           │
  │  - Faturamento Entrado no OFX: R$ 4.911,48             │
  │  - Delta / Taxa Retida: R$ 143,04 (2.8%)               │
  │  - Referência: "Extrato REDE Consolidado"              │
  │  - Status: "Pareado com Extrato Bancário"              │
  └────────────────────────────────────────────────────────┘

  ┌────────────────────────────────────────────────────────┐
  │         Aba 4: Justificar Transação Órfã               │
  └───────────────────────────┬────────────────────────────┘
                              │
                     [useCategorizeOrphan]
                              │
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │  UPDATE public.ofx_transactions SET                    │
  │    manual_category = 'venda_sucata',                   │
  │    manual_justification = '...'                        │
  │  WHERE id = p_tx_id;                                   │
  │  (Zero erros 55000 de views não atualizáveis!)         │
  └────────────────────────────────────────────────────────┘
```

## 2. Detalhes de Implementação

### 2.1 `src/hooks/useCategorizeOrphan.ts`
- Atualizar diretamente a tabela base `ofx_transactions` (onde ficam as entradas bancárias órfãs).
- Se a transação for de POS, atualizar `pos_transactions`.
- Invalidação automática dos caches React Query após a gravação.

### 2.2 `src/hooks/useConciliacao.ts` (`useReconciliationViews`)
- Em `osVsRede`:
  - `redeBruto`: `Number(redeTx.gross_amount || redeTx.amount || 0)`.
  - `redeLiquido`: `Number(redeTx.amount || 0)`.
  - `taxaBrl`: `Number(redeTx.fee_amount || Math.max(0, redeBruto - redeLiquido))`.
  - `taxaPercent`: `redeBruto > 0 ? (taxaBrl / redeBruto * 100) : 0`.
  - `os_total`:
    - Se houver OS pareada 1:1 com número e valor coincidente: `osTotal = osData.paid_value`.
    - Caso contrário, o faturamento da maquininha da loja que entrou no banco é `redeLiquido` (ou o total correspondente no OFX `totalAdquirenteOfx`), garantindo que o delta reflita exatamente a taxa de maquininha retida.
  - `os_number`:
    - Se `matched_os_number` for um UUID/hash ou vazio, exibir `'Extrato REDE Consolidado'` em vez de `OS #1718586b-...`.
    - Se for um número de OS de verdade (`/^\d+$/`), exibir `OS #<numero>`.

### 2.3 `src/components/conciliacao/OsVsRedeTable.tsx`
- Atualizar títulos e badges:
  - Card 1: **Total Cartão (Rede Bruto)** (`R$ 5.054,52`)
  - Card 2: **Faturamento Entrado no Banco (OFX)** (`R$ 4.911,48`)
  - Card 3: **Taxa Retida / Delta** (`R$ 143,04` com badge de taxa de adquirente)

---

## 3. Cenários de Verificação

- **Cenário 1: Visualização da Aba 1**:
  - Usuário abre Conciliação de Dom Pedro (`st-01`) → Aba 1 exibe Rede Bruto R$ 5.054,52, Entrado no Banco R$ 4.911,48, Taxa Retida R$ 143,04 (2.8%) com status Pareado com Extrato e sem número de OS falso.
- **Cenário 2: Justificativa de Depósito Órfão no Banco (Aba 4)**:
  - Usuário clica em "Justificar" em qualquer linha do OFX → Seleciona "Venda de Sucata" e salva → A gravação ocorre diretamente na tabela `ofx_transactions` com sucesso (zero erro 55000), o badge é atualizado e o valor abate na conciliação do dia.
