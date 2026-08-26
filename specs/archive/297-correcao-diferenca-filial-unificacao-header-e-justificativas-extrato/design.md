# Design: Correção da Diferença por Filial, Header Unificado e Justificativas de Extrato (297)

## Regra de Negócio: O Que é a Diferença da Loja?

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              CONCILIAÇÃO DA FILIAL                                     │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. MAQUININHAS REDE (D0)   ➔ Vendas do dia ficam como [A COMPENSAR]                    │
│ 2. CRÉDITO REDE (D-1)      ➔ Entradas bancárias do dia identificadas como [LOTE REDE]  │
│ 3. PIX DE CLIENTES         ➔ Entradas bancárias identificadas por [OS #]               │
│ 4. OUTRAS ENTRADAS/SAÍDAS  ➔ Categorizadas com [JUSTIFICATIVA MANUAL]                  │
│                                                                                        │
│ ➔ DIVERGÊNCIA REAL = Transações do extrato que ainda estão ÓRFÃS / SEM JUSTIFICATIVA   │
│   Se todas tiverem OS, Lote Rede ou Justificativa ➔ DIFERENÇA = R$ 0,00 (100% OK)      │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

## Header da Filial em `conciliacao.$lojaId.tsx`

Substituir o banner de 4 cards pelo Card Executivo com as 6 métricas:
1. **Saldo Bancos + Cartões** (OFX + Maquininha)
2. **Maquininha** (Rede Líquido)
3. **PIX** (PIX em Conta)
4. **Na Loja OS** (Pátio Aberto)
5. **Previsto** (Total Previsto)
6. **Diferença / Status** (100% Conciliado ou Pendência real)

## Cenários de Teste

- **Cenário 1 (Jabaquara com Lote Rede D-1 Identificado):**
  - Consultar Jabaquara em 26/08/2026.
  - *Resultado:* Diferença = R$ 0,00 (100% Conciliado). Falsa diferença de R$ 5.615,16 eliminada.
- **Cenário 2 (Justificar Transação no Extrato):**
  - Aplicar justificativa a uma transação de extrato.
  - *Resultado:* `manual_category` salvo em `ofx_transactions` e `transactions`, pendência sai da diferença imediatamente.
- **Cenário 3 (Header da Página da Filial):**
  - Acessar `/conciliacao/st-02?date=2026-08-26`.
  - *Resultado:* Exibe o card unificado de Fechamento por Filial com as 6 métricas claras.
