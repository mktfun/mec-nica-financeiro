# Design: Faturamento Assistido sem OS e Correção de Incongruências no Pátio / Frontend (357)

## Arquitetura e Fluxo de Dados

```
[Sem Arquivos de OS: results.osFiles.length === 0]
       │
       ▼
[AssistedRevenueCalculator.tsx]
 ├── Input 1: Concil. Anterior (F_ant) -> auto de previousSnapshot.faturamento
 ├── Input 2: Faturamento Mês Anterior (F_mes_ant) -> digitado / lido de snapshot.metadata
 ├── Input 3: Mapa de Metas (F_metas) -> auto de results.mapaMetasResults ou digitado
 └── Cálculo: Faturamento Atual = (F_ant - F_mes_ant) + F_metas
       │
       ▼ [⚡ Aplicar ao Fechamento]
 Injeta em odometroHoje no CentralImportWizard.tsx
       │
       ▼
 handleConfirm() -> salva daily_snapshots com metadata:
 {
   faturamento_mes_anterior: F_mes_ant,
   faturamento_oi_base: F_metas,
   odometro_hoje: odometroHoje,
   status_geral: 'approved' / 'divergent'
 }
```

---

## Mutações em Arquivos Existentes [MODIFY]

### 1. `src/components/importacoes/wizard/AssistedRevenueCalculator.tsx`
- Interface com inputs para:
  - `previousOdometro` (Conciliação Anterior)
  - `initialFaturamentoMesAnterior` (Mês Anterior)
  - `initialMapaMetasFaturamento` (Mapa de Metas)
- Cálculo reativo em tempo real:
  - `baseMesAnterior = Math.max(0, Number(previousOdometro) - Number(faturamentoMesAnterior))`
  - `faturamentoAtual = baseMesAnterior + Number(mapaMetasFaturamento)`
- Botão *"⚡ Aplicar ao Fechamento"* que chama `onApplyCalculatedValue(faturamentoAtual)`.

### 2. `src/components/importacoes/CentralImportWizard.tsx`
- **Card 1 no Step 3:** Se `results.osFiles.length === 0`, renderiza `<AssistedRevenueCalculator />` com layout Dark UI Zinc-950 perfeitamente integrado. Se `results.osFiles.length > 0`, renderiza o Card clássico de Odômetro.
- **Card 4 (Contas a Pagar):** Sanitização estrita do valor com `toFixed(2)` e `Math.round`, evitando strings de ponto flutuante como `91200,72000000002`.
- **Step 1.5 (Pátio):** No `handleSaveAndAdvanceStep15`, converter os itens editados no acordeão do pátio para `results.osFiles` usando `convertManualPatioToOsImportResults`.
- **Payload do Fechamento (`handleConfirm`):** Persistir `metadata.faturamento_mes_anterior` no snapshot diário para que o dia seguinte já venha carregado automaticamente.

### 3. `src/hooks/useOcrOsProcessor.ts`
- Sanitizador `sanitizeOsNumber(raw)` que remove termos adjacentes como `Fatura`, `Fatur`, `Fat`, `OS`, `Nº`.
- Deduplicação de OSs repetidas na mesma loja via `Set<string>` com chave `${storeId}::${osNumber}`.

### 4. `src/lib/parsers/ocrOsAdapter.ts`
- Implementação de `convertManualPatioToOsImportResults(items, stores, targetDate)`.

---

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)

- **Cenário 1 (Sem Arquivos de OS):**
  - **SCAN:** Usuário sobe apenas OFX e Rede no Step 1.
  - **INFER:** `results.osFiles.length === 0`.
  - **VERIFY:** No Step 3, o Card 1 exibe os 3 inputs da fórmula assistida. O cálculo `(Concil. Anterior - Mês Anterior) + Metas` é gerado e aplicado. O card de Contas a Pagar exibe `R$ 91.200,72` (sem dízima).
- **Cenário 2 (Com Arquivos de OS):**
  - **SCAN:** Usuário sobe planilhas de OS.
  - **INFER:** `results.osFiles.length > 0`.
  - **VERIFY:** O Step 3 exibe o Odômetro clássico com $\Delta$ de Faturamento, 100% inalterado.
