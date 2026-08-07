# Design: Cadeia de ConciliaçÁo Quádrupla (OS × Maquininha × PIX × Extrato OFX) e Baixa Automática 'ENTROU' (conciliacao-quadrupla-entrou)

## Fluxo da Cadeia de ConciliaçÁo em 4 Pontas

```
                     [1. OS Lançada pelo Gerente]
               (Valor Total, Crédito/Débito, PIX, Dinheiro)
                                   │
                                   ▼
          ┌─────────────────────────────────────────────────┐
          │ 2. Cruzamento OS ↔ Maquininha (Rede Líquido)    │
          │    (Mesma Loja, Mesmo Valor, Janela D0/D-1)     │
          └────────────────────────┬────────────────────────┘
                                   │ Bateu 100%
                                   ▼
          ┌─────────────────────────────────────────────────┐
          │ 3. Cruzamento Maquininha/PIX ↔ Extrato OFX      │
          │    (Depósito de Adquirente ou PIX no Banco)     │
          └────────────────────────┬────────────────────────┘
                                   │ Bateu 100%
                                   ▼
          ┌─────────────────────────────────────────────────┐
          │ 4. BAIXA AUTOMÁTICA 'ENTROU'                    │
          │    - patio_os.status = 'ENTROU'                 │
          │    - patio_os.paid_value = total_value          │
          │    - Valor pendente 'NA LOJA' reduzido a R$ 0,00│
          │    - Valor migra para Saldo Realizado do Itaú   │
          └─────────────────────────────────────────────────┘
```

## Estrutura de Tipos e Lógica de Baixa

```typescript
export interface QuadrupleMatchCheck {
  os_number: string;
  store_id: string;
  target_date: string;
  is_os_found: boolean;
  is_rede_matched: boolean;
  is_ofx_matched: boolean;
  is_pix_matched: boolean;
  can_auto_close: boolean; // True quando todas as 3 pontas anteriores fecham
}

export interface OsStatusUpdatePayload {
  os_id: string;
  os_number: string;
  store_id: string;
  status: 'ENTROU' | 'PENDENTE' | 'DIVERGENTE';
  matched_rede_ids: string[];
  matched_ofx_ids: string[];
}
```

## Algoritmo de AvaliaçÁo da Baixa Automática

```typescript
function evaluateQuadrupleMatching(
  osItem: any,
  redeMatches: any[],
  ofxMatches: any[]
): QuadrupleMatchCheck {
  const osCreditVal = osItem.parsed_credit_debit || 0;
  const osPixVal = osItem.parsed_pix_transfer || 0;
  
  // 1. Checar se a parcela de cartÁo bateu com a maquininha (Rede)
  const redeMatch = redeMatches.find(r => 
    r.os_number === osItem.os_number || 
    Math.abs(r.rede_bruto - osCreditVal) < 0.5
  );
  
  // 2. Checar se o valor líquido da maquininha ou o depósito bancário bateu com OFX
  const ofxMatch = ofxMatches.find(o => 
    o.isMatched && (redeMatch ? o.childRedeTxs.some((c: any) => c.id === redeMatch.id) : false)
  );

  // 3. Checar se a parcela em PIX (se houver) bateu no extrato OFX
  const pixMatch = osPixVal > 0 
    ? ofxMatches.some(o => Math.abs(o.ofxDeposit?.amount - osPixVal) < 0.5)
    : true;

  const isRedeOk = osCreditVal === 0 || !!redeMatch;
  const isOfxOk = osCreditVal === 0 || !!ofxMatch;
  const isPixOk = osPixVal === 0 || pixMatch;

  const canAutoClose = isRedeOk && isOfxOk && isPixOk;

  return {
    os_number: osItem.os_number,
    store_id: osItem.store_id,
    target_date: osItem.opened_at,
    is_os_found: true,
    is_rede_matched: isRedeOk,
    is_ofx_matched: isOfxOk,
    is_pix_matched: isPixOk,
    can_auto_close: canAutoClose
  };
}
```

## AtualizaçÁo nos Componentes de Interface

1. **`src/components/conciliacao/OsVsRedeTable.tsx`**:
   - Exibir a tag de status **`✅ ENTROU`** (verde neon) quando a OS satisfizer as 4 pontas da conciliaçÁo.
   - Adicionar botÁo/açÁo para disparar a baixa em lote das OSs elegíveis para `ENTROU`.

2. **`src/components/conciliacao/OsDetailModal.tsx`**:
   - Exibir o indicador visual de fechamento quádruplo:
     - 1. OS Gerente: `R$ 4.021,50` (OK)
     - 2. Maquininha Rede: `R$ 4.021,50` (OK)
     - 3. Extrato OFX Banco: `R$ 4.021,50` (OK)
     - 4. Status Final: **`ENTROU`**

3. **`src/routes/conciliacao.$lojaId.tsx`**:
   - Exibir o resumo do saldo realizado vs saldo pendente "Na Loja" em alinhamento com a Aba SALDO da planilha `CONCILIACAO-2307.xlsx`.

## Cenários de VerificaçÁo (SCAN → INFER → VERIFY → FIX)

- **Cenário 1 (Cadeia Completa 4 Pontas Fechada):**
  - *Dado:* OS #549 (R$ 4.021,50 no Crédito) lançada na loja Dom Pedro I. Venda de R$ 4.021,50 importada na Rede. Depósito de R$ 4.021,50 presente no extrato Itaú (OFX).
  - *AçÁo:* Executar conciliaçÁo.
  - *Resultado Esperado:* As 3 pontas batem. O sistema atualiza `patio_os.status` para `ENTROU`. A OS sai da lista de pendências "Na Loja" e migra para o saldo realizado.

- **Cenário 2 (OS com Pagamento Fracionado Crédito + PIX):**
  - *Dado:* OS #550 (R$ 1.718,45 no Crédito + R$ 385,00 no PIX).
  - *AçÁo:* Executar conciliaçÁo.
  - *Resultado Esperado:* O sistema valida R$ 1.718,45 na Rede, R$ 1.718,45 no OFX e R$ 385,00 no PIX do OFX. As 4 pontas fecham -> Status `ENTROU`.

- **Cenário 3 (Ponta Faltando - Maquininha bateu mas Banco nÁo caiu):**
  - *Dado:* OS #551 (R$ 500,00 no Crédito). Venda de R$ 500,00 na Rede, mas o depósito ainda nÁo caiu no OFX.
  - *AçÁo:* Executar conciliaçÁo.
  - *Resultado Esperado:* A ponta 3 (Banco) falha. A OS permanece como `PENDENTE / NÁO ENTROU` e continua listada no saldo "Na Loja".
