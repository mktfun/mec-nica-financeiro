# Design: Desacoplamento Temporal da Rede, Correção de Erros de Console e Motor de Conciliação (292)

## Diagrama da Arquitetura em Duas Trilhas

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        ARQUITETURA EM DUAS TRILHAS DESACOPLADAS                        │
├──────────────────────────────────────────┬─────────────────────────────────────────────┤
│  TRILHA 1: COMPETÊNCIA / PÁTIO (D0)      │  TRILHA 2: CAIXA / BANCOS (D0 ⇄ D-1)        │
├──────────────────────────────────────────┼─────────────────────────────────────────────┤
│  1. Relatório POS Rede do Dia            │  1. Extrato OFX do Dia                      │
│     (Total Líquido: R$ 5.884,95)         │     (Crédito Rede: +R$ 5.770,74)            │
│                 │                        │                 │                           │
│                 ▼                        │                 ▼                           │
│  2. Baixa nas OSs de Cartão (D0)         │  2. Reconhecimento Automático de Lote       │
│     - Carros saem do Pátio Físico        │     - Badge: 🔵 Lote Rede (Ref: D-1)        │
│     - Gera Ativo a Compensar             │     - Comcompõe Saldo em Conta Itaú         │
│                 │                        │                 │                           │
│                 ▼                        │                 ▼                           │
│  3. Pilar 1: Cartões a Compensar         │  3. Pilar 1: Saldo Bancos OFX               │
│     (Entra integral: +R$ 5.884,95)       │     (Entra integral: +R$ 5.770,74)          │
└──────────────────────────────────────────┴─────────────────────────────────────────────┘
                                  │
                                  ▼
                   CAIXA ATUAL = SOMA DE TODOS OS ATIVOS
                (Zero Dupla Contagem / Zero Divergência: Δ = 0,00)
```

## Comportamento da Interface (StoreExtratoBancarioView)

| Tipo de Lançamento no OFX | Badge Visual | Botão "Vincular OS" | Botão "Justificar" |
|---|---|:---:|:---:|
| **Entrada PIX / TED Avulso** | `🟡 Pendente` ou `🟢 OS #123` | ✅ Ativo | ✅ Ativo |
| **Crédito Rede (+R$ 5.770,74)** | `🔵 Lote Rede (Ref: D-1)` | ❌ Bloqueado (Lote) | ✅ Ativo (para tarifas/aluguel) |
| **Débito Boleto (-R$ 1.250)** | `🟢 Conta: [Favorecido]` | ❌ Não se aplica | ❌ Desabilitado (Saída) |
| **Débito Tarifa / Outro (-R$)** | `Débito Bancário` | ❌ Não se aplica | ❌ Desabilitado (Saída) |
| **Conciliado em Outra Data 🔒** | `🔒 Conciliado em [Data]` | ❌ Bloqueado | ❌ Bloqueado (Somente Leitura) |

## Fórmulas no PostgreSQL (RPC get_daily_reconciliation_summary)

```sql
-- 1. Cartões a Compensar em D0 (Universal para todas as 10 filiais, sem hardcode):
v_cartoes_a_compensar := COALESCE((
    SELECT SUM(COALESCE(r.rede_liquido, 0))
    FROM reconciliations r
    WHERE r.data = v_target_date
), 0);

-- 2. Saldo Bancos OFX (Consolidado patrimonial oficial das 10 contas Itaú):
v_saldo_bancos := COALESCE((
    SELECT SUM(COALESCE(r.saldo_bancos_ofx, 0))
    FROM reconciliations r
    WHERE r.data = v_target_date
), 0);
```

## Cenários de Teste

- **Cenário 1 (Dom Pedro 26/08):**
  - Saldo Bancos OFX com crédito de +R$ 5.770,74 absorvido em conta.
  - Cartões a Compensar com R$ 5.884,95 de vendas do dia 26/08.
  - *Resultado Esperado:* Caixa Atual íntegro, sem resíduo fantasma de R$ 114,21 e sem falso "não entrou".
- **Cenário 2 (Saídas Bancárias):**
  - Débitos de boletos e tarifas não exibem botão "Justificar".
- **Cenário 3 (Console limpo):**
  - Zero erros HTTP 400 e carregamento instantâneo.
