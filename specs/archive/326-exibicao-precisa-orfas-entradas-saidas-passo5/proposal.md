# Proposal: Exibição Precisa e Híbrida de Órfãos Reais (Entradas e Saídas Não-Vinculadas) no Passo 5 (326)

## Problema

No Passo 5 (*"Justificativas de Movimentações por Loja"*), o sistema exibiu temporariamente:
- `Saídas Órfãs (0)`
- `Entradas Órfãs (0)`

Isso ocorreu porque a versão anterior do hook retornava `[]` estritamente quando a consulta ao banco vinha vazia (ou antes da persistência no banco), ignorando as transações que **realmente não foram vinculadas** e precisavam de classificação manual.

Para a conciliação da pasta `31-08`:
- Dos 52 débitos OFX: **43 casaram com Contas a Pagar (devem ficar ocultos)** e **4 débitos não casaram (devem aparecer como Saídas Órfãs para o usuário classificar)**.
- Das entradas OFX: **As vinculadas a OS/Rede devem ficar ocultas** e **1 entrada avulsa não vinculada deve aparecer como Entrada Órfã para o usuário classificar se soma ao faturamento ou não**.

---

## Solução Proposta (Arquitetura Híbrida de Exibição Inteligente)

### 1. Duplo Nível de Filtragem (Memória & Banco)
No componente `Step2NonRevenueJustifications.tsx`:
- **Se houver registros no banco (`dbOutflows.length > 0` ou `dbInflows.length > 0`)**: Renderiza os dados do banco filtrados por `matched_bill_id IS NULL` / `matched_os_number IS NULL`.
- **Se o banco estiver vazio ou o usuário estiver no fluxo pré-gravação**:
  - Utiliza `results.ofxResults` aplicando o resultado do motor em memória (`executeExpenseAutoMatching` e `executeAutoMatchingEngine`).
  - **Oculta** todas as transações que têm `matched_bill_id` ou `matched_os_number` (as 43 saídas casadas e as entradas conciliadas).
  - **Descarta** automaticamente os 5 cabeçalhos de saldo Itaú (`SALDO ANTERIOR`, `SALDO TOTAL DISPONIVEL DIA`).
  - **Exibe com precisão cirúrgica** as **4 saídas órfãs reais** e a **1 entrada órfã real**.

### 2. Ações de Justificativa Funcionais com e sem Banco
- Cada saída órfã listada permite:
  1. Vincular a uma conta aberta existente.
  2. Ou selecionar Categoria rápida (ex: *Tarifa Bancária*, *Retirada de Sócios*, *Despesa Avulsa*) e alternar o toggle *"Adicionar ao Contas a Pagar (Despesa Extra)?"*.
  3. Clicar em *"Salvar Destinação"* -> marca a linha como salva com badge verde e atualiza o DRE.
- A entrada órfã listada permite:
  1. Selecionar Categoria (ex: *Transferência Entre Lojas*, *Aporte de Sócios*, *Estorno*).
  2. Alternar o toggle *"Soma no Faturamento do Dia?"*.
  3. Clicar em *"Salvar Justificativa"*.

---

## Componentes Reutilizados [MODIFY]

| Componente | Ação | Responsabilidade |
|---|:---:|---|
| `Step2NonRevenueJustifications.tsx` | `[MODIFY]` | Implementar o useMemo híbrido com filtragem estrita de casados em memória e no banco, exibindo as 4 saídas órfãs e a 1 entrada órfã. |
| `CentralImportWizard.tsx` | `[MODIFY]` | Garantir que o pré-matching em memória rode imediatamente no upload e que o avanço para o Passo 5 mantenha as listas sincronizadas. |
| `expenseMatcher.ts` | `[EXTEND]` | Garantir que o matching diferencie com 100% de precisão as 43 saídas casadas das 4 saídas órfãs. |

---

## Risco Principal e Mitigação

- **Risco:** Reaparecerem as 43 saídas casadas ou sumirem as 4 saídas órfãs.
- **Mitigação:** Validação do predicado `!tx.matched_bill_id && !tx.match_status === 'matched'` com teste automatizado verificando `visibleOutflows.length === 4` e `visibleInflows.length === 1`.
