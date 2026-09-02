# Design: Controle de OS Estilo Planilha Excel por Loja (354)

## Arquitetura de Componentes

```
┌────────────────────────────────────────────────────────────────────────────┐
│ PatioExcelStoreAccordion.tsx (Componente Principal)                       │
│                                                                            │
│ ▼ Mauá (8 OSs) | Total: R$ 10.861,44 | Pago: R$ 8.400,00 | Aberto: R$ 2.461│
│ [+ Adicionar OS] [Recolher]                                                │
│ ┌───────┬──────────┬───────────┬──────────┬──────────┬──────────┬────────┐ │
│ │ OS    │ Data     │ Total OS  │ Pix      │ Crédito  │ Débito   │ Ação   │ │
│ ├───────┼──────────┼───────────┼──────────┼──────────┼──────────┼────────┤ │
│ │ 22582 │ 24/08/26 │[R$ 1.300] │ R$ 1.000 │ R$ 300   │ R$ 0,00  │ [Lançar│ │
│ └───────┴──────────┴───────────┴──────────┴──────────┴──────────┴────────┘ │
│                                                                            │
│ ▶ Santo André (21 OSs) | Total: R$ 18.230,00 ...                           │
│ ▶ Diadema (17 OSs) | Total: R$ 9.820,00 ...                                │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Tipos TypeScript (`EditablePatioOsItem`)

```typescript
export type PaymentMethodOption = 'PIX' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'DINHEIRO' | 'BOLETO' | 'TRANSFERENCIA' | 'EM_ABERTO';

export interface EditablePatioOsItem {
  id: string;
  os_number: string;
  store_id: string;
  store_name: string;
  client_name: string;
  plate: string;
  total_value: number;
  paid_value: number;
  pending_value: number;
  days_open: number;
  opened_at: string;
  status: 'em_aberto' | 'pago_parcial' | 'finalizada' | 'cancelada';
  payment_method: PaymentMethodOption;
  debit_value: number;
  credit_value: number;
  pix_transfer_value: number;
  cash_value: number;
  isModified?: boolean;
  isNewManual?: boolean;
}
```

---

## Mutações em Arquivos Existentes [MODIFY] e Novos [NEW]

1. `[NEW] src/components/importacoes/patio/PatioExcelStoreAccordion.tsx`:
   - Accordion por loja com persistência em `localStorage` (`expanded_stores_patio`).
   - Tabela estilo Excel com colunas de Pix, Crédito, Débito, Dinheiro, Total Pago e Restante.
   - Popover inline `PaymentLaunchPopover` para lançamento rápido de valor com atalho `[Usar Restante]`.
   - Edição direta de `Total OS` na célula com recálculo instantâneo de saldo e status.
   - Botão `[+ Adicionar OS]` no cabeçalho da loja que insere uma nova linha editável inline.

2. `[MODIFY] src/components/importacoes/patio/PatioManualStoreGrid.tsx`:
   - Wrapper que delega para `PatioExcelStoreAccordion`.

3. `[MODIFY] src/components/importacoes/CentralImportWizard.tsx`:
   - Renderizar `PatioExcelStoreAccordion` no Step 1.5.

4. `[MODIFY] src/components/importacoes/patio/PatioManagementDualModal.tsx`:
   - Renderizar `PatioExcelStoreAccordion` na aba manual.

---

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)

### Cenário 1: Lançamento de Pagamento Múltiplo (Pix + Crédito)
- **Estado Inicial:** OS #22582 com Total de R$ 1.300,00, Pago R$ 0,00.
- **Ação 1:** Clicar em `[Lançar]`, selecionar `Pix`, valor R$ 1.000,00 e clicar em `[Salvar]`.
- **Resultado 1:** A coluna Pix mostra R$ 1.000,00, Total Pago R$ 1.000,00, Restante R$ 300,00 e a linha fica amarela (pago parcial).
- **Ação 2:** Clicar novamente em `[Lançar]`, selecionar `Crédito`, clicar em `[Usar Restante: R$ 300,00]` e clicar em `[Salvar]`.
- **Resultado 2:** A coluna Crédito mostra R$ 300,00, Total Pago R$ 1.300,00, Restante R$ 0,00 e a linha fica verde (100% paga).

### Cenário 2: Adição de Nova OS Direto no Bloco da Loja
- **Ação:** Clicar em `[+ Adicionar OS]` no cabeçalho de Piraporinha.
- **Resultado Esperado:** Uma nova linha surge no final da tabela daquela loja, pronta para preenchimento de Nº da OS e Total.
