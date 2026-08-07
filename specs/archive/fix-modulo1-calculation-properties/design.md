# Design: Correção dos Nomes de Propriedade do Módulo 1 na Conciliação Diária (fix-modulo1-calculation-properties)

## Diagrama da Correção de Propriedades

```
[conciliacao.index.tsx]
       |
       |  Mapeamento Correto de StoreSaldoState:
       v
  {
    store_id: s.id,
    store_name: s.name,
    saldo_banco_itau: bankIn,        <-- Correção (antes: saldo_banco_itau_ofx)
    faturamento_atual: sys,           <-- Correção (antes: faturamento_sistema)
    dinheiro_loja: 0,
    dinheiro_mp_manual: 0,
    a_receber: recPendente,          <-- Correção (antes: a_receber_pendente)
    na_loja_os: osPendente,          <-- Correção (antes: na_loja_os_patio)
    limite_credito: s.credit_limit,   <-- Adicionado
    caixa_anterior: s.previous_caixa  <-- Adicionado
  }
       |
       v
[calculateModulo1Saldo(storesState)]
       |
       +---> globalCalculated.saldo_g13 (Soma do Banco)
       +---> globalCalculated.saldo_total_g17 (Banco + MP + A Receber + Na Loja)
       +---> globalCalculated.caixa_atual_g21 (Saldo Total - Limite)
       +---> globalCalculated.disponivel_contas_g29 (Faturamento - Fluxo)
       +---> globalCalculated.resultado_final_g31 (Saldo Livre Real Consolidado)
       |
       v
[ResumoDiaPanel.tsx] (Exibe os valores calculados nos cards)
```

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)

- **Cenário 1 (Batimento dos Cards do Módulo 1):**
  - *Ação:* Carregar a página `/conciliacao` com lançamentos de Apurado Sistema (R$ 28.760,81) e Entradas OFX (R$ 70.499,65).
  - *Resultado Esperado:* Os cards de SALDO BANCO ITAÚ, SALDO TOTAL, CAIXA ATUAL, DISPONÍVEL CONTAS e RESULTADO FINAL exibem os valores reais consolidados em vez de `R$ 0,00`.
- **Cenário 2 (Persistência do Dinheiro MP Manual):**
  - *Ação:* Inserir um valor manual no campo "DINHEIRO MP".
  - *Resultado Esperado:* Os campos Saldo Total, Caixa Atual e Resultado Final recalculam instantaneamente na tela.
