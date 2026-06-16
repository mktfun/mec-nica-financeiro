# Tasks: Refinamento UX Importação (052)

## 1. Melhoria Visual do Mapeamento (Wizard)
- `[ ]` No `CentralImportWizard.tsx`, extrair um dicionário de `aliasContext` com base em `results.ofxResults`, associando o `alias` a `fileName` e as duas primeiras transações.
- `[ ]` Atualizar a renderização do `unmappedAliases.map(...)` para exibir um `Badge` ou texto de apoio cinza abaixo do select, mostrando o contexto: "Origem: X.ofx" e "Transações: PGTO REDE, ..."

## 2. Limpeza Visual (`importacoes.tsx`)
- `[ ]` Em `importacoes.tsx`, remover o bloco HTML contendo o `<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">` com as antigas opções ("Pátio / OS", "Extrato Bancário", "Despesas", "Juros Rede").
- `[ ]` Adicionar um estado inicial amigável (Empty State ou Hero banner) que direcione a ação puramente para a "Central de Importação".
- `[ ]` Remover links e navegações legadas que ficaram órfãs da tela de importações.
