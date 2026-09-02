# Proposal: Controle de OS Estilo Planilha Excel por Loja com Accordion e Lançamentos na Linha (354)

## Problema
O modelo anterior de formulários com switches e tabelas compactadas não refletia o fluxo real de trabalho dos operadores (que trabalham orientados a loja e precisam enxergar as colunas de split: Pix, Crédito, Débito, Dinheiro, Total Pago e Restante, igual a uma planilha de Excel). O usuário precisa ver cada loja como um bloco expansível, com lançamentos de pagamento diretamente na linha e cálculos automáticos imediatos.

---

## Solução Proposta (Foco em Excel UX & Ergonometria)

### 1. Estrutura de Lojas em Blocos Expansíveis (Accordion)
- Cada loja é apresentada em um bloco sanfona (Accordion) ordenado e recolhível.
- **Cabeçalho da Loja:**
  `▼ Mauá · 8 OSs | Total: R$ 10.861,44 | Pago: R$ 8.400,00 | Aberto: R$ 2.461,44`
  Com botões: `[+ Adicionar OS]` e `[Expandir/Recolher]`.
- **Persistência de Estado:** O estado de abertura de cada loja é salvo em `localStorage` (com a primeira loja aberta por padrão).

### 2. Tabela de OSs Estilo Planilha (Colunas de Split Transparentes)
- **Colunas:**
  `OS | Data | Total OS | Pix | Crédito | Débito | Dinheiro | Total Pago | Restante | Ações`
- **Edição Direta:** A célula de `Total OS` permite edição numérica direta na célula.
- **Color Coding Semântico por Linha:**
  - 🟢 **Verde:** 100% Paga (`Restante == 0`).
  - 🟡 **Amarela:** Pago Parcial (`Pago > 0 && Restante > 0`).
  - ⚪ **Neutra/Dark:** Em Aberto (`Pago == 0`).

### 3. Mini Popover de Lançamento na Linha
- Ao clicar no botão `[Lançar]` na linha da OS:
  - Seleciona o meio: `[ Pix ] [ Crédito ] [ Débito ] [ Dinheiro ]`
  - Digita o valor ou clica em `[ ⚡ Usar Restante: R$ X.XXX,XX ]`
  - Clica em `[Salvar]`
- O sistema incrementa a coluna correspondente (Pix, Crédito, etc.), recalcula `Total Pago`, `Restante` e atualiza o cabeçalho da filial em tempo real.

---

## Investigação e Análise de Reuso (Relatório dos Subagentes)
- **Tabelas / RPCs:**
  - `batch_upsert_patio_os`: Suporta nativamente as colunas `pix_val`, `credit_val`, `debit_val`, `cash_val`, `total_value`, `paid_value` e `status`.
- **Componentes:**
  - `[NEW] src/components/importacoes/patio/PatioExcelStoreAccordion.tsx`: Componente mestre com o accordion por loja, grid estilo Excel e popover de lançamento.
  - `[MODIFY] src/components/importacoes/patio/PatioManualStoreGrid.tsx`: Adapter para compatibilidade.
  - `[MODIFY] src/components/importacoes/CentralImportWizard.tsx`: Integração no Step 1.5.
  - `[MODIFY] src/components/importacoes/patio/PatioManagementDualModal.tsx`: Integração na aba manual.

---

## Contratos de Dados & SQL (Supabase)
Preservação total dos campos de `patio_os`:
- `total_value`, `paid_value`, `pix_transfer_value`, `credit_value`, `debit_value`, `cash_value`, `payment_method`, `status`.

---

## API & Componentes (Frontend)
- `EditablePatioOsItem` expandido para armazenar os 4 canais de pagamento detalhados (`pix_transfer_value`, `credit_value`, `debit_value`, `cash_value`).

---

## Risco Principal e Mitigação
- **Risco:** Lançamento de pagamentos múltiplos ultrapassar o valor total da OS.
- **Mitigação:** Validação automática com feedback visual se o total lançado for maior que o total da OS, e botão de atalho `[Usar Restante]` para evitar erros de digitação.
