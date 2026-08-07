# Design: Reestruturação dos Cards de Fechamento por Loja e Resumo Diário Consolidado (redesign-conciliacao-cards-and-daily-summary)

## Arquitetura Técnica

```
[useDailyBankBalance(date)]  → reconciliations.bank_total (saldo real OFX por loja/data)
[useModulo1StoresData(date)] → transactions, patio_os, receivables por loja/data
[useConciliacaoResumo(date)] → totais globais do dia
         |
         ↓
[conciliacao.index.tsx]
  ├── ResumoDiaPanel (topo consolidado)
  │     ├── Faturamento Consolidado = ∑ faturamento_atual de todas as lojas
  │     ├── Maquininha = ∑ cartao_entrou de todas as lojas  
  │     ├── PIX = ∑ pix_os de todas as lojas (OSs pagas via PIX no dia)
  │     ├── Juros = ∑ juros_atual de todas as lojas
  │     ├── Saldo Itaú Consolidado = ∑ rawBalance OFX (último disponível, não zerado)
  │     └── Diferença = Faturamento - (Maquininha + PIX)
  └── Cards por Loja (6 colunas)
        ├── Faturamento (OS do dia)
        ├── Maquininha (Rede/cartão)
        ├── PIX (OS pagas via PIX que entraram no banco)
        ├── Na Loja OS (saldo em aberto das OSs)
        ├── Faturamento Itaú (OFX) → SALDO REAL (rawBalance)
        └── Diferença = Faturamento - (Maquininha + PIX)
```

## Mudanças nos Cards de Loja (`conciliacao.index.tsx`)

### Colunas a REMOVER:
- "Dinheiro MP" (sempre R$ 0,00, sem utilidade)
- "A Receber" (sempre R$ 0,00, sem utilidade)
- "Saldo Total" / "Resultado Final" → substituídos

### Novas 6 Colunas:
| # | Label | Fonte de Dados | Cor |
|---|-------|----------------|-----|
| 1 | Faturamento | `modulo1StoresData.faturamento_atual` | Branco |
| 2 | Maquininha | `modulo1StoresData.cartao_entrou` | Teal |
| 3 | PIX | `modulo1StoresData` → `patio_os.pix_transfer_value` somado | Azul |
| 4 | Na Loja OS | `modulo1StoresData.na_loja_os` | Amarelo |
| 5 | Banco Itaú (Saldo) | `bankBalances[store.id].rawBalance` | Azul Claro |
| 6 | Diferença | `faturamento - (maquininha + pix)` | Verde/Vermelho |

## Correção do Saldo OFX Consolidado (`useDailyBankBalance`)

**Problema:** O hook busca `reconciliations.bank_total` exatamente na data selecionada. Se não houver importação OFX naquele dia, retorna vazio → saldo zero.

**Correção:** Adicionar um novo hook `useLatestBankBalance()` que, para cada loja, busca o **último** `bank_total` importado sem restrição de data (usando `.order('date', { ascending: false }).limit(1)`).

## Adição de Métricas PIX nas OSs

**Problema:** O hook `useModulo1StoresData` não calcula o total de PIX das OSs do dia (campo `pix_transfer_value` de `patio_os`).

**Correção:** Adicionar na query de `patio_os` o somatório de `pix_transfer_value` por loja, retornando o campo `pix_os` no `StoreSaldoState` (ou via campo separado na resposta do hook).

## Atualização do `ResumoDiaPanel.tsx` (Topo Consolidado)

Reformular o painel global para exibir:
- **Faturamento** (∑ faturamento_atual de todas as lojas)
- **Maquininha** (∑ cartao_entrou)
- **PIX** (∑ pix_os das OSs)
- **Juros** (∑ machine_fees/juros da conciliação do dia)
- **Saldo Total Itaú** (∑ rawBalance / último saldo OFX por loja)
- **Diferença** (Faturamento − Maquininha − PIX)

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)

- **Cenário 1 (Saldo Itaú não zerado em dia sem OFX):**
  - Estado inicial: Data selecionada sem importação OFX naquele dia.
  - Ação: Acessar `/conciliacao`.
  - Resultado Esperado: O saldo do Banco Itaú exibe o **último** saldo importado (não R$ 0,00).

- **Cenário 2 (Card de Loja com 6 colunas corretas):**
  - Estado inicial: Loja com OSs do dia, cartão Rede e PIX importados.
  - Ação: Visualizar card "Dom Pedro - DP" na lista de Fechamento por Loja.
  - Resultado Esperado: Exibição de Faturamento, Maquininha, PIX, Na Loja OS, Banco Itaú (Saldo) e Diferença; sem "Dinheiro MP" nem "A Receber".

- **Cenário 3 (Diferença calculada corretamente):**
  - Estado inicial: Faturamento = R$ 2.519,11, Maquininha = R$ 2.200,00, PIX = R$ 319,11.
  - Resultado Esperado: Diferença ≈ R$ 0,00 (casada); se não bater, exibe em vermelho.
