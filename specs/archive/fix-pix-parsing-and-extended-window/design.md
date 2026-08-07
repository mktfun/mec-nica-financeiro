# Design: Correção da Extração de PIX & Expansão da Janela de Conciliação (fix-pix-parsing-and-extended-window)

## 1. Parser Universal de Métodos de Pagamento em `useOsImportProcessor.ts`

```typescript
function parsePaymentMethods(paymentMethodStr: string, paidValue: number, osValue: number) {
  let parsed_credit = 0;
  let parsed_debit = 0;
  let parsed_pix_transfer = 0;

  if (paymentMethodStr) {
    const text = paymentMethodStr.toUpperCase();
    
    // Tenta capturar pares "METODO: VALOR" ou "METODO VALOR"
    const regex = /(PIX|TRANSF|DEP|DINHEIRO|DÉBITO|DEBITO|CRÉDITO|CREDITO|CARTAO|CARTÃO)\s*[:\-\s]?\s*(?:R\$\s*)?([\d\.,]+)?/gi;
    let match;
    let foundSpecificValue = false;

    while ((match = regex.exec(text)) !== null) {
      const method = match[1].toUpperCase();
      const valStr = match[2];
      const val = valStr ? parseValue(valStr) : (paidValue || osValue);

      if (method.includes('CREDITO') || method.includes('CRÉDITO') || method.includes('CARTAO') || method.includes('CARTÃO')) {
        parsed_credit += val;
        foundSpecificValue = true;
      } else if (method.includes('DEBITO') || method.includes('DÉBITO')) {
        parsed_debit += val;
        foundSpecificValue = true;
      } else if (method.includes('PIX') || method.includes('TRANSF') || method.includes('DEP') || method.includes('DINHEIRO')) {
        parsed_pix_transfer += val;
        foundSpecificValue = true;
      }
    }

    if (!foundSpecificValue) {
      if (text.includes('PIX') || text.includes('TRANSF') || text.includes('DEP') || text.includes('DINHEIRO')) {
        parsed_pix_transfer = paidValue || osValue;
      } else if (text.includes('DEBITO') || text.includes('DÉBITO')) {
        parsed_debit = paidValue || osValue;
      } else {
        parsed_credit = paidValue || osValue;
      }
    }
  } else {
    parsed_credit = paidValue || osValue;
  }

  return { parsed_credit, parsed_debit, parsed_pix_transfer };
}
```

## 2. Leitura de `patio_os` e Janela de Busca Ampliada em `useConciliacao.ts`

```typescript
// Janela de Busca D-0 até D-7 para extratos e vendas
const targetDateObj = new Date(date);
const searchDates: string[] = [];
for (let d = 0; d <= 7; d++) {
  const dObj = new Date(targetDateObj.getTime() - d * 86400000);
  searchDates.push(dObj.toISOString().split('T')[0]);
}

const { data: txs } = await supabase
  .from('transactions')
  .select('*')
  .eq('store_id', storeId)
  .in('target_date', searchDates);

// No mapeamento das OSs do Pátio:
const osPixList: any[] = [];
patioOs?.forEach(os => {
  const totalVal = os.paid_value !== undefined && os.paid_value !== null ? os.paid_value : (os.total_value || 0);
  const realPixVal = os.pix_transfer_value !== undefined && os.pix_transfer_value !== null ? os.pix_transfer_value : (os.parsed_pix_transfer || 0);
  
  const isPixMethod = (os.payment_method || '').toLowerCase().includes('pix') || (os.payment_method || '').toLowerCase().includes('transf');
  
  if (realPixVal > 0 || isPixMethod) {
    const pixVal = realPixVal > 0 ? realPixVal : totalVal;
    osPixList.push({
      os_number: os.os_number,
      client_name: os.client_name,
      amount: pixVal,
      raw_os: os
    });
  }
});
```

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)

- **Cenário 1 (Soma do Card de PIX):**
  - *Ação:* Navegar até a aba "3. PIX (OS -> Banco OFX)" da loja Dom Pedro.
  - *Resultado Esperado:* O card "PIX (OS Sistema Pátio)" exibe a soma real de todas as vendas com PIX declarado (e não R$ 0,00).
- **Cenário 2 (Matching de PIX de Dias Anteriores D-7):**
  - *Ação:* Abrir a conciliação do dia 23/07/2026.
  - *Resultado Esperado:* O PIX de R$ 680,00 recebido do cliente Ronildo no dia 17/07 é localizado na janela D-7 e faz match com a OS correspondente de R$ 680,00.
