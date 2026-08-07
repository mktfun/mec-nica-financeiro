# Design: Painel Módulo 1 (Aba SALDO Consolidada por Loja) e IntegraçÁo dos Módulos 1-4 (conciliacao-modulo-saldo-completo)

## Diagrama da Cadeia de Cálculos do Módulo 1 (Aba SALDO)

```
 [Banco Itaú (OFX)]      [Dinheiro (Loja)]     [A Receber (Módulo 3)]    [Na Loja (OSs Módulo 2)]
         │                      │                        │                          │
         ▼                      ▼                        ▼                          ▼
  ┌──────────────┐       ┌──────────────┐         ┌──────────────┐           ┌──────────────┐
  │ SALDO (G13)  │       │DINHEIRO MP   │         │ A RECEBER    │           │ NA LOJA      │
  │ (Soma Itaú)  │       │ (Fórmula)    │         │ (Recebíveis) │           │ (OS Pendente)│
  └──────┬───────┘       └──────┬───────┘         └──────┬───────┘           └──────┬───────┘
         │                      │                        │                          │
         └──────────────────────┼────────────────────────┴──────────────────────────┘
                                │
                                ▼
                   ┌──────────────────────────┐
                   │   SALDO TOTAL (G17)      │ = G13 + G14 + G15 + G16
                   └────────────┬─────────────┘
                                │ - Limite (G18)
                                ▼
                   ┌──────────────────────────┐
                   │    CAIXA ATUAL (G21)     │ = G17 - G18
                   └────────────┬─────────────┘
                                │ - Caixa Anterior (G22)
                                ▼
                   ┌──────────────────────────┐
                   │    FLUXO CAIXA (G23)     │ = G21 - G22
                   └──────────────────────────┘

 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │ CALCULO DE RESULTADO E CONTAS DISPONÍVEIS                                               │
 ├────────────────────────────────────────────────────────────────────────────────────────┤
 │ FATURAMENTO ATUAL (G27) = (Faturamento Atual - Anterior) + Seguro/Sinistro + Juros     │
 │ DISPONÍVEL P/ CONTAS (G29) = FATURAMENTO ATUAL (G27) - FLUXO CAIXA (G28)              │
 │ RESULTADO FINAL (G31)      = DISPONÍVEL P/ CONTAS (G29) - VALOR DAS CONTAS (G30)      │
 └────────────────────────────────────────────────────────────────────────────────────────┘
```

## Estrutura de Tipos TypeScript (`src/types/modulo1.ts`)

```typescript
export interface StoreSaldoState {
  store_id: string;
  store_name: string;
  saldo_banco_itau: number;
  limite_credito: number;
  cartao_entrou: number;
  cartao_nao_entrou: number;
  dinheiro_loja: number;
  a_receber: number;
  na_loja_os: number;
  faturamento_atual: number;
  faturamento_anterior: number;
  seguro_sinistro: number;
  juros_atual: number;
  caixa_anterior: number;
  valor_contas: number;
}

export interface Modulo1Calculated {
  saldo_g13: number;          // Soma Banco Itaú
  dinheiro_mp_g14: number;    // Soma dinheiro + nÁo entrou + boletos
  a_receber_g15: number;      // Soma Módulo 3
  na_loja_g16: number;        // Soma OSs em aberto
  saldo_total_g17: number;    // G13+G14+G15+G16
  caixa_atual_g21: number;    // G17 - Limite
  fluxo_caixa_g23: number;    // G21 - G22
  faturamento_g27: number;    // (FatAtual - FatAnt) + Seguro + Juros
  disponivel_contas_g29: number; // G27 - G23
  resultado_final_g31: number;   // G29 - G30 (Saldo livre real)
}
```

## FunçÁo de Cálculo Central (`src/lib/modulo1Calculations.ts`)

