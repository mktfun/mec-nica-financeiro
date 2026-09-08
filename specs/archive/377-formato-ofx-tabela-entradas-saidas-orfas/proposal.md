# Proposal: Formato OFX em Tabela Canônica para Entradas e Saídas Órfãs na Importação (377)

## Problema
Na etapa de Justificativas de Movimentações por Loja (Step 2 / Step 5 do Wizard de Importação, componente `Step2NonRevenueJustifications.tsx`), as transações bancárias órfãs (tanto saídas quanto entradas) são renderizadas como **cartões verticais maciços** (`<Card className="p-4 ...">`). 
Quando há múltiplos lançamentos (ex.: 8 saídas órfãs e 4 entradas órfãs), a tela gera uma esteira vertical desmedida de formulários abertos que:
1. Não se parece em nada com o **extrato bancário OFX** com o qual o operador e o sistema financeiro trabalham (`StoreExtratoBancarioView.tsx`).
2. Dificulta a visão holística do fluxo de caixa e das movimentações entre filiais no mesmo dia.
3. Não possui controles de busca rápida por texto, filtro por filial ou filtros de pendência, obrigando o operador a rolar a página para cima e para baixo repetidamente.

## Solução Proposta (Foco em Reuso e Consistência com o Sistema)
Transformar a visualização de `Step2NonRevenueJustifications.tsx` para adotar a **Tabela de Extrato Bancário OFX Canônica**, idêntica à do extrato do sistema (`StoreExtratoBancarioView.tsx`):
1. **Grid de Dados OFX Denso e Estruturado**:
   - Tabela responsiva em Dark UI Zinc-950 com cabeçalho monospaçado: `Filial`, `Data`, `Descrição / Histórico Bancário`, `Favorecido / Documento / FITID`, `Valor (+/- R$)`, `Status / Destinação`, `Ações`.
   - Valores monetários em fonte tabular monospaçada (`text-rose-400` para débitos e `text-emerald-400` para créditos).
2. **Classificação Inline via Painel Expansível (Accordion Row)**:
   - Em vez de formulários permanentemente abertos ocupando a tela inteira, cada linha exibe seu status atual com Badge compacto.
   - Ao clicar no botão *"Classificar"* (ou *"Editar"*), a linha expande suavemente um sub-painel compacto (`<tr><td colSpan={7}>...</td></tr>`) com os chips de categorias rápidas (1-clique), dropdown de contas em aberto e o toggle de destinação contábil (Faturamento / Contas a Pagar vs Apenas Conciliar).
   - Ao salvar, a linha é atualizada instantaneamente e a gaveta se recolhe, fornecendo feedback visual imediato (`Salvo`) e liberando a visão do extrato.
3. **Controles de Auditoria de Topo**:
   - Barra de busca instantânea (descrição, favorecido, FITID, valor).
   - Filtro por Filial (dropdown com todas as lojas).
   - Filtro por Status (`Todas`, `Pendentes`, `Classificadas / Salvas`).
   - Cards de resumo no topo com o total em R$ de débitos e créditos órfãos e taxa de resolução.

## Investigação e Análise de Reuso
- **Componentes Existentes Reutilizados**:
  - `Step2NonRevenueJustifications.tsx`: Reaproveita 100% dos hooks, mutações e regras de persistência (`handleSaveOutflow`, `handleSaveInflow`, `updateOutflowState`, `updateInflowState`, integração com `daily_revenue_adjustments`, `ofx_transactions`, `daily_manual_bills`).
  - Estilos e padrões de tabela de `StoreExtratoBancarioView.tsx`: Consistência estética 1:1 com o extrato bancário oficial do sistema.
  - Componentes UI: `Card`, `Badge`, `Button`, `LoadingSpinner`, ícones `lucide-react` (`Calendar`, `Building2`, `Receipt`, `CreditCard`, `TrendingUp`, `TrendingDown`, `Filter`, `Search`, etc.).
- **Tabelas e Banco de Dados**:
  - **Zero migrações necessárias**. O schema atual de `ofx_transactions`, `daily_revenue_adjustments` e `daily_manual_bills` já atende perfeitamente à persistência de dados.

## Contratos de Dados & SQL
Nenhuma alteração de schema ou RPC necessária. O componente continuará consumindo as queries existentes `pending-ofx-outflows` e `pending-ofx-inflows` no Supabase.

## API & Componentes (Frontend)

### `[MODIFY]` `src/components/importacoes/wizard/Step2NonRevenueJustifications.tsx`
- Enriquecer o tipo `OFXEntry` para incluir `bankName`, `counterpartName`, `fitid`, `title`, `subtitle`.
- Implementar estado de filtros: `searchTerm`, `selectedStoreFilter` ('ALL' ou `storeId`), `statusFilter` ('all' | 'pending' | 'saved').
- Substituir o loop de cards verticais por:
  - Tabela canônica de extrato bancário com colunas `Filial`, `Data`, `Descrição Bancária`, `Favorecido / Doc / FITID`, `Valor`, `Status / Categoria`, `Ações`.
  - Linha expansível para edição/classificação contextual de cada lançamento.
- Implementar visualização dos chips de categoria e switches contábeis de forma compacta e organizada dentro da linha expandida.

## Risco Principal e Mitigação
- **Risco**: Perda de foco ou dificuldade de visualização em telas com muitas lojas.
- **Mitigação**: O dropdown de seleção de filial permite isolar os lançamentos de uma loja específica (ex.: focar só em Mauá ou só em Jorge Beretta), e a busca em tempo real filtra instantaneamente qualquer termo ou valor.
