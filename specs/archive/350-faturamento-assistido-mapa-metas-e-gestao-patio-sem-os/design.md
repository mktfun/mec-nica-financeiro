# Design: Faturamento Assistido por Mapa de Metas e Gestão Dual de Pátio sem Import de OS (350)

## Arquitetura e Fluxo de Dados

```
[Upload de Arquivos] (OFX, Rede, Contas, Mapa de Metas)
        │
        ├── Se houver arquivos de OS (.xls) ────► [Fluxo Normal de Odômetro]
        │
        └── Se NÃO houver arquivos de OS (0 OSs) ──► [Fluxo Assistido sem OS]
                 │
                 ├── [Etapa Pátio]: <PatioManagementDualModal />
                 │      ├── Aba 1: Gestão Manual por Filial (10 Lojas)
                 │      │     └── Seleção rápida de formas de pagamento:
                 │      │         [ PIX | Crédito | Débito | Dinheiro | Boleto ]
                 │      │
                 │      └── Aba 2: OCR por Imagem (Prints do Pátio ERP)
                 │            └── IA extrai valores e métodos de pagamento
                 │
                 └── [Step 3 Inputs]: Card de Faturamento Assistido
                        └── (Faturamento Ant. - Faturamento Mês Ant.) + Faturamento Metas
```

---

## Interfaces TypeScript

```typescript
// src/components/importacoes/patio/PatioManualStoreGrid.tsx
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
  isModified?: boolean;
}

export interface AssistedRevenueInputs {
  faturamentoConciliacaoAnterior: number;
  faturamentoMesAnterior: number;
  faturamentoMapaMetas: number;
  faturamentoCalculado: number;
}
```

---

## Mutações em Arquivos Existentes [MODIFY]

### 1. `src/components/importacoes/CentralImportWizard.tsx`
- **Condicional no Step 3 para Faturamento Assistido:**
  - Renderiza `<AssistedRevenueCalculator />` inline quando `results.osFiles.length === 0`.
  - Permite importar PDF de Mapa de Metas ou digitar os 3 valores diretamente.
  - O botão *"Aplicar ao Faturamento"* atualiza o estado `odometroHoje` e persiste no `localStorage`.
- **Abertura do Novo Modal de Pátio (`PatioManagementDualModal`):**
  - Quando o operador aciona a conferência de pátio sem OS ou na virada de lote.

### 2. `[NEW] src/components/importacoes/patio/PatioManagementDualModal.tsx`
- Container em Dark UI Zinc-950 com 2 abas:
  - *Aba 1: "📋 Baixa Manual por Filial"* (renderiza `<PatioManualStoreGrid />`).
  - *Aba 2: "📸 Importação por Imagem / OCR"* (renderiza `<OcrBatchDropzoneAndPaste />` e `<OcrBatchReviewGrid />`).
- Botão primário *"Confirmar e Salvar Pátio"* que dispara `batch_upsert_patio_os`.

### 3. `[NEW] src/components/importacoes/patio/PatioManualStoreGrid.tsx`
- Seletor de lojas em tabs/pílulas horizontais.
- Cards das OSs da filial com chips coloridos de forma de pagamento:
  - PIX (Purple/Sky), Crédito (Indigo), Débito (Teal), Dinheiro (Emerald), Boleto (Amber).
- Quitação rápida de 1 clique e edição numérica.

---

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)

### Cenário 1: Fechamento sem Arquivos de OS com Mapa de Metas
- **Estado Inicial:** Importado apenas OFX, Rede e PDF de Mapa de Metas (0 arquivos de OS).
- **Ação:**
  1. No Step 3, o sistema exibe o card assistido com o Faturamento Anterior (ex: R$ 1.050.000), Faturamento Mês Anterior (ex: R$ 1.000.000) e Faturamento Mapa de Metas (ex: R$ 25.000).
  2. O operador clica em "Aplicar ao Faturamento" e o input de Faturamento é preenchido com R$ 75.000,00.
  3. No modal de pátio, o operador seleciona a filial "Dom Pedro", clica no chip `[ PIX ]` para a OS #1234 e quita 100%.
  4. Avança e finaliza a conciliação.
- **Resultado Esperado:** O faturamento fecha com precisão, a OS é baixada com método PIX e casa com o crédito no OFX sem divergência.

### Cenário 2: Fechamento Normal com Arquivo de OS
- **Estado Inicial:** Importado arquivo normal de OS (`.xls`).
- **Ação:** O Step 3 detecta `results.osFiles.length > 0`.
- **Resultado Esperado:** A calculadora assistida permanece desativada e o sistema executa o fluxo padrão de odômetro sem alterações.
