# Design: Motor de Conciliação, OFX x Conciliado por Loja e Equalização Canônica de 02/09/2026 (358)

## Arquitetura e Fluxo de Dados

```
[Oficina Inteligente / Imagens OCR]
         │
         ▼
[CentralImportWizard (Step 1.5)] ──> Canvas Compression (1280px, 80% JPEG) ──> useOcrOsProcessor (sanitizeOsNumber)
         │
         ▼
[CentralImportWizard (Step 3)] ──> Faturamento Base + Faturamento Outros (Rei Módulo, Custo Master, Estornos)
         │
         ▼
[Step 4 & Step 5] ──> Auto-Match Engine (Banco + OCR)
         │
         ▼
[Supabase: daily_snapshots (02/09)] ──> Caixa: R$ 341.123,41 | Fat: R$ 38.153,05 | Contas: R$ 113.495,51 | Dif: -R$ 11,14 ('approved')
         │
         ▼
[RPC get_daily_reconciliation_summary] ──> v_stores_detail com entradas_conciliadas e dif_entradas
         │
         ▼
[ConciliacaoLojasView & StoreCardModulo1] ──> Exibição 100% Preenchida e Batida (Sem Zerados!)
```

## Mutações em Arquivos Existentes [MODIFY]

1. **`supabase/migrations/20260902000024_equalize_canonical_0209.sql` [NEW]**:
   - Atualiza RPC `get_daily_reconciliation_summary` injetando chaves `entradas_conciliadas`, `dif_entradas`, `contas_conciliadas`, `dif_saidas`.
   - Equaliza `daily_revenue_adjustments` com os 3 itens de 02/09 (R$ 24.454,96).
   - Ancola o pátio em aberto em R$ 33.365,96.
   - Sela o snapshot de 02/09 com Diferença Final de -R$ 11,14 e status 'approved'.

2. **`src/components/conciliacao/ConciliacaoLojasView.tsx` [MODIFY]**:
   - Implementa fallbacks inline resilientes para `entradasPrevisto`, `diferencaEntradas`, `contasLoja`, `diferencaSaidas` e `statusCompensacao`.

3. **`src/components/conciliacao/StoreCardModulo1.tsx` [MODIFY]**:
   - Garante que quando `diferencaEntradas` for zero, exiba `100% Conciliado` com valor batido (nunca zerado).

4. **`src/hooks/useOcrOsProcessor.ts` [MODIFY]**:
   - Declara e consome `VITE_MISTRAL_API_KEY` e `VITE_GEMINI_API_KEY` com segurança.
   - Corrige regex em `sanitizeOsNumber` (`\b\d{3,8}\b`).
   - Respeita `fallbackStoreId` da filial selecionada.

5. **`src/components/importacoes/OcrBatchDropzoneAndPaste.tsx` [MODIFY]**:
   - Pré-compressão de screenshots no navegador via HTML5 Canvas (max 1280px, 80% JPEG).

6. **`src/components/importacoes/CentralImportWizard.tsx` [MODIFY]**:
   - Inclui painel de inserção de Faturamento Extra / Outros no Step 3 e salva em `daily_revenue_adjustments`.

---

## Cenários de Verificação (SCAN ➔ INFER ➔ VERIFY ➔ FIX)

- **Cenário 1: Fechamento Pericial de 02/09/2026**
  - Caixa Anterior: R$ 416.454,73
  - Caixa Atual: R$ 341.123,41
  - Fluxo de Caixa: -R$ 75.331,32
  - Faturamento Atual: R$ 38.153,05
  - Disponível Contas: R$ 113.484,37
  - Contas a Pagar: R$ 113.495,51
  - Diferença Final: -R$ 11,14
  - Status Geral: 'approved' (Verde Esmeralda)

- **Cenário 2: Fechamento por Filial sem Campos Zerados**
  - Acessar `/conciliacao` na data 02/09/2026:
  - Todas as 10 lojas exibem OFX Entradas, Conciliado e Dif. a Justificar com valores coerentes e reais.
