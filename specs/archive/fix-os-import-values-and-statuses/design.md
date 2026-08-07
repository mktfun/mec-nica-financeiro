# Design: Correção dos Valores e Statuses de OSs na Importação e Pátio (fix-os-import-values-and-statuses)

## Arquitetura Técnica

```
[Upload de Excel de OSs]
        │
        ▼
[useOsImportProcessor.ts]
        │ 1. Mapeia colunas e extrai pagamentos (Credito, Debito, PIX)
        │ 2. Calcula sumPayments = credit + debit + pix
        │ 3. Define total_value = max(rawTotal, paid + open, sumPayments)
        │ 4. Define paid_value = (open > 0 ? total_value - open : sumPayments)
        │ 5. Define status Enum ('em_aberto' | 'pago_parcial' | 'finalizado')
        ▼
[useImportProcessor.ts]
        │ Inclui status: os.status no payload de salvamento
        ▼
[Tabela public.patio_os no Supabase]
        │
        ├──► [src/routes/patio.tsx]
        │      ├── Exibe Total real, Pago real e Saldo em Aberto real
        │      └── Filtra pelas 4 abas (Todas, Em Aberto, Pagas Parcial, Finalizadas)
        │
        └──► [src/components/conciliacao/OsDetailModal.tsx]
               └── Calcula effectiveTotal e exibe resumo financeiro correto
```

## Interfaces e Fallbacks no Frontend

```typescript
export function getOsEffectiveValues(os: {
  total_value?: number;
  paid_value?: number;
  credit_value?: number;
  debit_value?: number;
  pix_transfer_value?: number;
  parsed_credit_debit?: number;
  parsed_pix_transfer?: number;
  status?: string;
}) {
  const credit = Number(os.credit_value || os.parsed_credit_debit || 0);
  const debit = Number(os.debit_value || 0);
  const pix = Number(os.pix_transfer_value || os.parsed_pix_transfer || 0);
  const sumPayments = credit + debit + pix;

  const rawTotal = Number(os.total_value || 0);
  const rawPaid = Number(os.paid_value || 0);

  const total = Math.max(rawTotal, rawPaid, sumPayments);
  const paid = rawPaid > 0 
    ? rawPaid 
    : (os.status === 'finalizado' ? total : (sumPayments > 0 ? sumPayments : 0));
  
  const open = Math.max(0, total - paid);

  let status = os.status || 'em_aberto';
  if (paid >= total && total > 0) {
    status = 'finalizado';
  } else if (paid > 0 && open > 0.05) {
    status = 'pago_parcial';
  } else if (paid === 0) {
    status = 'em_aberto';
  }

  return { total, paid, open, status };
}
```

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)

- **Cenário 1 (OS sem coluna total explícita, mas com Crédito e PIX):**
  - Estado inicial: Planilha contém OS com `Credito R$ 3.949,15 PIX R$ 6.509,40`.
  - Ação: Importar a planilha via Central de Importação.
  - Resultado esperado: O sistema salva `total_value = R$ 10.458,55`, `paid_value = R$ 10.458,55` e `status = 'finalizado'`.

- **Cenário 2 (OS em aberto sem pagamento):**
  - Estado inicial: Planilha contém OS com `Total R$ 1.500,00` e status `Em Aberto`.
  - Ação: Importar e visualizar no Pátio.
  - Resultado esperado: A OS é exibida sob a aba "Em Aberto", com `Total: R$ 1.500,00`, `Pago: R$ 0,00` e `Aberto: R$ 1.500,00`.

- **Cenário 3 (Modal de Detalhes):**
  - Estado inicial: Clicar na OS no Pátio ou na Conciliação.
  - Ação: Abrir `OsDetailModal`.
  - Resultado esperado: O modal exibe `Valor Total da OS: R$ 10.458,55` (não `R$ 0,00`) e lista os pagamentos extratados.
