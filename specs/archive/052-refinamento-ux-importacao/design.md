# Design: Refinamento UX Importação (052)

## 1. Mapeamento Enriquecido (AliasContext)
Atualmente o hook `useCentralImport` retorna uma array `ofxResults` com os dados extraídos. Para suportar o mapeamento inteligente, o objeto de resultado deve ser adaptado para incluir metadados adicionais, ou o UI do `CentralImportWizard` deve iterar sobre `results.ofxResults` para montar um contexto do alias.
**Mudança de Arquitetura UI:** 
Ao criar a lista `unmappedAliases`, não usaremos apenas arrays de strings. Criaremos um dicionário `aliasContext: Record<string, { filename: string, sample: string }>` onde o `sample` compila a descrição e o valor de 2 transações que existem dentro daquele extrato, e o `filename` indica a origem do dado.

## 2. Simplificação da UI (`importacoes.tsx`)
Deletaremos os seguintes elementos para focar a visão na nova UX:
- Remoção do grid de "Selecione uma Categoria" e componentes filhos que remetem às rotas antigas.
- O botão CTA da "Central de Importação" será transformado no Hero principal se não houver registros ou for o principal destaque antes da lista de importações históricas.

## 3. Prevenção de Regressão / Cenários (SDD Phase 4)
- **Cenário A:** Usuário arrasta 2 extratos de lojas diferentes do mesmo banco.
  - **SCAN:** O sistema exibe o nome dos 2 arquivos sob os respectivos campos de seleção de loja, mais amostras das transações, impedindo que o usuário confunda qual é qual baseado apenas na numeração da conta.
- **Cenário B:** Acesso puro a página `/importacoes`.
  - **SCAN:** Usuário apenas visualiza a Central Unificada, sem opções defasadas ("Importar Despesas", "Juros Rede" separadamente), impedindo fragmentação de dados.
