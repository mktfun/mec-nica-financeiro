# Design: Ajuste no Importador e Motor de ConciliaçÁo Módulo 2 — OS Bruta, Status Finalizado, Busca Histórica e Trava Anti-DuplicaçÁo (conciliacao-os-parsing-history-fix)

## Fluxo de ConciliaçÁo com Trava Anti-DuplicaçÁo

```
 ┌────────────────────────────────────────────────────────┐
 │ 1. TRANSAÇÁO DE ENTRADA (Hoje: R$ 380,00 no OFX/Rede)  │
 └───────────────────────────┬────────────────────────────┘
                             │
                             ▼
 ┌────────────────────────────────────────────────────────┐
 │ 2. POOL DE OSs CANDIDATAS DA LOJA                      │
 │    - Busca OSs sem filtro rígido de data              │
 │    - EXCLUI OSs com status = 'ENTROU' ou já em         │
 │      conciliation_matches                              │
 └───────────────────────────┬────────────────────────────┘
                             │
                             ▼
 ┌────────────────────────────────────────────────────────┐
 │ 3. MATCHING PELO VALOR BRUTO (credit_debit_value)      │
 │    - Localiza OS #902 Nova (R$ 380,00 Bruto em cartÁo) │
 │    - Ignora OS #549 Antiga de ontem (Já 'ENTROU')     │
 └───────────────────────────┬────────────────────────────┘
                             │
                             ▼
 ┌────────────────────────────────────────────────────────┐
 │ 4. REGISTRO & BAIXA DE SEGURA                           │
 │    - Salva match em conciliation_matches               │
 │    - patio_os.status = 'ENTROU'                        │
 └────────────────────────────────────────────────────────┘
```

## Trava Anti-DuplicaçÁo em `useConciliacao.ts`

```typescript
// 1. Carregar todas as OSs que JÁ foram conciliadas anteriormente
const matchedOsNumbers = new Set(
  (matches || []).map(m => m.system_os_number).filter(Boolean)
);

// 2. Filtrar o pool de OSs candidatas para o matching
const availableOsForMatching = (patioOs || []).filter(os => {
  const isAlreadyClosed = os.status === 'ENTROU';
  const isAlreadyMatched = matchedOsNumbers.has(os.os_number);
  return !isAlreadyClosed && !isAlreadyMatched;
});
```

## Regex de Parsing de Pagamentos (`useOsImportProcessor.ts`)

```typescript
export function parsePaymentMethodString(paymentStr: string, defaultAmount: number) {
  let parsed_credit = 0;
  let parsed_debit = 0;
  let parsed_pix_transfer = 0;

  if (!paymentStr) {
    return { parsed_credit: defaultAmount, parsed_debit: 0, parsed_pix_transfer: 0 };
  }

  const str = paymentStr.trim();

  if (str.includes(':')) {
    const parts = str.split(';');
    parts.forEach(part => {
      const match = part.match(/([a-zA-ZÀ-ÿ\s]+):\s*([\d.,]+)/);
      if (match) {
        const method = match[1].toUpperCase().trim();
        const val = parseFloat(match[2].replace(/\./g, '').replace(',', '.')) || 0;

        if (method.includes('CREDITO') || method.includes('CRÉDITO') || method.includes('CARTAO') || method.includes('CARTÁO')) {
          parsed_credit += val;
        } else if (method.includes('DEBITO') || method.includes('DÉBITO')) {
          parsed_debit += val;
        } else if (method.includes('PIX') || method.includes('TRANSF') || method.includes('DEP') || method.includes('DINHEIRO')) {
          parsed_pix_transfer += val;
        }
      }
    });
  } else {
    const lower = str.toLowerCase();
    if (lower.includes('credito') || lower.includes('crédito') || lower.includes('cartao') || lower.includes('cartÁo')) {
      parsed_credit = defaultAmount;
    } else if (lower.includes('debito') || lower.includes('débito')) {
      parsed_debit = defaultAmount;
    } else if (lower.includes('pix') || lower.includes('transf') || lower.includes('dep')) {
      parsed_pix_transfer = defaultAmount;
    }
  }

  return { parsed_credit, parsed_debit, parsed_pix_transfer };
}
```

## Cenários de VerificaçÁo (SCAN → INFER → VERIFY → FIX)

- **Cenário 1 (OS Finalizada no Dia 21 com R$ 3.385,00 no Crédito - Primeira ConciliaçÁo):**
  - *Dados:* OS #549 finalizada emitida no dia 21 com pagamento `Credito: 3385.00`. Lançamento de maquininha entra no extrato hoje.
  - *AçÁo:* Rodar a conciliaçÁo.
  - *Resultado Esperado:* O motor localiza a OS #549 (que ainda está pendente de conciliaçÁo) e pareia $1:1$ com o lançamento da maquininha. Ao fechar, atualiza a OS para `status = 'ENTROU'`.

- **Cenário 2 (Trava Anti-DuplicaçÁo no Dia Seguinte):**
  - *Dados:* AmanhÁ entra outro lançamento de R$ 3.385,00 no extrato. A OS #549 já possui status `'ENTROU'`.
  - *AçÁo:* Rodar a conciliaçÁo de amanhÁ.
  - *Resultado Esperado:* O sistema ignora a OS #549 (já conciliada) e busca apenas OSs pendentes novas dos arquivos recentes. O novo lançamento fica como "Pendente" se nÁo houver OS nova de R$ 3.385,00.
