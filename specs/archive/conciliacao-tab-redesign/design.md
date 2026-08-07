# Design: Redesign e CorreçÁo Lógica das Abas de ConciliaçÁo por Loja (conciliacao-tab-redesign)

## Arquitetura Técnica

```
[Dados da Loja no Supabase (transactions, patio_os, conciliation_matches)]
       │
       ▼
[useConciliacao.ts -> useReconciliationViews()]
       │
       ├─► Aba 1 (osVsRede):
       │     └─► Compara Rede Bruto vs OS Valor CartÁo (Delta = 0 se pareado)
       │
       ├─► Aba 2 (redeVsOfx):
       │     ├─► Total Rede Líquido
       │     └─► Total OFX Adquirente (REDE / REDECARD / MAST / VISA / ELO / PAGAMENTO S.A.)
       │
       ├─► Aba 3 (pixVsOfx - NOVA):
       │     ├─► OSs pagas via PIX / Transferência
       │     └─► Entradas de PIX no Extrato OFX (Filtradas por valor ou vínculo)
       │
       └─► Aba 4 (ofxSemMatch):
             └─► Extratos OFX que NÁO SÁO Adquirente e NÁO foram vinculados a PIX/OS
```

## Componentes / Hooks Afetados

1. **`src/hooks/useConciliacao.ts`:**
   - Atualizar `useReconciliationViews` para calcular a nova Aba 3 (`pixVsOfx`) e excluir os depósitos de adquirente pareados da Aba 4 (`ofxSemMatch`).
   - Ajustar a lógica de `delta` na Aba 1 para respeitar o valor real de faturamento em cartÁo da OS.

2. **`src/routes/conciliacao._lojaId.tsx`:**
   - Atualizar o header de abas de navegaçÁo para 4 abas claras:
     1. `1. CartÁo (OS → Maquininha)`
     2. `2. Maquininha (Líq) → Banco`
     3. `3. PIX (OS → Banco OFX)`
     4. `4. Banco (Sem Origem)`

3. **`src/components/conciliacao/PixVsOfxTable.tsx` (NOVO Componente):**
   - Tabela dedicada para conciliar entradas de PIX do Pátio com lançamentos de PIX no Extrato Bancário.

## Cenários de VerificaçÁo

### Cenário 1: EliminaçÁo de Falso "NÁo Identificado" na Loja Dom Pedro (DP)
- **Estado Inicial:** Depósito de cartÁo `RECEBIMENTO REDE MAST... R$ 2.519,10` aparecia em Aba 2 como Pareado e em Aba 3 como NÁo Identificado.
- **AçÁo:** Atualizar filtro em `useConciliacao.ts`.
- **Resultado Esperado:** O depósito de `R$ 2.519,10` aparece como `PAREADO` na Aba 2 e é **removido** da Aba de NÁo Identificados.

### Cenário 2: ExibiçÁo da Aba 3 (PIX OS vs Banco OFX)
- **Estado Inicial:** Lançamentos de PIX em OSs (ex: `PIX: 385,00`) nÁo tinham aba dedicada de conciliaçÁo.
- **Resultado Esperado:** A Aba 3 exibe o total de PIXs registrados nas OSs da loja comparados contra as entradas bancárias de PIX no OFX.
