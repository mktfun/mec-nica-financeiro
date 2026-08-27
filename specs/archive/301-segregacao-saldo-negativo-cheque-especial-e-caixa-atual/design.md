# Design: Segregação do Saldo Negativo (Cheque Especial) e Dedução Explícita no Caixa Atual (301)

## Arquitetura Técnica

```
Extratos OFX (10 Lojas)
    ├── Contas Positivas (8 lojas) ──────> Saldo Bancos Positivos (R$ 82.615,97) ─┐
    ├── Contas Negativas (2 lojas) ──────> Saldo Negativo / Cheque (R$ 22.040,20)  │
    ├── Dinheiro em Cofre ────────────────> Dinheiro em Lojas (R$ 4.902,00)         │
    ├── Maquininhas a Compensar ─────────> Cartões Rede D0 (R$ 7.231,41)           ├─> Ativos Totais (R$ ...)
    ├── Dinheiro MP ─────────────────────> Dinheiro MP (R$ ...)                    │         │
    ├── A Receber ───────────────────────> Recebíveis (R$ ...)                     │         │
    └── Carros em Pátio ─────────────────> Na Loja OS (R$ ...)                     │         │
                                                                                             │
                                Caixa Atual = Ativos Totais - Saldo Negativo <───────────────┘
```

## Interfaces TypeScript

```typescript
export interface DailyReconciliationSummary {
  date: string;
  is_closed: boolean;
  saldo_bancos_positivo: number;
  saldo_negativo_itau: number;
  saldo_bancos_ofx: number;
  dinheiro_em_lojas: number;
  cartoes_a_compensar: number;
  total_saldo_banco: number;
  dinheiro_mp: number;
  a_receber: number;
  na_loja_os: number;
  caixa_atual: number;
  caixa_anterior: number;
  fluxo_caixa: number;
}
```

## Fluxo de UI

1. **Card "SALDO BANCOS + DINHEIRO":**
   - Valor Principal: Saldos Positivos + Cofre + Rede a Compensar.
   - Sub-chips:
     - `Bancos Positivos (8 contas): R$ 82.615,97`
     - `+ Cofre: R$ 4.902,00`
     - `+ Rede: R$ 7.231,41`
     - `(-) 2 Contas Negativas: R$ 22.040,20` (Card em destaque vermelho claro)
2. **Hero Card "Caixa Atual":**
   - Valor Final: Total de Ativos - R$ 22.040,20.
   - Subtexto: `R$ [Ativos] - R$ 22.040,20 (Negativos)`.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1 (Dia 27/08):**
  - Contas Positivas = R$ 82.615,97
  - Contas Negativas = R$ 22.040,20
  - Cofre = R$ 4.902,00
  - Rede = R$ 7.231,41
  - Card de Bancos Positivo exibe R$ 94.749,38
  - Pill Negativo exibe R$ 22.040,20
  - Caixa Atual subtrai os R$ 22.040,20 no total final.
