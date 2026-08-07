# Research: Master & Import Refinements

## 1. Contexto Atual
O sistema passou por uma grande refatoraçÁo de layout de lojas e lógicas de importaçÁo (Specs 001 a 003). No entanto, o usuário levantou 4 pontos cruciais que precisam ser refinados:

1. **Bug nas Categorias de Despesa:**
   - **Problema:** Todas as saídas importadas estÁo sendo registradas sob a categoria genérica `"contas_pagar"`.
   - **Causa:** No arquivo `src/lib/parsers/contasAPagarParser.ts`, a propriedade `category` está hardcoded como `'contas_pagar'`.
   - **SoluçÁo:** O parser precisa identificar uma coluna real de "Categoria", "ClassificaçÁo" ou "Plano de Contas" no Excel, ou usar a coluna "DescriçÁo" como fallback primário para categorizaçÁo. Isso permitirá que o gráfico de pizza do Dashboard da Loja distribua as despesas corretamente.

2. **Dificuldade no Mapeamento de OS:**
   - **Problema:** Ao importar planilhas de OS (ex: `1675_ConferenciaOSxFinanceiro.xls`), o Wizard de ImportaçÁo exibe esse nome obscuro no Step de Mapeamento. O usuário nÁo sabe identificar a qual loja pertence o código "1675".
   - **Causa:** Diferente do parser de Contas a Pagar (que procura a coluna "Emp"), o `useOsImportProcessor.ts` nÁo tenta extrair o nome da loja de dentro do arquivo.
   - **SoluçÁo:** Precisamos adicionar uma lógica ao `useOsImportProcessor.ts` para inspecionar as primeiras linhas do Excel e buscar o nome explícito da loja (que deve estar em alguma célula de cabeçalho do relatório) e usá-lo como "Alias" no mapeamento inteligente, igual ocorre em `importacoes-despesas.tsx`.

3. **Tela de ConciliaçÁo Diária (Ainda Exibindo Grid de Lojas):**
   - **Problema:** A tela em `/conciliacao` nÁo mudou plenamente para o conceito de "Resultado Consolidado e detecçÁo automática de divergências" conforme esperado nas specs Revolut UI anteriores.
   - **Causa:** O código ainda exibe uma lista exaustiva de lojas.
   - **SoluçÁo:** Focar a `conciliacao.tsx` puramente na Master (Totais globais, Card Hero de divergência, Alertas). As métricas devem ser totalmente focadas na saúde financeira consolidada do dia, sem listar 10 caixas individuais (essas já têm seu lugar em Lojas).

4. **Dashboard Dedicado para a "Master" (Centro de Custos):**
   - **Problema:** O usuário precisa de uma visÁo detalhada para a entidade Master, mas que nÁo se comporte como uma loja mecânica normal (ou seja, nÁo possui lógica de OSs e Pátio, apenas despesas e entradas globais).
   - **Causa:** A rota `/loja/$lojaId` foi desenhada presumindo que toda entidade é uma Oficina.
   - **SoluçÁo:** Criar uma rota ou condicionar a rota atual para que, se `store.is_matriz` for true, a UI oculte as abas de Pátio, Carros e OS, exibindo um Dashboard Analítico focado puramente em Fluxo de Caixa Global e Despesas Operacionais (DRE sintético).

## 2. Decisões Arquiteturais
- **Parser de Excel:** O `xlsx` será ajustado no client-side para escanear células específicas em busca do título da loja (ex: procurar nas primeiras 5 linhas por algum texto que se pareça com o nome da filial).
- **Stitch MCP UI:** A tela da Master usará o mesmo componente de base, mas com um Early Return de renderizaçÁo diferente focado em Corporativo.
