# Design: Whisper Dots + Audit Trail (Spec 232)

## Arquitetura

1. **`src/hooks/useReconciliationInsights.ts`**:
   - Analisa os dados da conciliação para a data selecionada:
     - Compara entradas OFX tipo PIX vs OSs vinculadas.
     - Compara transações de maquininhas/Rede vs liquidação no OFX (`Cartões a compensar`).
     - Compara contagem e valores de OSs ativas no pátio.
     - Compara saídas no extrato OFX (`ofx_out`) vs `contas_manual + juros`.
   - Gera um mapa de `dots` por pilar (`severity` e `tooltip`) e uma lista estruturada de `observations`.

2. **`src/components/conciliacao/WhisperDot.tsx`**:
   - Renderiza micro-dot estático de 4px (`bg-amber-400/70` ou `bg-rose-400/70`) ao lado do rótulo do pilar.
   - Fornece tooltip nativo via atributo `title` do HTML sem overhead de libs externas.

3. **`src/components/conciliacao/AuditTrailBar.tsx`**:
   - Barra minimalista expansível/colapsável.
   - Exibe contagem de observações de forma discreta (`⚙ 2 observações · Expandir`).
   - Ao expandir, lista itens detalhados com delta financeiro e explicação clara.

4. **`src/components/conciliacao/ResumoDiaPanel.tsx`**:
   - Integra os `<WhisperDot />` nos 5 cards dos pilares.
   - Posiciona `<AuditTrailBar />` logo abaixo da seção de Consolidação do Dia.
