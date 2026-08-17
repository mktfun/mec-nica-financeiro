# Design: Auditoria Clara de Liquidação Bancária para Cartões e PIX de Ordens de Serviço (223)

## Arquitetura de Componentes

### 1. `PixVsOfxTable.tsx`
- **Coluna "Lançamento OFX (Banco)":**
  - Quando pareado: Exibe Nome da Contraparte, Descrição OFX, Data/Hora e Valor do PIX no banco.
  - Quando pendente: Exibe alerta *"Nenhum PIX correspondente encontrado nesta data"*.
- **Coluna "Status & Ações":**
  - Se confirmado: Badge verde `✅ Entrou no Banco` + Botão sutil `Desvincular`.
  - Se pendente: Badge amarelo `⚠️ Pendente OFX` + Botão de ação `Vincular Extrato`.

### 2. Modal `LinkOfxToOsModal.tsx` / `ManualMatchOsModal.tsx`
- Permitir vincular em ambas as direções:
  - De uma **Transação Bancária** para uma **OS** (já implementado).
  - De uma **OS Pendente** para uma **Transação Bancária do Extrato** (novo fluxo inverso na tabela de PIX).

### 3. `OsVsRedeTable.tsx` e `RedeVsOfxTable.tsx`
- Indicador explícito de liquidação de cartão:
  - Se o lote da Rede foi depositado no Itaú no mesmo dia ou na data prevista de liquidação $\rightarrow$ Badge `✅ Liquidado no Banco`.
  - Se a data prevista de liquidação for futura $\rightarrow$ Badge `⏳ A Liquidar (Previsão: DD/MM)`.

## Cenários de Teste
1. **Cenário PIX Confirmado:** OS #1809 com PIX de R$ 150,00 mostra a contraparte exata e o status verde "Confirmado no Banco".
2. **Cenário PIX Pendente:** OS #1830 sem correspondente no banco permite clicar em "Vincular Extrato" para selecionar um PIX avulso do dia.
3. **Cenário Cartão Liquidado:** Vendas de cartão mostram se já foram liquidadas no lote do Itaú ou se estão aguardando compensação.
