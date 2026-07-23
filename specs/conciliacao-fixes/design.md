# Design: Correção de Match Aba 2 (REDE vs OFX) e Faturamento de OS na Aba 1 (conciliacao-fixes)

## Arquitetura Técnica

```
[Visão de Conciliação por Loja e Data]
       │
       ├──► Aba 1: OsVsRedeTable.tsx
       │     └─► useReconciliationViews()
       │           ├─► patio_os (Match por String(os_number))
       │           └─► Exibe Faturamento Real + Delta em R$
       │
       └──► Aba 2: RedeVsOfxTable.tsx
             └─► useReconciliationViews()
                   ├─► Filtra créditos de adquirente (REDE, MAST, ELO, VISA)
                   ├─► Pareia Líquido Maquininha (R$ 1.098,89) ↔ OFX Adquirente (R$ 1.098,89)
                   └─► Segrega "Outras Entradas no Banco" (PIXs avulsos)
```

## Componentes / Hooks Afetados

1. **`src/hooks/useConciliacao.ts` (`useReconciliationViews`):**
   - Atualiza a busca de `osInfo` para usar comparação de string agnóstica a tipos e prefixos.
   - Adiciona lógica de pareamento inteligente no retorno do `redeVsOfx`:
     - Separa `adquirenteTxs` (créditos de maquininha no OFX) de `outrasTxs` (PIXs e depósitos avulsos).
     - Calcula `redeTotalLiquido` e busca o match direto contra os créditos de adquirente ou combinações de depósitos de cartão.
     - Retorna `matchedAdquirenteOfx`, `outrasEntradasOfx`, `status` (`PAREADO` / `DIVERGENTE`) e `divergencia`.

2. **`src/components/conciliacao/RedeVsOfxTable.tsx`:**
   - Exibe o status da conciliação da maquininha baseado exclusivamente nos lançamentos de adquirente (ex: R$ 1.098,89 vs R$ 1.098,89 = **PAREADO**).
   - Renderiza uma seção dedicada para "Outros Lançamentos no Banco (PIX / Transferências)" para transparência total de saldo.

3. **`src/components/conciliacao/OsVsRedeTable.tsx`:**
   - Exibe o valor do Faturamento da OS formatado em BRL (mesmo se for R$ 0,00) sempre que houver OS vinculada.
   - Exibe o Delta formatado com sinal (+ / -) e cor indicativa (Verde para pareado, Amarelo para variação).

## Cenários de Verificação

### Cenário 1: Batimento do Líquido da Maquininha (Jabaquara)
- **Entrada:**
  - Rede (Líquido): R$ 537,17 + R$ 561,72 = R$ 1.098,89.
  - OFX (Banco): 4 lançamentos genéricos + 1 lançamento `RECEBIMENTO REDE MAST AT...` de R$ 1.098,89.
- **Resultado Esperado:**
  - Status: **PAREADO** (Líquido Maquininha: R$ 1.098,89 = Depósito Banco: R$ 1.098,89).
  - Outros 4 lançamentos do banco exibidos em "Outros Lançamentos no Banco" sem gerar falso alarme de "Sobra R$ 4.205,80".

### Cenário 2: Exibição do Faturamento da OS 341
- **Entrada:**
  - Rede (Bruto): R$ 570,00 pareado com a OS 341.
  - OS 341 no pátio: Valor faturado R$ 570,00.
- **Resultado Esperado:**
  - Faturamento Sistema (OS): **R$ 570,00**.
  - Delta: **R$ 0,00** (-).
  - OS Vinculada: **341 (Pareado)**.