```typescript
export function calculateModulo1Saldo(stores: StoreSaldoState[]): {
  storesCalculated: Record<string, Modulo1Calculated>;
  globalCalculated: Modulo1Calculated;
} {
  let globalG13 = 0;
  let globalG14 = 0;
  let globalG15 = 0;
  let globalG16 = 0;
  let globalLimite = 0;
  let globalCaixaAnt = 0;
  let globalFatAtual = 0;
  let globalFatAnt = 0;
  let globalSeguro = 0;
  let globalJuros = 0;
  let globalContas = 0;

  const storesCalculated: Record<string, Modulo1Calculated> = {};

  stores.forEach(st => {
    const g13 = st.saldo_banco_itau;
    const g14 = st.dinheiro_loja + st.cartao_nao_entrou + st.a_receber;
    const g15 = st.a_receber;
    const g16 = st.na_loja_os;
    const g17 = g13 + g14 + g15 + g16;
    const g21 = g17 - st.limite_credito;
    const g23 = g21 - st.caixa_anterior;
    const g25 = st.faturamento_atual - st.faturamento_anterior;
    const g27 = g25 + st.seguro_sinistro + st.juros_atual;
    const g29 = g27 - g23;
    const g31 = g29 - st.valor_contas;

    storesCalculated[st.store_id] = {
      saldo_g13: g13,
      dinheiro_mp_g14: g14,
      a_receber_g15: g15,
      na_loja_g16: g16,
      saldo_total_g17: g17,
      caixa_atual_g21: g21,
      fluxo_caixa_g23: g23,
      faturamento_g27: g27,
      disponivel_contas_g29: g29,
      resultado_final_g31: g31,
    };

    globalG13 += g13;
    globalG14 += g14;
    globalG15 += g15;
    globalG16 += g16;
    globalLimite += st.limite_credito;
    globalCaixaAnt += st.caixa_anterior;
    globalFatAtual += st.faturamento_atual;
    globalFatAnt += st.faturamento_anterior;
    globalSeguro += st.seguro_sinistro;
    globalJuros += st.juros_atual;
    globalContas += st.valor_contas;
  });

  const globalG17 = globalG13 + globalG14 + globalG15 + globalG16;
  const globalG21 = globalG17 - globalLimite;
  const globalG23 = globalG21 - globalCaixaAnt;
  const globalG25 = globalFatAtual - globalFatAnt;
  const globalG27 = globalG25 + globalSeguro + globalJuros;
  const globalG29 = globalG27 - globalG23;
  const globalG31 = globalG29 - globalContas;

  return {
    storesCalculated,
    globalCalculated: {
      saldo_g13: globalG13,
      dinheiro_mp_g14: globalG14,
      a_receber_g15: globalG15,
      na_loja_g16: globalG16,
      saldo_total_g17: globalG17,
      caixa_atual_g21: globalG21,
      fluxo_caixa_g23: globalG23,
      faturamento_g27: globalG27,
      disponivel_contas_g29: globalG29,
      resultado_final_g31: globalG31,
    }
  };
}
```

## Componente UI `Modulo1SaldoPanel.tsx`

Componente React construído com o design system do projeto (`var(--bg-canvas)`, `var(--bg-surface-elevated)`, `var(--border-subtle)`, `<Card>`, `<Badge>`).
- Exibe o **Quadro Geral Consolidado da Aba SALDO** no topo da tela `/conciliacao`.
- Permite expandir o detalhamento individual por loja (Rei do Módulo, Planalto, Mauá, Kennedy, etc.) com inputs editáveis para Limite de Crédito e Caixa Anterior.

## Cenários de VerificaçÁo (SCAN → INFER → VERIFY → FIX)

- **Cenário 1 (Cálculo do Saldo Livre Real - Resultado Final G31):**
  - *Dados:* Loja Rei do Módulo: Banco Itaú R$ 19.957,99, Limite R$ 5.000,00, OSs Pendentes R$ 3.400,00, Faturamento R$ 45.000,00, Contas R$ 12.000,00.
  - *AçÁo:* Renderizar o painel do Módulo 1.
  - *Resultado Esperado:* O sistema calcula `SALDO TOTAL (G17)`, `CAIXA ATUAL (G21)` e `RESULTADO FINAL (G31)` aplicando as fórmulas exatas da planilha.

- **Cenário 2 (Baixa de OS e AtualizaçÁo Automática de 'NA LOJA' G16):**
  - *Dados:* OS de R$ 4.021,50 é conciliada e passa para `status = 'ENTROU'`.
  - *AçÁo:* Recarregar o painel.
  - *Resultado Esperado:* O valor pendente "Na Loja (G16)" cai R$ 4.021,50 e migra automaticamente para o Saldo Realizado do Banco/Caixa.
