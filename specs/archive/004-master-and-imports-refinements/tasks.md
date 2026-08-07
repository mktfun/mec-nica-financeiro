# Tasks: Master & Import Refinements

- [ ] 1. Corrigir CategorizaçÁo de Despesas
  - Abrir `src/lib/parsers/contasAPagarParser.ts`.
  - Escanear o header row por "Categoria", "ClassificaçÁo", "Plano de Contas", etc.
  - Usar esse valor para `expense.category`. Se nÁo encontrar nenhuma coluna de categoria, usar o valor da coluna "DescriçÁo" como categoria (agrupando por fornecedor/descriçÁo).

- [ ] 2. ExtraçÁo Inteligente de Nome da Loja nas OSs
  - Abrir `src/hooks/useOsImportProcessor.ts`.
  - Adicionar heurística em `processOsFiles`: Ler as primeiras 5 a 10 linhas da planilha antes dos cabeçalhos reais.
  - Procurar por "Loja", "Empresa", "Unidade", ou pegar o nome do arquivo, mas fazendo parsing (`fileName.replace(/^\d+_/, '')`) para remover códigos de sistema (ex: limpar "1675_" do nome). O alias deve ser preenchido preferencialmente pela extraçÁo do interior do arquivo ou pelo filename limpo.

- [ ] 3. Dashboard "Master" Personalizado
  - Modificar `src/routes/loja.$lojaId.tsx`.
  - Checar se `store.is_matriz` é verdadeiro.
  - Se sim, esconder a div contendo `Carros no Pátio`, `Faturamento` e `ConciliaçÁo Automática`. Ocultar qualquer mençÁo a OS na renderizaçÁo da Tabela de Extrato. Focar apenas em "Entradas", "Saídas" e "Saldo Global".

- [ ] 4. Limpeza da Tela ConciliaçÁo Diária
  - Abrir `src/routes/conciliacao.tsx`.
  - Localizar e remover o bloco que mapeia `<Card>` para as 10 lojas na base da página (o grid que polui a visÁo).
  - Deixar o layout focando apenas no Overview e nos Alertas/Divergências.
