# Design: Extrato Bancário Nativo por Loja com Entradas, Saídas, Filtros e Fuzzy Match de Despesas (290)

## Algoritmo de Auto-Match / Fuzzy Match de Despesas

```
Para cada transação OFX com type === 'out':
  1. Filtrar daily_manual_bills da loja na data (ou intercompany).
  2. Passo 1 (Match Exato):
     - bill.amount === tx.amount && normalize(bill.recipient_name) contido em normalize(tx.memo/title)
     -> Score 1.0 (Auto-Match Confirmado)
  3. Passo 2 (Match por Valor Único):
     - Se existe apenas 1 conta a pagar com aquele valor exato na loja na data
     -> Score 0.85 (Sugerir / Auto-Match de Conta Paga)
  4. Resultado:
     - Renderiza Badge "🟢 Conta: [Nome do Favorecido]"
     - Identifica a despesa como coberta pelo extrato
```

## Estrutura de Componentes

```
StoreExtratoBancarioView.tsx
 ├── Header KPI Cards (4 cards no grid zinc-900 border-zinc-800)
 ├── Filter Pills Bar (Todas | Pendentes | Entradas | Saídas | Contas Pagas | Rede)
 └── Transactions Table
      ├── Data (DD/MM/AAAA)
      ├── Tipo (IN / OUT)
      ├── Descrição / Favorecido (Memo OFX)
      ├── Status / Match (OS / Rede / Conta Paga / Justificado / Pendente)
      ├── Valor (R$ Verde / Vermelho)
      └── Ações (Vincular / Justificar / Desvincular)
```

## Cenários de Teste

- **Cenário 1 (Filial Dom Pedro 26/08):**
  - Entradas OFX: R$ 5.770,74 (Rede) + R$ 1.845,00 (MHE).
  - Saídas OFX: R$ 1.250,00 (Boleto Servicekleen) + R$ 60,00 (PIX FT3) + R$ 60,00 (PIX FT3).
  - Contas Importadas (`daily_manual_bills`): Contém Boleto Servicekleen R$ 1.250,00 e FT3 Serviços R$ 60,00.
  - *Resultado:* O sistema realiza o auto-match das saídas com as contas a pagar, marcando-as como "🟢 Conta Paga" e zerando as pendências do dia.
