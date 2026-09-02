# Proposal: Faturamento Assistido sem OS e Correção de Incongruências no Pátio / Frontend (357)

## Problema

1. **Inviabilidade de Fechamento Ágil sem Arquivos de OS:**
   - Quando o usuário realiza o fechamento sem planilhas de Ordens de Serviço (virada de mês ou indisponibilidade de relatório do ERP), o sistema atualmente exibe o card clássico pedindo o **"ODÔMETRO OI (ACUMULADO)"** com base em R$ 1.030.770,59 e valor inicial 0,00, sem expor os termos da equação contábil necessária.
   - A fórmula canônica exigida pelo operador para quando não há import de OS é:
     $$\text{Faturamento Atual} = (\text{Fat. Atual Concil. Ant.} - \text{Fat. Mês Ant.}) + \text{Fat. Atual Mapa de Metas}$$
   - Falta exibir esse formulário assistido explícito, solicitando os valores de forma visual e intuitiva e gravando a memória do mês anterior no snapshot para não ter que redigitar todo dia.

2. **Formatação Quebrada de Ponto Flutuante (Float IEEE 754):**
   - O card de **Contas a Pagar** no Step 3 exibe dízimas como `91200,72000000002` por falta de sanitização decimal (`toFixed(2)`).

3. **Incongruências no OCR e Integração com Pátio Manual:**
   - O OCR Pixtral agrupa termos de texto do cabeçalho da tela ao número da OS (gerando `601Fatura` e `8000Fatur`).
   - Quando o operador atualiza as OSs manualmente no acordeão estilo Excel (`PatioExcelStoreAccordion.tsx`), o Wizard salva no banco, mas não sincroniza os objetos em memória (`results.osFiles`), fazendo o Step 3 achar que nenhuma OS foi movimentada.

---

## Solução Proposta (Foco em Reuso e Correção)

### 1. Step 3 — Faturamento Assistido sem OS (Modo Dinâmico Condicional)
- **Guarda Estrita:** Apenas ativado quando `results.osFiles.length === 0` (zero planilhas de OS importadas). Se houver arquivos de OS importados (`results.osFiles.length > 0`), o comportamento de Odômetro clássico permanece 100% inalterado.
- **Integração do `AssistedRevenueCalculator.tsx`:**
  - **Faturamento Atual da Conciliação Anterior ($F_{\text{ant}}$):** Puxado automaticamente do `previousSnapshot` ou editável.
  - **Faturamento Mês Anterior ($F_{\text{mês\_ant}}$):** Input manual salvo em `daily_snapshots.metadata.faturamento_mes_anterior`.
  - **Cálculo da Base do Mês:**
    $$\text{Base Mês Anterior} = \max(0, F_{\text{ant}} - F_{\text{mês\_ant}})$$
  - **Faturamento Atual Mapa de Metas ($F_{\text{metas}}$):** Auto-carregado do PDF do Mapa de Metas ou input manual.
  - **Faturamento Calculado do Dia:**
    $$\text{Faturamento Atual} = \text{Base Mês Anterior} + F_{\text{metas}}$$
  - Botão *"⚡ Aplicar ao Fechamento"* que preenche o faturamento diário e mantém a coerência do snapshot.

### 2. Sanitização de Ponto Flutuante em Contas a Pagar
- Arredondamento estrito com 2 casas decimais no `reduce` de `contasPagarResults` e no `value` do input (`Number(total.toFixed(2))`), eliminando strings quebradas como `91200,72000000002`.

### 3. Sanitização de OS no OCR e Conexão do Pátio Excel
- Adicionar `sanitizeOsNumber` em `useOcrOsProcessor.ts` removendo sufixos `Fatura`, `Fatur`, `Fat`, `OS` e extraindo apenas os dígitos ou código limpo.
- Em `CentralImportWizard.tsx`, ao salvar e avançar do Step 1.5, converter os itens editados no `PatioExcelStoreAccordion` em `results.osFiles` via adaptador `convertManualPatioToOsImportResults`, alimentando o total de OS e recebimentos do dia no Step 3.

---

## Investigação e Análise de Reuso (Relatório dos Subagentes)

- **Componentes Existentes Reutilizados `[MODIFY]`:**
  - `src/components/importacoes/wizard/AssistedRevenueCalculator.tsx`: Conectar ao `CentralImportWizard.tsx` e injetar props de encadeamento.
  - `src/components/importacoes/CentralImportWizard.tsx`: Integrar `AssistedRevenueCalculator`, sanitizar `contasManual` e converter pátio manual em `results.osFiles`.
  - `src/hooks/useOcrOsProcessor.ts`: Sanitizar números de OS do OCR (`601Fatura` -> `601`) e deduplicar `(store_id, os_number)`.
  - `src/lib/parsers/ocrOsAdapter.ts`: Adicionar helper `convertManualPatioToOsImportResults`.
- **Backend / Database:**
  - Reutilização da estrutura de `daily_snapshots` persistindo `metadata.faturamento_mes_anterior` e `metadata.faturamento_oi_base`.
  - Zero alteração na RPC `get_daily_reconciliation_summary` para não quebrar a lógica dos 5 pilares e fechamentos retroativos.

---

## Risco Principal e Mitigação
- **Risco:** Desconfigurar o fechamento com arquivos normais de OS quando o usuário carregar relatórios XLSX.
- **Mitigação:** Guarda condicional estrita `results.osFiles.length === 0`. Se houver arquivos de OS válidos, todo o fluxo clássico de Odômetro e leitura de XLS permanece exatamente como antes.
