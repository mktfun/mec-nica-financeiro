# Proposal: Refatoração de Configurações e Consolidação de Custos no Financeiro (Spec 201)

## Problema
A tela de Engenharia de Preços (`financeiro.tsx`) apresentava inconsistências entre a digitação pontual de custos (como embalagem isolada por prato) e o cálculo global de markup divisor e margem líquida. O usuário solicitou que a tela de `/configuracoes` seja o ponto central definitivo de todas as variáveis financeiras da loja (incluindo custos adicionais operacionais por canal e parâmetros de rateio), e que a tela `/financeiro` atue como um simulador inteligente e transparente, onde os custos de produção (CMV), custos fixos rateados e embalagens/custos adicionais já cheguem somados e totalizados por produto, garantindo que o cálculo de preço sugerido e margem real nunca dê distorções ou margens incoerentes.

## Solução Proposta
1. **Configurações Centralizadas (`configuracoes.tsx`):**
   - Centralizar e organizar os cartões de parâmetros em `/configuracoes`:
     - Faturamento Mensal Médio (R$)
     - Custo Fixo Geral (R$), Custo Fixo Salão (R$), Custo Fixo Delivery (R$)
     - Volume de Pedidos/Mês: Salão/Mesa, iFood, App 99, Keeta
     - Impostos (%) e Taxas de Operação (Maquininha, iFood, 99, Keeta)
     - Margem de Lucro Alvo (%)
2. **Consolidação e Transparência de Custos em `/financeiro`:**
   - Composição de Custo Total por Linha de Produto:
     - `CMV (Ficha Técnica)`: Soma dos insumos cadastrados no catálogo.
     - `Custo Fixo Rateado (Salão/Delivery)`: Calculado dinamicamente via volume mensal de pedidos ou percentual de rateio.
     - `Embalagem`: Valor unitário do produto.
     - `Custo Total Salão (R$) = CMV + Custo Fixo Salão + Embalagem`
     - `Custo Total Delivery (R$) = CMV + Custo Fixo Delivery + Embalagem`
3. **Motor Matemático 100% Sinérgico:**
   - **Preço Sugerido (Markup Divisor Fechado):**
     - `Sugerido Mesa = Custo Total Salão / (1 - (Imposto + Maquininha + Margem Alvo))`
     - `Sugerido Canal = Custo Total Delivery / (1 - (Imposto + Taxa Canal + Margem Alvo))`
   - **Simulador de Margens Reais por Canal:**
     - `Despesas Variáveis (R$) = Preço Praticado * (Imposto + Taxa Canal)`
     - `Lucro Líquido Real (R$) = Preço Praticado - Despesas Variáveis - Custo Total`
     - `Margem Real (%) = (Lucro Líquido Real / Preço Praticado) * 100`
4. **Exportação Excel (`exceljs`):**
   - Espelha com exatidão a tabela visual: colunas de CMV, Custo Fixo, Embalagem, Custo Total, Preços Sugeridos (Mesa/iFood/99/Keeta) e Simulador com Margens Reais calculadas.

## Contratos de Dados
- **Tabela `public.stores`:**
  - `faturamento_mensal` (numeric)
  - `custo_fixo_mensal` (numeric)
  - `custo_fixo_salao` (numeric)
  - `custo_fixo_delivery` (numeric)
  - `pedidos_mesa` (integer)
  - `pedidos_ifood` (integer)
  - `pedidos_99` (integer)
  - `pedidos_keeta` (integer)
  - `imposto_percent` (numeric)
  - `taxa_maquininha_percent` (numeric)
  - `taxa_ifood_percent` (numeric)
  - `taxa_99_percent` (numeric)
  - `taxa_keeta_percent` (numeric)
  - `margem_ideal_percent` (numeric)
- **Tabela `public.products`:**
  - `packaging_cost` (numeric)
  - `price` (numeric - Mesa/Balcão)
  - `price_ifood` (numeric)
  - `price_99` (numeric)
  - `price_keeta` (numeric)

## Riscos & Mitigações
- **Divisor <= 0 (Margem Inviável):** Se a soma de (Imposto + Taxas + Margem Alvo) >= 100%, o divisor de markup fica negativo ou zero. Mitigado retornando `Inviável` visualmente e no Excel.
- **Divisão por zero em pedidos:** Se o número total de pedidos for 0, o sistema usa fallback gracioso para o rateio percentual sobre faturamento (`custo_fixo_mensal / faturamento_mensal`).

## Critérios de Sucesso
- Parâmetros da loja salvam com feedback visual reativo em `/configuracoes`.
- A tabela de `/financeiro` exibe a decomposição clara de custos (CMV, Fixo, Embalagem e Total).
- Preços sugeridos e margens calculadas batem centavo por centavo com a realidade contábil.
- Exportação em `.xlsx` formatada e consistente.
- Build do Vite passa com zero erros de tipagem.
