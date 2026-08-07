# Proposal: Pareamento Agrupado de Conciliação, Modal de Detalhes da OS e Redesign de Cards (conciliacao-visual-grouping)

## Problema
1. **Faturamento Sistema (OS) Zerado (`R$ 0,00`) e Delta Incorreto na Aba 1:** A consulta a `patio_os` filtrava estritamente por `entry_date = date`. Se a OS foi aberta no dia anterior ou com formato de data diferente, o sistema não encontrava a OS, zerando o faturamento e exibindo deltas negativos falsos (ex: `Delta R$ -4.021,50`).
2. **Ausência de Detalhes da OS ao Clicar:** O usuário não conseguia clicar no número ou linha da OS para conferir a quebra de pagamentos (quanto foi em Cartão, PIX, Dinheiro, cliente e status).
3. **Falta de Associação Visual na Conciliação de Maquininha vs Banco (Aba 2):** As transações da máquina e depósitos do extrato apareciam em tabelas genéricas separadas. O usuário precisava calcular manualmente no papel que a soma de `R$ 3.652,33` + `R$ 330,38` resultava exatamente no depósito bancário de `R$ 3.982,71`.
4. **Cards de Status Fora do Padrão Visual:** Os cards do topo fugiam da paleta Dark UI (`bg-[#050711]`, bordas Zinc-800), e a conciliação de PIX da Aba 3 precisava do mesmo agrupamento direto.

## Solução Proposta
1. **Busca Abrangente de OSs por Loja em `useConciliacao.ts`:**
   - Remover a restrição rígida de `entry_date` em `patio_os`, permitindo localizar a OS vinculada pelo número (`os_number`) em qualquer data relevante.
2. **Modal / Drawer de Detalhes da Ordem de Serviço:**
   - Ao clicar no número da OS em qualquer aba, abrir um Modal com o detalhamento completo da OS:
     - Número, Cliente, Data, Status.
     - Valor Total vs Valor Pago.
     - Quebra de formas de pagamento (Cartão Crédito/Débito, PIX, Dinheiro) com indicação do status de pareamento de cada item.
3. **Cards Agrupados por Depósito Bancário na Aba 2 (`Maquininha Líquida -> Banco OFX`):**
   - Agrupar visualmente as vendas da maquininha dentro do card do depósito bancário OFX correspondente.
   - Exemplo visual claro: Exibir o depósito `RECEBIMENTO REDE MAST... R$ 3.982,71` com suas duas vendas filhas (`R$ 3.652,33` + `R$ 330,38`), mostrando a soma matemática exata e badge `100% PAREADO`.
4. **Agrupamento Direto por Valor/Cliente na Aba 3 (`PIX OS -> Banco OFX`):**
   - Parear entradas bancárias de PIX com as OSs do pátio com valor equivalente em PIX, com opção de vínculo manual se necessário.
5. **Redesign Cristalino dos Cards de Topo (Zinc-950 / Dark UI):**
   - Refatorar os cards de métricas de topo para o padrão visual Dark UI com badges neon de status de fechamento.

## Contratos de Dados
- Não há alterações no schema do Supabase. Mutações existentes em `conciliation_matches` continuam sendo utilizadas para armazenar vínculos.

## Features Existentes Impactadas
- `src/hooks/useConciliacao.ts` (`useReconciliationViews`)
- `src/routes/conciliacao.$lojaId.tsx`
- `src/components/conciliacao/OsVsRedeTable.tsx`
- `src/components/conciliacao/RedeVsOfxTable.tsx`
- `src/components/conciliacao/PixVsOfxTable.tsx`

## Risco Principal
Garantir que a lógica de agrupamento das vendas da maquininha (soma de N vendas para 1 depósito OFX) lide corretamente com dízimas decimais (diferenças de R$ 0,01 a R$ 0,05 em centavos de MDR).
