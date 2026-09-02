# Proposal: Faturamento Assistido por Mapa de Metas e Gestão Dual de Pátio sem Import de OS (350)

## Problema

1. **Inviabilidade de Cálculo de Faturamento na Ausência de Arquivos de OS:**
   - Quando o operador realiza o fechamento sem arquivos Excel/XLS de Ordens de Serviço (virada de mês ou indisponibilidade de relatório do ERP), o cálculo padrão de odômetro delta fica desprovido de base, gerando confusão no Step 3.
   - É necessário um cálculo específico e assistido para este cenário:
     $$\text{Faturamento Sugerido} = (\text{Faturamento Conciliação Anterior} - \text{Faturamento Mês Anterior}) + \text{Faturamento Mapa de Metas}$$
   - Esse cálculo deve ser aplicado **estritamente quando não houver OSs importadas**, sem quebrar ou alterar a conciliação padrão quando houver arquivos de OS.

2. **Interface de Pátio / Fallback Quebrada e Difícil de Gerenciar:**
   - A tela intermediária de resolução de pátio sem OS (antigos modais e steps intermediários) está fragmentada, com design inconsistente e difícil gerenciamento por filial.
   - Faltam seletores rápidos e explícitos de **Formas de Pagamento** (PIX, Cartão Débito, Cartão Crédito, Dinheiro, Boleto/Transf), impedindo que as baixas manuais alimentem o motor de auto-match com a Rede e o OFX.

---

## Solução Proposta (Foco em Reuso e Correção)

1. **Card Dinâmico de Faturamento no Step 3 (Modo Assistido sem OS):**
   - No `CentralImportWizard.tsx` (Step 3), se `results.osFiles.length === 0`:
     - Exibir card assistido em Dark UI Zinc-950 com os 3 inputs da fórmula matemática:
       1. Faturamento Atual da Conciliação Anterior ($F_{ant}$)
       2. Faturamento Mês Anterior ($F_{mes\_ant}$)
       3. Faturamento Atual do Mapa de Metas ($F_{metas}$) (extraído automaticamente de PDF importado ou digitado).
     - Botão *"⚡ Aplicar ao Faturamento do Dia"* que preenche automaticamente o odômetro/faturamento com o valor calculado.
   - Se `results.osFiles.length > 0`, mantém 100% o comportamento padrão intacto.

2. **Novo Componente Unificado: `PatioManagementDualModal.tsx` (2 Abas):**
   - Substitui a interface confusa por um container moderno e responsivo em Dark UI Zinc-950:
     - **Aba 1: "📋 Gestão & Baixa Manual por Filial"**:
       - Pílulas de filtro para as 10 lojas com contadores de veículos em aberto.
       - Tabela/cards de OSs pendentes da loja selecionada (carregadas via RPC `get_pending_patio_os_for_ocr`).
       - Chips de 1 clique para forma de pagamento: `[ PIX ]`, `[ Crédito ]`, `[ Débito ]`, `[ Dinheiro ]`, `[ Boleto ]`, `[ Em Aberto ]`.
       - Botão *"Quitar 100%"* e inputs inline para quitação parcial.
       - Botão `+ Cadastrar OS Manual`.
     - **Aba 2: "📸 Importação por Imagem / OCR Inteligente"**:
       - Dropzone e paste (<kbd>Ctrl + V</kbd>) para prints do sistema.
       - Extração automática via IA (Mistral Vision / Gemini) com preenchimento de loja, valores e métodos de pagamento.
       - Grid de revisão integrado e injeção atômica via `batch_upsert_patio_os`.

---

## Investigação e Análise de Reuso (Relatório dos Subagentes)

- **Tabelas / RPCs Existentes Reutilizadas:**
  - `public.get_pending_patio_os_for_ocr(p_target_date)`: Fornece todas as OSs em aberto por loja com dias em pátio.
  - `public.batch_upsert_patio_os(p_store_id, p_target_date, p_os_records)`: Ingestão e merge não-regressivo de OSs com métodos de pagamento e cofre.
  - `public.get_daily_reconciliation_summary(p_date, p_force_dynamic)`: Retorna `faturamento_anterior` e `stores` para a fórmula.
  - `public.patio_os`: Tabela canônica de veículos e ordens de serviço.

- **Componentes / Hooks Existentes Reutilizados & Adaptados:**
  - `src/lib/parsers/mapaMetasParser.ts`: Extração do faturamento de PDFs de mapa de metas.
  - `src/hooks/useOcrOsProcessor.ts`: Motor de visão computacional OCR em lote.
  - `src/components/importacoes/CentralImportWizard.tsx`: Orquestrador do fluxo de importação.
  - `src/components/importacoes/OcrBatchProgressBar.tsx` e `OcrBatchDropzoneAndPaste.tsx`.

- **Justificativa para Artefatos Novos:**
  - `[NEW] src/components/importacoes/patio/PatioManagementDualModal.tsx`: Unifica a gestão manual por filial e a ingestão por imagem em um design system consistente (Dark UI Zinc-950).
  - `[NEW] src/components/importacoes/patio/PatioManualStoreGrid.tsx`: Grid focado na auditoria rápida de OSs por loja com chips de formas de pagamento de 1 clique.

---

## Contratos de Dados & SQL (Supabase)

Nenhuma nova tabela é necessária. O schema de `patio_os` (`payment_method`, `total_value`, `paid_value`, `status`, `store_id`) e `store_cash_vault` já suporta integralmente o payload.

---

## API & Componentes (Frontend)

### Componentes a Modificar:
1. `[MODIFY] src/components/importacoes/CentralImportWizard.tsx`:
   - Integrar `<PatioManagementDualModal />` ao detectar ausência de arquivos de OS (`step === 1.5` ou acionamento pelo operador).
   - Adicionar o bloco condicional de **Faturamento Assistido por Mapa de Metas** no Step 3 quando `results.osFiles.length === 0`.
2. `[MODIFY] src/components/importacoes/wizard/StoreDifferenceBreakdownTable.tsx`:
   - Garantir null-safety para valores de OS zerados quando não há arquivos importados.

---

## Risco Principal e Mitigação

- **Risco:** O operador utilizar a fórmula assistida em dias normais com OSs importadas e distorcer o faturamento real do ERP.
- **Mitigação:** Trava estrita de ativação condicional (`results.osFiles.length === 0`). Se houver qualquer arquivo de OS importado, a calculadora assistida é ocultada e o sistema segue a regra canônica de odômetro do arquivo.
