# Design: Correção de Total da OS vs Saldo Devedor no Pátio e Sincronização com CONCILIAÇÃO 0909.xlsx (383)

## Arquitetura e Fluxo de Dados

```
CONCILIAÇÃO 0909.xlsx (Aba OS)
  ├── Coluna B (OS): Número da OS
  ├── Coluna C (Data): Data serial
  ├── Coluna D (Valor): Saldo Restante / Devedor (Na Loja) -> Soma = R$ 70.204,89
  └── Coluna E (PAGAMENTOS): Decomposição dos pagamentos -> Soma = R$ 39.817,64
         │
         ▼
  [Parser / Script de Sincronização Canonical]
  - Calcula: total_value = restante + pago
  - Decompõe: credit_value, debit_value, pix_transfer_value, cash_value
  - Atribui status canônico: finalizada (restante=0), pago_parcial (restante>0 & pago>0), em_aberto
         │
         ▼
  Tabela PostgreSQL: public.patio_os
  - Preserva total_value real (R$ 110.022,53)
  - Preserva paid_value amortizado (R$ 39.817,64)
  - Saldo líquido remanescente ativo = R$ 70.204,89
         │
         ▼
  MissingPatioOsEditor.tsx (Step 2.5)
  - Coluna 1: Loja
  - Coluna 2: OS / Placa
  - Coluna 3: Valor Total da OS (R$) -> R$ total_value real
  - Coluna 4: Valor Pago (R$) -> R$ paid_value amortizado
  - Coluna 5: Saldo Devedor / Na Loja (R$) -> R$ (total_value - paid_value)
  - Ação: "Dar Baixa" ajusta paid_value = total_value & status = 'finalizada'
```

---

## Interfaces TypeScript

```typescript
export interface MissingPatioOsEdit {
  id: string;
  os_number: string;
  plate: string;
  store_id: string;
  store_name: string;
  original_total_value: number; // Valor Total Bruto original
  original_paid_value: number;  // Valor Pago original
  original_status: string;
  total_value: number;          // Valor Total Bruto da OS (editável ou preservado)
  paid_value: number;           // Valor Pago acumulado
  status: 'em_aberto' | 'pago_parcial' | 'finalizada' | 'cancelada';
  opened_at?: string;
  days_open?: number;
}
```

---

## Mutações em Arquivos Existentes [MODIFY]

1. **`src/components/importacoes/MissingPatioOsEditor.tsx` [MODIFY]:**
   - Corrigir rótulos dos cabeçalhos da tabela:
     - Cabeçalho 3: `Valor Total da OS (R$)`
     - Cabeçalho 4: `Valor Pago Anteriormente (R$)`
     - Cabeçalho 5: `Saldo Devedor no Pátio (R$)`
   - No cálculo do saldo e no resumo superior (`originalTotalSaldo`, `novoTotalSaldo`), manter a regra estrita:
     ```typescript
     const saldo = Math.max(0, item.total_value - item.paid_value);
     ```
   - Na ação de dar baixa individual ou em lote:
     - `paid_value: item.total_value`
     - `status: 'finalizada'`
     - Garantir que `total_value` não seja zerado nem sobrescrito com o saldo devedor.

2. **`src/components/importacoes/CentralImportWizard.tsx` [MODIFY]:**
   - Na função `detectMissingOs`:
     - Carregar `total_value`, `paid_value`, `status` com valores reais canônicos.
     - Garantir que o cálculo de `total_value` nunca seja inferior ao saldo restante caso haja inconsistência legada.

3. **Script de Ingestão e Sincronização `scripts/sync-patio-os-0909.cjs` [NEW/TOOL]:**
   - Ler a planilha `C:\Users\admin\Downloads\CONCILIAÇÃO 0909.xlsx` (Aba `OS`).
   - Mapear todas as 60 OSs para as lojas correspondentes.
   - Atualizar a tabela `patio_os` no Supabase com `total_value`, `paid_value`, métodos de pagamento e status.
   - Validar que a soma de `total_value - paid_value` para OSs ativas resulta em **R$ 70.204,89**.

---

## Cenários de Verificação (SCAN -> INFER -> VERIFY -> FIX)

### Cenário 1: Sincronização de Dados de 09/09/2026
- **Estado Inicial:** `patio_os` contém OSs legadas com `total_value` distorcido (ex.: OS #8763 com 1971.16).
- **Ação:** Execução do script de sincronização com `CONCILIAÇÃO 0909.xlsx`.
- **Resultado Esperado:** 60 OSs sincronizadas; OS #8763 possui `total_value = 4691.16`; soma dos saldos devedores de todas as lojas é **R$ 70.204,89**.

### Cenário 2: Exibição e Ação no Componente `MissingPatioOsEditor`
- **Estado Inicial:** Usuário abre a etapa de Carryover no Wizard de importação.
- **Ação:** Inspecionar os valores exibidos na tabela e clicar em "Dar Baixa" em uma OS.
- **Resultado Esperado:**
  - O valor total exibido é o valor integral da OS.
  - O valor pago exibe os pagamentos anteriores.
  - O saldo restante exibe o saldo devedor correto.
  - Ao dar baixa, `paid_value` iguala `total_value` e o saldo restante passa a R$ 0,00.
