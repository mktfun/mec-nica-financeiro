# Spec Plan: Formato OFX em Tabela Canônica para Entradas e Saídas Órfãs na Importação (377)

## Tasks Atômicas

- [x] `[FRONTEND-CORE]` **Enriquecimento de Metadados OFX em `Step2NonRevenueJustifications.tsx`**
  - Atualizar `OFXEntry` para incluir `bankName`, `counterpartName`, `fitid`, `title`, `subtitle`.
  - Mapear corretamente estes campos ao ler do Supabase (`dbOutflows` / `dbInflows`) e da pré-visualização em memória (`results.ofxResults`).
  - *Critério de Verificação*: Cada entrada e saída contém os dados completos do extrato bancário preservados.

- [x] `[FRONTEND-CONTROLS]` **Barra de KPIs e Controles de Topo**
  - Adicionar cards/badges com valor monetário total das movimentações órfãs (Total R$ Saídas e Total R$ Entradas).
  - Implementar barra de busca instantânea por texto (descrição, favorecido, FITID, valor).
  - Implementar seletor dropdown de filial para filtrar lançamentos de uma loja específica.
  - Implementar filtro por status: `Todas`, `Pendentes`, `Classificadas / Salvas`.
  - *Critério de Verificação*: Filtros funcionam de forma reativa e instantânea na tela.

- [x] `[FRONTEND-TABLE]` **Grid de Dados OFX Canônico (Estilo Extrato do Sistema)**
  - Substituir a lista de cards verticais por tabela `<table>` em Dark UI Zinc-950 compatível com o design system.
  - Colunas: `Filial`, `Data`, `Descrição / Histórico Bancário`, `Favorecido / Documento / FITID`, `Valor (+/- R$)`, `Status / Destinação`, `Ações`.
  - Tipografia mono para valores monetários (`text-rose-400` para débito, `text-emerald-400` para crédito).
  - Badges compactos para categorias atribuídas e impacto contábil.
  - *Critério de Verificação*: As transações órfãs são exibidas em grade densa e legível igual ao extrato bancário.

- [x] `[FRONTEND-ACCORDION]` **Painel Expansível de Classificação Inline**
  - Ao clicar em "Classificar" ou "Editar", expandir gaveta diretamente sob a linha da tabela (`<tr><td colSpan={7}>`).
  - Apresentar chips de categoria rápida de 1-clique, dropdown de contas em aberto e switch de impacto contábil.
  - Ao salvar, recolher a gaveta suavemente e atualizar a linha com status "Salvo".
  - *Critério de Verificação*: O usuário classifica qualquer lançamento sem perder a visão das demais linhas do extrato.

- [x] `[BUILD-GATE]` **Auditoria de Build TypeScript e Validação Visual**
  - Executar `cmd.exe /c "npm run build"` e garantir 0 erros de compilação.
  - *Critério de Verificação*: Build executado com sucesso e tela acessível sem erros em `http://localhost:8080/`.
