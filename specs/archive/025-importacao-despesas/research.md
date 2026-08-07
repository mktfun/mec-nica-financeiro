# Research: ImportaçÁo de Contas a Pagar & Despesas

## 1. Escopo e Objetivos
- O usuário precisa importar relatórios do ERP legado para o sistema de conciliaçÁo financeira.
- O foco atual é a "ImportaçÁo de Contas a Pagar" e outros custos, como "Juros Rede" (antecipaçÁo D+1 de cartÁo).
- O sistema precisará interpretar planilhas em formatos `.xls` (antigos) e `.xlsx`.

## 2. Análise dos Arquivos de Referência
Foram analisados arquivos de amostra disponibilizados em `C:\Users\User\Downloads\concilia`:

### A. BuscaContasAPagar.xls
- Formato: Excel (`.xls`), provavelmente exportado de um ERP.
- Estrutura:
  - Linha 2: Cabeçalho com o nome de uma loja e o período de filtro.
  - Linha 3: Cabeçalhos reais das colunas: `Emp`, `Código`, `Parc`, `Cliente/Fornecedor`, `DescriçÁo`, `Tipo`, `Dt. Vecto`, `Dt. PrevisÁo`, `Vl. a Pagar`, `Status`, `Dt. Pgto`, `Vl. Pago`.
  - Coluna `Emp` contém identificadores de lojas que diferem dos nomes no webapp (ex: `MPpiraporinha`, `MPrudge`, `MPMaster`, `ReiDoModulo`).
- Regra de Negócio: O usuário solicitou que, durante a importaçÁo, o sistema identifique as lojas (`Emp`) do arquivo e ofereça uma interface para **mapear/vincular** essas lojas com as lojas cadastradas no banco de dados (`stores`).
- Regra da "Loja Master": A loja Master centraliza custos. Ela terá lançamentos de saída (contas a pagar), mas é esperado que nÁo tenha receita (vendas).

### B. JUROS REDE.xlsx
- Formato: Excel (`.xlsx`).
- Estrutura (Despadronizada):
  - É um relatório montado em abas horizontais na mesma planilha (ex: blocos para STONE, separados por loja).
  - Linhas 4: Trazem o nome da loja (ex: `PIRAPORINHA`, `PLANALTO`, `Rudge`).
  - Linha 5: Cabeçalhos repetidos para cada bloco de loja: `Tipo`, `Valor Bruto`, `Valor Liquido`, `taxa juros`, `valor cobrado`.
- Regra de Negócio: Os "Juros Rede" sÁo as taxas pagas pela antecipaçÁo de recebíveis (D+1). O valor a ser lançado no sistema como "despesa" ou "custo financeiro" é o `valor cobrado`.

### Outros Arquivos (CAP 0306.xls, DP 0306.xls, etc)
- SÁo relatórios individuais por unidade (provavelmente de fechamento de OS vs Financeiro, ou caixas).
- O pedido focou primordialmente no contas a pagar global (BuscaContasAPagar) e custos agregados (Juros Rede).

## 3. Desafios Técnicos e Abordagem
- **Parsing de Excel no Client-side:** Em vez de mandar o arquivo cru pro backend, o frontend (React) lerá o arquivo usando `xlsx`, extrairá os dados brutos e montará um JSON.
- **Workflow em 3 Passos (Wizard):**
  1. Upload do Arquivo (Drag & Drop, detectando o tipo do arquivo automaticamente).
  2. Mapeamento Inteligente: A UI detecta entidades nÁo mapeadas (Lojas do ERP vs Lojas do DB) e pede ao usuário para selecionar o de/para. O sistema deve salvar essas preferências para o futuro.
  3. RevisÁo e EfetivaçÁo: Mostra um sumário do que será inserido (X despesas de Y lojas no valor de R$ Z).
- **IntegraçÁo no Banco de Dados:**
  - O Supabase já possui uma tabela `transactions` com tipo `in` e `out`.
  - As Contas a Pagar e os Juros serÁo lançados como `out` na tabela `transactions`, com uma categoria ou tag específica (ex: `contas_pagar`, `juros_rede`).

## 4. Referências e Tendências de Design (2026)
- **Visual:** Wizard de importaçÁo em estilo Liquid Glass. Modais expansivos, drag and drop com microinterações (bordas brilhantes on-drag), e Skeleton loaders preditivos durante o processamento (segundo diretrizes da spec `ux-ui-architect-2026`).
- **InspiraçÁo:** Fluxos de importaçÁo do Notion ou ContaAzul, onde o pareamento de dados é indolor e acompanhado de validaçÁo em tempo real.
