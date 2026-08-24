# Design: Refinamento Estrito do Modal de Vínculo Manual de PIX com OS (Spec 276)

## Arquitetura Técnica do Fluxo de Vínculo

```
┌────────────────────────────────────────────────────────────────────────┐
│ StoreExtratoBancarioView (Transação Bancária de PIX não identificada) │
│  Ex: R$ 200,00 - ENTRADA PIX TRANSF RENATO                             │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ Clica em "Vincular OS"
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ ManualMatchOsModal (storeId="st-09", targetDate="2026-08-24")          │
│                                                                        │
│ 1. Busca em patio_os WHERE store_id = "st-09"                          │
│ 2. Busca em ofx_transactions WHERE store_id = "st-09"                  │
│    AND matched_os_number IS NOT NULL → Set de OSs já vinculadas        │
│ 3. FILTRA APENAS CANDIDATOS VÁLIDOS:                                   │
│    - os_number NOT IN (OSs já vinculadas)                              │
│    - pix_transfer_value > 0 OU forma de pagamento contém PIX/TRANSF     │
│      OU saldo em aberto > 0                                            │
│    - NÃO inclui OSs pagas exclusivamente em Cartão ou Dinheiro          │
│ 4. ORDENAÇÃO:                                                          │
│    - 1º: Match Exato no valor de PIX (|pixVal - txAmount| < 0.05)      │
│    - 2º: Menor diferença no saldo de PIX                               │
│    - 3º: Data recente da conciliação                                   │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ Usuário clica em "Vincular"
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ useManualMatch.linkTransactionToOs                                     │
│ 1. UPDATE ofx_transactions SET matched_os_number = os.os_number        │
│ 2. UPDATE transactions SET os_number = os.os_number, status='completed'│
│ 3. Invalida queries de conciliação, extrato e dashboard                │
│ 4. Diferença da loja reduz automaticamente pelo valor vinculado        │
└────────────────────────────────────────────────────────────────────────┘
```

## Modificações nos Componentes e Hooks

### 1. `src/hooks/useManualMatch.ts`:
- Atualizar `useAvailableStoreOs(storeId, date)`:
  - Fazer join/subquery com `ofx_transactions` para obter `matched_os_number` daquela filial e descartar OSs já conciliadas.
  - Filtrar para retornar apenas OSs onde `pix_transfer_value > 0` OU `payment_method ILIKE '%PIX%'` OU `(total_value - paid_value) > 0`.
  - Descartar OSs com `payment_method` puramente em Cartão/Dinheiro onde `paid_value = total_value` e `pix_transfer_value = 0`.

### 2. `src/components/conciliacao/ManualMatchOsModal.tsx`:
- Ajustar cálculo de ordenação para comparar `txAmount` contra `os.pix_transfer_value` (ou saldo em aberto `total_value - paid_value`), eliminando o fallback que usava valor de cartão de crédito.
- Exibir badge claro de forma de pagamento (`PIX`, `Em Aberto`) e valor esperado de PIX.

### 3. `src/components/conciliacao/StoreExtratoBancarioView.tsx`:
- Passar `targetDate={date}` para `<ManualMatchOsModal>`.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1 (Mesma Loja e Não Vinculada):**
  - Ao abrir o modal em Rei do Módulo (`st-09`), nenhuma OS de Planalto (`st-06`) ou Santo André (`st-08`) aparece na lista.
- **Cenário 2 (Bloqueio de OS Paga em Cartão):**
  - Uma OS paga com R$ 4.714,70 em Cartão de Crédito não aparece como match para um PIX de R$ 4.714,70.
- **Cenário 3 (Bloqueio de OS Já Vinculada):**
  - Se a OS #574 já está vinculada a um depósito de PIX, ela não aparece na lista para novos vínculos.
