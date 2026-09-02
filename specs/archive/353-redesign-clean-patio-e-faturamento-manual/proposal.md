# Proposal: Redesign Minimalista e Ergonômico de Pátio e Faturamento (353)

## Problema
A interface recente de Gestão de Pátio (Step 1.5) e da Calculadora de Faturamento (Step 3) ficou sobrecarregada com excesso de componentes intermediários, painéis densos, fórmulas matemáticas em destaque e tabelas poluídas ("cockpit de avião"). O registro de OSs manuais ficou burocrático e o design destoou do padrão limpo e moderno da aplicação.

---

## Solução Proposta (Design Limpo, Foco em Agilidade e Usabilidade)

### 1. Step 1.5 — Gestão Minimalista de Pátio
- **Estrutura Enxuta:** Card Dark UI Zinc-950 com seletor discreto de filial (`<select>` ou pílulas sóbrias) e alternância simples entre `[ 📝 Registro Manual ]` e `[ 📷 Print / OCR ]`.
- **Registro Rápido de OS Manual:**
  - Lista simplificada de veículos/OSs da loja com apenas 4 colunas essenciais (`OS`, `Cliente/Placa`, `Valor`, `Pagamento`).
  - Botões rápidos e diretos de pagamento: `[ PIX ]` `[ Cartão ]` `[ Dinheiro ]` `[ Aberto ]`.
  - Formulário compacto de 1 linha para cadastrar nova OS: `[ Nº OS ]` `[ Cliente / Carro ]` `[ Valor R$ ]` `[ Forma de Pagamento ]` `[ + Adicionar ]`.
- **OCR Simplificado:** Dropzone minimalista onde o operador pode simplesmente pressionar <kbd>Ctrl + V</kbd> de prints e clicar em processar.

### 2. Step 3 — Faturamento e Valores Manuais Clean
- **Eliminação da "Calculadora Espacial":** Descartar o card gigante com 3 sub-inputs e fórmulas expostas.
- **Grid Padronizado de 4 Cards (Dark UI Zinc-950):**
  1. **Faturamento / Odômetro OI**
  2. **Dinheiro MP**
  3. **A Receber**
  4. **Contas a Pagar**
- **Sugestão Inteligente em 1-Clique no Card de Faturamento:**
  - Quando não houver arquivos de OS importados, o card de Faturamento exibe uma linha sutil:
    `💡 Sugestão via Metas: R$ 945.000,00` `[ ⚡ Usar ]`
  - Ao clicar em `[ ⚡ Usar ]`, preenche o input imediatamente com base na fórmula `(Concil. Anterior - Mês Anterior) + Mapa de Metas`.

---

## Investigação e Análise de Reuso (Relatório dos Subagentes)
- **Componentes a Modificar `[MODIFY]`:**
  - `src/components/importacoes/patio/PatioManualStoreGrid.tsx`: Redesenhar com layout esbelto, linhas limpas e botões rápidos.
  - `src/components/importacoes/CentralImportWizard.tsx`: Limpar o Step 1.5 e simplificar a seção de Faturamento no Step 3.
  - `src/components/importacoes/wizard/AssistedRevenueCalculator.tsx`: Transformar em um mini helper compacto ou inline badge dentro do card de Faturamento.
  - `src/components/importacoes/patio/PatioManagementDualModal.tsx`: Limpar abas e modal para design minimalista.

---

## Contratos de Dados & SQL (Supabase)
Preservação integral do contrato:
- RPC `batch_upsert_patio_os` para salvar as OSs manuais.
- RPC `auto_match_daily_transactions` para rodar o auto-match pós-pátio.
- Gravação de `odometroHoje` e inputs manuais no `handleConfirm`.

---

## API & Componentes (Frontend)
- Sem excesso de elementos concorrentes, respeitando as diretrizes de `frontend-design-pro/SKILL.md` (Dark UI Zinc-950 sólido, sem bordas pesadas ou poluição de texto).

---

## Risco Principal e Mitigação
- **Risco:** Perda de dados ou regressão no cálculo de faturamento assistido.
- **Mitigação:** A fórmula matemática permanece idêntica no cálculo interno, mudando apenas a apresentação visual para ser 100% limpa, amigável e direta ao ponto.
