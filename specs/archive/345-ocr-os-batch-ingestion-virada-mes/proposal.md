# Proposal: Ingestão de OSs via Mistral OCR/Vision (Aba Pagamentos) e Auto-Pareamento de Pátio da Virada de Mês (345)

## 1. Problema
No início de cada mês e durante a "virada de carros" no ERP Oficina Inteligente (OI), não existe um relatório exportável pronto para as OSs que transitaram de mês ou que sofreram alterações avulsas.
O operador precisa abrir tela por tela de cada Ordem de Serviço no Oficina Inteligente, ler visualmente os dados (número, loja, cliente, placa, valor total, formas de pagamento na aba Pagamentos) e digitar manualmente campo a campo no sistema financeiro, criando OSs ou atualizando pátios e vinculando com PIX e maquininha REDE. Esse processo é lento, extenuante e propenso a erros de digitação.

---

## 2. Solução Proposta (OCR da Aba Pagamentos + Paridade Total com Arquivo de Pátio)

Com a captura do print da tela de OS na **Aba Pagamentos** (ou tela principal), o sistema extrai o desdobramento financeiro completo de cada OS, funcionando com a mesma riqueza de dados de uma planilha `.xls` de Carros em Pátio:

1. **Detecção Automática no Wizard de Importação:**
   - Se no Step 0 (Upload) o operador não subir arquivos `.xls` de OSs (cenário de virada de mês), o Wizard detecta e oferece a transição direta para a etapa **"Importação de OSs via Prints / OCR (Virada de Pátio)"**.
2. **Cobrança por Loja das OSs do Fechamento Anterior (Ontem $\to$ Hoje):**
   - O sistema lista exatamente as OSs que estavam no pátio no fechamento anterior agrupadas por filial (ex: Mauá: 2 OSs, Rudge Ramos: 6 OSs, Santo André: 4 OSs...).
   - O operador sabe exatamente quais OSs precisa abrir no Oficina Inteligente para capturar o print da aba Pagamentos.
   - Qualquer print de OS com número não existente no pátio anterior é automaticamente classificado como **Nova OS criada hoje**.
3. **Multi-Dropzone & Smart Paste (`Ctrl + V`):**
   - O operador pode soltar múltiplos prints de uma vez ou tirar print da tela do ERP e colar com `Ctrl + V`.
4. **Motor Mistral OCR / Vision (Extração Integral da Aba Pagamentos):**
   - Extração do cabeçalho da OS (`empresa_loja`, `os_number`, `client_name`, `client_cpf`, `plate`, `vehicle`, `total_value`, `paid_value`, `open_value`, `opened_at`, `closed_at`, `status`).
   - Extração do array de parcelas da aba Pagamentos:
     `payments: [ { installment: 1, due_date: "2026-09-01", method: "Débito", amount: 720.00 }, { installment: 2, due_date: "2026-09-01", method: "Débito", amount: 1900.00 } ]`
   - Totalização das formas de pagamento: `debit_value`, `credit_value`, `pix_transfer_value`, `cash_value`.
5. **Conversão para `ParsedOS` e Auto-Pareamento Instantâneo:**
   - Os dados extraídos alimentam a mesma estrutura do parser de planilhas (`useOsImportProcessor.ts`).
   - O motor de matching automático (`autoMatchingEngine.ts` e RPC `auto_match_daily_transactions`) pareia imediatamente as vendas da REDE e PIX do extrato com as OSs extraídas pelo OCR.
   - OSs quitadas (`open_value == 0`) são marcadas como `status = 'finalizada'`, saindo do pátio e entrando no faturamento realizado.

---

## 3. Investigação e Análise de Reuso (Relatório dos Subagentes)

- **Tabelas / RPCs Existentes Reutilizadas:**
  - Tabela `patio_os`: Reutilizada integralmente com constraint `UNIQUE(store_id, os_number)` e colunas de métodos (`debit_value`, `credit_value`, `pix_transfer_value`, `cash_value`).
  - Tabela `store_cash_vault`: Reutilizada para registrar baixas em dinheiro físico.
  - RPC `auto_match_daily_transactions`: Reutilizada para parear pagamentos bancários e de cartão com as novas OSs.
  - RPC Nova: `batch_upsert_patio_os` (unificação atômica de upsert e cálculo de pátio remanescente).
- **Componentes / Hooks Existentes Reutilizados:**
  - `CentralImportWizard.tsx`: Modificado para detectar ausência de arquivos `.xls` de OS e abrir o fluxo de OCR.
  - `useOsImportProcessor.ts` & `useImportProcessor.ts`: Reutilizadas as tipagens `ParsedOS` e a persistência `savePatioOsAndReceivables`.
  - `MissingPatioOsEditor.tsx`: Estendido com atalho para capturar print da OS selecionada.

---

## 4. Contratos de Dados & SQL (Supabase)

### RPC `public.batch_upsert_patio_os`:
```sql
CREATE OR REPLACE FUNCTION public.batch_upsert_patio_os(
    p_store_id TEXT,
    p_target_date DATE,
    p_os_records JSONB
)
RETURNS JSONB;
```
- **Entrada:** `p_store_id` (ID da loja), `p_target_date` (data do fechamento), `p_os_records` (Array JSON de OSs extraídas com desdobramento de formas de pagamento).
- **Retorno:** JSON com `inserted_new_os`, `updated_existing_os`, `patio_anterior_liquidado`, `patio_anterior_retido`, `saldo_patio_remanescente`.

---

## 5. API & Componentes (Frontend)

- `[NEW] src/components/importacoes/OcrBatchOsModal.tsx`: Modal principal de captura, fila de lotes e conferência de prints com visualização de parcelas.
- `[NEW] src/components/importacoes/OcrBatchStoreCarryoverList.tsx`: Lista de OSs pendentes do fechamento anterior por loja.
- `[NEW] src/components/importacoes/OcrBatchDropzoneAndPaste.tsx`: Área receptora com suporte a `Ctrl+V` e drag & drop.
- `[NEW] src/components/importacoes/OcrBatchReviewGrid.tsx`: Tabela de conferência rápida com breakdown de Débito, Crédito, PIX e Dinheiro.
- `[NEW] src/hooks/useOcrOsProcessor.ts`: Motor de fila de lotes com delay de 1.5s e chamada direta à API Mistral OCR / Pixtral Vision.
- `[MODIFY] src/components/importacoes/CentralImportWizard.tsx`: Detecção de ausência de planilha de OS e transição suave.

---

## 6. Risco Principal e Mitigação

- **Risco Principal:** Rate limit do Free Plan da Mistral AI ao processar múltiplos prints.
- **Mitigação:** Processamento sequencial em chunks de 2 imagens com delay de 1.5s + retry automático com backoff exponencial + Grid de conferência rápida permitindo ao operador validar ou editar qualquer campo com 1 clique antes da gravação no banco.
