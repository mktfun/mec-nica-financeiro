# Proposal: Motor de Conciliação, OFX x Conciliado por Loja e Equalização Canônica de 02/09/2026 (358)

## Problema
1. **Quebra no "OFX x Conciliado" no Fechamento por Loja:**
   - Na tela de Fechamento por Loja (`ConciliacaoLojasView.tsx` e `StoreCardModulo1.tsx`), as colunas de "Conciliado" e "Dif. a Justificar" de Entradas apareciam zeradas em todas as 10 filiais, com o badge exibindo indevidamente "100% Conciliado".
   - **Causa Raiz:** A RPC `get_daily_reconciliation_summary` retornava `ofx_entradas_total`, `ofx_maquininhas`, `pix_total`, `entradas_justificadas`, `entradas_orfas`. O frontend buscava as chaves `entradas_conciliadas`, `entradas_previsto`, `diferenca_entradas`. Como nenhuma existia no JSON e não havia fallback defensivo, os campos caíam em 0,00.
2. **Divergência Total no Fechamento de 02/09/2026:**
   - O fechamento gravado no sistema para 02/09/2026 estava com valores distorcidos em relação ao balanço real da empresa:
     - Pátio no sistema: R$ 165.598,08 vs Pátio Real: R$ 33.365,96.
     - Faturamento no sistema: R$ 54.853,00 vs Faturamento Real: R$ 38.153,05 (R$ 13.698,09 de produção + R$ 24.454,96 de outros ganhos extraordinários).
     - Contas a Pagar no sistema: R$ 94.101,96 vs Contas Reais: R$ 113.495,51.
     - Diferença no sistema: -R$ 76.749,46 ('divergent') vs Diferença Real: -R$ 11,14 (resíduo operacional de centavos, 100% conforme e aprovado).
3. **Falta de Gestão de Outros Ganhos / Faturamento Extra no Fechamento:**
   - Entradas de faturamento corporativo (Aluguel Rei do Módulo R$ 4.500,00, Custo Master R$ 18.000,00, Estorno Seguro Jabaquara R$ 1.954,96) não tinham interface nativa no Step 3 do Wizard.
4. **Instabilidade no OCR Vision de OSs:**
   - Acesso a `MISTRAL_API_KEY` sem declaração disparando `ReferenceError`, regex ganancioso capturando datas em `sanitizeOsNumber`, e screenshots pesadas (5MB+) sem pré-compressão no cliente.

---

## Solução Proposta (Foco em Reuso e Correção Cirúrgica)

### 1. Blindagem da RPC `get_daily_reconciliation_summary` e Resiliência no Frontend:
- Na RPC `get_daily_reconciliation_summary`:
  - Enriquecer o objeto gerado em `v_stores_detail` com as 4 métricas canônicas pré-calculadas:
    - `entradas_conciliadas` = `COALESCE(oe.ofx_maquininhas, 0) + COALESCE(oe.pix_total, 0) + COALESCE(oe.entradas_justificadas, 0)`
    - `dif_entradas` = `COALESCE(oe.ofx_entradas_total, 0) - (COALESCE(oe.ofx_maquininhas, 0) + COALESCE(oe.pix_total, 0) + COALESCE(oe.entradas_justificadas, 0))`
    - `contas_conciliadas` = `COALESCE(bst.contas_loja_total, 0) + COALESCE(sofx.saidas_justificadas, 0)`
    - `dif_saidas` = `COALESCE(sofx.ofx_saidas_total, 0) - (COALESCE(bst.contas_loja_total, 0) + COALESCE(sofx.saidas_justificadas, 0))`
- Em `ConciliacaoLojasView.tsx` e `StoreCardModulo1.tsx`:
  - Adicionar cálculo de fallback inline resiliente para que nenhum dado seja exibido como 0,00.

### 2. Equalização Canônica e Snapshot Pericial de 02/09/2026:
- Criar a migration `20260902000024_equalize_canonical_0209.sql`:
  - Inserir as 3 justificativas de receita extraordinária em `daily_revenue_adjustments` (Aluguel Rei do Módulo R$ 4.500,00, Custo Master R$ 18.000,00, Estorno Seguro Jabaquara R$ 1.954,96 = R$ 24.454,96).
  - Finalizar as OSs quitadas na data para ancorar o saldo de pátio em aberto em R$ 33.365,96.
  - Atualizar o `daily_snapshots` de `2026-09-02` com os valores cravados da conciliação do usuário:
    - Saldo Bancos: R$ 288.969,04
    - Dinheiro MP: R$ 24.955,00
    - A Receber: R$ 8.049,67
    - Na Loja (Pátio OS): R$ 33.365,96
    - Saldo Negativo Itaú: R$ 14.216,26
    - Caixa Atual: R$ 341.123,41
    - Caixa Anterior: R$ 416.454,73 (vindo de 01/09)
    - Fluxo de Caixa: -R$ 75.331,32
    - Faturamento Base OI: R$ 13.698,09
    - Faturamento Outros: R$ 24.454,96
    - Faturamento Atual Total: R$ 38.153,05
    - Valor Disponível para Contas: R$ 113.484,37
    - Valor das Contas a Pagar: R$ 113.495,51
    - Diferença Final: -R$ 11,14 (status 'approved')
    - is_closed: true

### 3. Painel de Faturamento Extra no Wizard (Step 3):
- Adicionar no Step 3 de `CentralImportWizard.tsx` componente para inserção rápida de Receitas Adicionais do Dia (`daily_revenue_adjustments`).

### 4. Otimização e Estabilidade do OCR de OSs:
- Em `useOcrOsProcessor.ts`:
  - Declarar e ler chaves com segurança (`import.meta.env.VITE_MISTRAL_API_KEY || import.meta.env.VITE_GEMINI_API_KEY`).
  - Refinar `sanitizeOsNumber` com `\b\d{3,8}\b` para não pegar datas.
  - Usar a filial selecionada no modal como fallbackStoreId.
- Em `OcrBatchDropzoneAndPaste.tsx`: pré-compressão em canvas (max 1280px, 80% JPEG).

---

## Contratos de Dados & SQL (Supabase)

### 1. `daily_revenue_adjustments`
- Inserção dos 3 itens de 02/09/2026 totalizando R$ 24.454,96.

### 2. `daily_snapshots`
- Equalização dos 5 Pilares de 02/09/2026 com `diferenca_final = -11.14` e `status_geral = 'approved'`.

---

## Risco Principal e Mitigação
- **Risco:** Alterações no retorno da RPC quebrarem dias históricos.
- **Mitigação:** As chaves adicionadas são cumulativas e o frontend usa fallbacks múltiplos encadeados (`??`), garantindo compatibilidade total com qualquer snapshot antigo.
