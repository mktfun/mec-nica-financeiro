# Proposal: Janela de Detalhes da Transação (Revolut Card Details Modal) e Limpeza da Linha do Extrato (389)

## Problema

1. **Deformação Visual por Excesso de Botões Inline:**
   - No extrato bancário da filial (`StoreExtratoBancarioView.tsx`), as linhas de transações financeiras estão abrigando botões de ação como `[Mover p/ Hoje]`, `[Vincular OS]`, `[Desvincular]`, `[Editar]` e `[Justificar]` diretamente no grid da lista.
   - Em telas comuns ou linhas com múltiplos atributos (como transações D-1 de PIX com identificador de intercompany), os botões disputam espaço com os valores monetários (`+ R$ 300,00` ou `- R$ 490,50`), quebrando linhas e deformando a tabela (evidenciado nos prints enviados pelo usuário: `media_1788986160280.png` e `media_1788986242339.png`).

2. **Fadiga Operacional e Dificuldade de Leitura:**
   - O usuário precisa de uma visão limpa e escaneável do extrato fiduciário, com a possibilidade de clicar em qualquer item para inspecionar seus detalhes e executar as ações necessárias de forma focada e confortável:
   > *"os botoes ta meio que deformando td e tals, eu prefiro clicar em cada um pra ver e tals saca e podereditar cada um mano justificar vincularo que for, clicar abrir uma janela e tals pra isso... ent editar pra aconntecer assim ."*

---

## Solução Proposta (Revolut Fintech UX Pattern)

1. **Limpeza Radical da Linha da Lista (Row Cleanup):**
   - Eliminar **todos** os botões de ação soltos de dentro da linha da listagem.
   - Cada linha passa a exibir estritamente:
     - **Squircle Avatar**: à esquerda, com ícone semântico e tonalidade exata (Rose para saídas, Emerald para entradas, Blue para maquininhas).
     - **Identificação Central**: Razão social higienizada + subtítulo único em linha com metadados discretos (Natureza • Conta • CNPJ • Justificativa).
     - **Valor Fiduciário em Alto Contraste**: alinhado à direita com `+ R$ X,XX` (Emerald) ou `- R$ X,XX` (Rose).
     - **Indicador de Abertura**: Um sutil `ChevronRight` (`text-zinc-600 group-hover:text-zinc-300 group-hover:translate-x-0.5 transition-all`).
   - A linha inteira é clicável (`cursor-pointer group hover:bg-zinc-800/40 rounded-xl px-3.5 py-3 transition-colors active:scale-[0.99]`), permitindo abrir a janela de detalhes com um único toque/clique.

2. **Janela de Detalhes da Transação (`TransactionDetailModal`):**
   - Criar um componente modal focado e elegante baseado no design da Revolut (*Transaction / Card Details*), utilizando o componente canônico `@/components/ui/Modal`.
   - **Hero Header:**
     - Avatar squircle ampliado com a cor fiduciária.
     - Razão social limpa em destaque (`text-lg font-semibold text-zinc-100`).
     - Valor monetário em tamanho grande (`text-3xl font-mono font-bold`, Rose para saída e Emerald para entrada).
     - Timestamp com data e hora exata do extrato bancário.
     - Badges de contexto (`D-1 Ontem`, `Lote Rede`, `OS Vinculada #...`, `Intercompany`).
   - **Ficha Técnica & Auditoria Fiduciária (Superfície Dark Zinc-900):**
     - FITID bancário oficial do Itaú com botão de cópia de 1-clique.
     - CNPJ / CPF e Razão Social completa.
     - Conta de despesa / Fornecedor vinculado.
     - Categoria contábil atual.
     - Justificativa registrada.
     - Status fiduciário no banco.
   - **Painel de Ações Nobre e Espaçoso (Action Panel):**
     - 🟣 **[Mover para a Conciliação de Hoje]** (se D-1 / data anterior pós-fechamento): atualiza `target_date`, limpa travas de "Apenas Conciliar", invalida cache e inclui no faturamento de hoje.
     - 🔵 **[Vincular a Ordem de Serviço (OS)]** (se crédito sem OS): abre a janela de busca e vínculo de OS (`ManualMatchOsModal`).
     - 🔴 **[Desvincular Ordem de Serviço]** (se já vinculado a OS): desassocia a OS com segurança.
     - ✏️ **[Editar Categoria / Justificar]** (se despesa ou saída avulsa): abre a janela de classificação contábil (`CategorizeModal`).
     - ⚪ **[Fechar Janela]**: botão simples para retornar ao extrato.

---

## Investigação e Análise de Reuso

- **Componentes Existentes Reutilizados:**
  - `@/components/ui/Modal.tsx`: Base de modal com Framer Motion, backdrop blur e Dark UI Zinc-950 nativa.
  - `src/components/conciliacao/ManualMatchOsModal.tsx`: Fluxo existente de vínculo de OS acionado sem redundância.
  - `src/components/conciliacao/CategorizeModal.tsx`: Fluxo existente de categorização contábil de despesas reaproveitado.
  - `src/components/conciliacao/StoreExtratoBancarioView.tsx`: Orquestração de estado e mutações (`handleMoveTransactionToToday`, `handleUnlink`) totalmente preservadas.
- **Justificativa para Novo Componente (`TransactionDetailModal.tsx`):**
  - Isolamento de responsabilidade visual: encapsula a ficha técnica detalhada e o painel de ações sem sobrecarregar `StoreExtratoBancarioView.tsx` com lógica extra de modal.

---

## Contratos de Dados & SQL (Supabase)

- **Nenhuma alteração de banco de dados ou RPC é necessária.**
- Reuso estrito das tabelas `transactions`, `ofx_transactions` e `reconciliations` com as mutações e queries já homologadas.

---

## API & Componentes (Frontend)

### `TransactionDetailModal.tsx` (Novo)
```typescript
export interface TransactionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: any | null;
  storeId: string;
  currentDate: string;
  onMoveToToday?: (tx: any) => Promise<void> | void;
  onLinkOs?: (tx: any) => void;
  onUnlinkOs?: (txId: string, osNum: string) => void;
  onEditCategory?: (tx: any) => void;
  isMoving?: boolean;
}
```

### `StoreExtratoBancarioView.tsx` (Modificação)
- Inclusão do estado `const [selectedDetailTx, setSelectedDetailTx] = useState<any | null>(null);`.
- Adição de `onClick={() => setSelectedDetailTx(tx)}` na linha inteira de cada transação.
- Remoção do container flex de botões da linha da lista.
- Renderização de `<TransactionDetailModal />` no final do componente.

---

## Risco Principal e Mitigação

- **Risco:** O usuário clicar para abrir o modal subsequente (ex: `ManualMatchOsModal` ou `CategorizeModal`) e ocorrer sobreposição indesejada de múltiplos modais na tela.
- **Mitigação:** Ao disparar `onLinkOs` ou `onEditCategory`, fechar primeiramente o `TransactionDetailModal` (`setSelectedDetailTx(null)`) e abrir o modal de trabalho correspondente de forma linear e fluida.
