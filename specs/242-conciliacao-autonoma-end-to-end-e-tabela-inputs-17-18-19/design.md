# Design Document — Spec 242: Correção dos Cálculos da Conciliação, Modais e Regras de Oficina Inteligente

## 1. Contexto e Problema
Na conciliação financeira diária, três desafios estruturais foram identificados e resolvidos:
1. **Faturamento Oficina Inteligente:** O sistema gerava `-R$ 0,82` devido à falta de sincronização entre o faturamento acumulado e diário. O termo "Odômetro" foi substituído pela nomenclatura oficial do negócio: **`Faturamento Oficina Inteligente`**.
2. **Dinheiro Recebido em OSs da Oficina Inteligente:** O dinheiro físico recebido na loja (declarado na OS) não cai no banco no mesmo dia. Como já compõe o Faturamento da Oficina Inteligente, deve somar ao Pilar 1 (Saldo) como "Dinheiro a Compensar" para o Caixa não ficar com buraco. Quando depositado no banco nos dias seguintes, muda para "ENTROU NO BANCO" e sai de "A Compensar", impedindo duplicação.
3. **Pátio (Na Loja OS):** Divergência de ~11 mil reais resolvida com a eliminação de 6 OSs fantasmas/duplicadas em Kennedy, migração de 2 OSs para Rudge Ramos, registro de PIX de R$ 2.264,89 na OS 1092 de Jorge Beretta e finalização da OS 583 de Dom Pedro, atingindo exatamente **R$ 100.153,69** (100% igual ao manual).
4. **Modais de Vinculação e Edição:** Criado o `PatioOsDetailModal.tsx` com edição inline de OSs e ampliados os modais de conciliação para `size="2xl"` (max-w-6xl).

## 2. Arquitetura das Soluções

### A. Faturamento Inteligente (Oficina Inteligente)
- Se o usuário preencher o **Faturamento Acumulado** (ex: R$ 683.288,89), o faturamento líquido diário é $\text{Acumulado Atual} - \text{Acumulado Anterior}$.
- Se preencher o **Faturamento do Dia** (ex: R$ 73.813,07), o sistema calcula o acumulado equivalente para persistência no `daily_snapshots`.

### B. Saldo Consolidado no Pilar 1
$$\text{Saldo Consolidado} = \text{Saldo Bancos (OFX)} + \text{Cartões a Compensar (Rede)} + \text{Dinheiro em Loja a Compensar (OS)}$$

### C. PatioOsDetailModal
- Permite listar, filtrar e editar inline `total_value`, `paid_value` e `status` diretamente na tabela `patio_os`.

## 3. Validação do Fechamento Real (19/08)
- **Saldo Bancos + Não Entrou:** R$ 152.608,71
- **Dinheiro MP (Matriz):** R$ 8.466,00
- **A Receber:** R$ 10.694,50
- **Na Loja OS:** R$ 100.153,69
- **Caixa Atual:** R$ 271.922,90
- **Caixa Anterior (18/08):** R$ 316.215,85
- **Fluxo de Caixa:** -R$ 44.292,95
- **Faturamento do Dia:** R$ 73.813,07
- **Valor Disp. Contas:** R$ 118.106,02
- **Valor das Contas:** R$ 118.106,68
- **Diferença Final:** **-R$ 0,66** (Status: Aprovado ✅)
