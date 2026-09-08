# Design: Formato OFX em Tabela Canônica para Entradas e Saídas Órfãs na Importação (377)

## 1. Arquitetura e Fluxo de Dados

```mermaid
flowchart TD
    subgraph Dados [Fontes de Dados OFX]
        DB[ofx_transactions Supabase]
        MEM[results.ofxResults Memória]
    end

    subgraph Enriquecimento [Mapeamento de Metadados OFX]
        DB & MEM --> EXTRACT[Mapeia OFXEntry com bankName, counterpartName, fitid, title]
    end

    subgraph Filtros [Barra de Auditoria e Filtros]
        EXTRACT --> SEARCH[Busca Textual: Descrição / Valor / FITID]
        EXTRACT --> STORE_FILTER[Filtro por Filial: Todas vs Específica]
        EXTRACT --> STATUS_FILTER[Filtro de Status: Todas vs Pendentes vs Salvas]
    end

    subgraph TabelaOFX [Visualização Canônica Estilo Extrato]
        SEARCH & STORE_FILTER & STATUS_FILTER --> TABLE[Tabela OFX: Filial | Data | Histórico | Favorecido/FITID | Valor | Categoria/Status | Ações]
    end

    subgraph AcaoClassificacao [Classificação Expansível Inline]
        TABLE -->|Clique em 'Classificar'| EXPAND[Accordion Row: Chips Categorias + Vínculo Contas Abertas + Switch Contábil]
        EXPAND -->|Salvar Destinação| SAVE[handleSaveOutflow / handleSaveInflow]
        SAVE -->|Update DB & Invalidate Cache| TABLE
    end
```

---

## 2. Interfaces TypeScript

```typescript
export interface OFXEntry {
  id: string;
  storeId: string;
  storeName: string;
  amount: number;
  description: string;
  date: string;
  fitid: string;
  type: 'in' | 'out';
  bankName?: string;
  counterpartName?: string;
  title?: string;
  subtitle?: string;
  matchedBillId?: string;
  matchedOsNumber?: string;
}

export interface FilterState {
  searchTerm: string;
  storeId: string; // 'ALL' ou storeId
  status: 'all' | 'pending' | 'saved';
}
```

---

## 3. Mutações em Arquivos Existentes [MODIFY]

### `src/components/importacoes/wizard/Step2NonRevenueJustifications.tsx`

1. **Enriquecimento de Campos no Mapeamento**:
   - Ao ler de `dbOutflows` / `dbInflows` e `results.ofxResults`:
     - Preservar `bank_name` como `bankName`.
     - Preservar `counterpart_name` como `counterpartName`.
     - Preservar `title` e `subtitle`.
     - Preservar `fitid`.

2. **Cabeçalho com KPIs e Controles**:
   - Total em R$ de Débitos Órfãos na aba Saídas.
   - Total em R$ de Créditos Órfãos na aba Entradas.
   - Badge de progresso (X de Y tratadas).
   - Input de busca textual (`lucide-react/Search`).
   - Select de filtro por filial (`lucide-react/Building2`).
   - Botões de filtro por status (`Todas`, `Pendentes`, `Salvas`).

3. **Renderização da Tabela OFX**:
   - Substituição dos cards verticais por `<table className="w-full text-xs">`.
   - Cabeçalho:
     - `Filial`: Tag/Badge com sigla da loja.
     - `Data`: `DD/MM/AAAA` com ícone de calendário.
     - `Descrição / Histórico Bancário`: Título com tooltip do texto completo.
     - `Favorecido / Documento`: `counterpartName` ou `fitid` em fonte mono.
     - `Valor`: `- R$ X,XX` (rose-400) ou `+ R$ X,XX` (emerald-400).
     - `Status / Destinação`: Badge dinâmico de categoria e destino contábil.
     - `Ações`: Botão *"Classificar"* / *"Editar"* ou ícone Chevron.

4. **Linha Expansível de Classificação (Accordion Row)**:
   - Quando `editingId === entry.id`, renderiza uma linha `<tr>` adicional com animação suave e layout compacto contendo:
     - Grade de chips de categorias rápidas com 1-clique.
     - Dropdown de contas em aberto da loja (para saídas).
     - Toggle de destinação contábil ("Adicionar ao Contas a Pagar?" / "Entra no Faturamento?").
     - Botão *"Salvar Destinação"* / *"Salvar Entrada"*.
     - Botão *"Fechar"* para recolher sem salvar.

---

## 4. Cenários de Verificação (SCAN → INFER → VERIFY → FIX)

### Cenário 1: Visualização de Saídas Órfãs em Tabela OFX
- **Estado Inicial**: 8 saídas órfãs na data 08/09/2026 (ex: débito de R$ 1.500,00 em Mauá, etc.).
- **Ação**: O usuário entra no Step 2 do wizard e clica na aba "Saídas Órfãs".
- **Resultado Esperado**:
  - Exibe uma tabela compacta e limpa no formato de extrato bancário.
  - A coluna "Filial" exibe `MAUA - MHE`, a coluna "Data" exibe `08/09/2026`, a coluna "Valor" exibe `- R$ 1.500,00`.
  - Nenhuma rolagem excessiva; todas as movimentações visíveis na mesma tela.

### Cenário 2: Classificação Rápida Inline sem Perder Contexto
- **Estado Inicial**: Linha de débito de R$ 1.500,00 com badge "Débito Pendente".
- **Ação**: O usuário clica em "Classificar" na linha. A linha se expande. O usuário clica no chip "Peças / Fornecedor Avulso" e clica em "Salvar Destinação".
- **Resultado Esperado**:
  - A gaveta se recolhe.
  - A linha agora exibe o badge "Peças / Fornecedor Avulso" e "📈 Soma no Contas a Pagar".
  - O contador no topo é atualizado para "1 de 8 saídas tratadas".
