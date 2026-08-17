# Design: Correção de Filtro PIX vs Movimentações Bancárias e Sincronização de Diferenças por Loja (226)

## 1. Regra de Identificação de PIX de Cliente vs Movimentação Não-Operacional
No hook `useConciliacao.ts` (`useReconciliationViews` e `useModulo1StoresData`):
```typescript
export function isClientPixTransaction(title?: string, counterpart?: string): boolean {
  const text = `${title || ''} ${counterpart || ''}`.toUpperCase();
  
  // Transações explicitamente corporativas / bancárias
  const isCorporateOrBank = 
    text.includes('SISPAG') ||
    text.includes('REND PAGO') ||
    text.includes('APLIC AUT') ||
    text.includes('TRANSF CC') ||
    text.includes('APORTE') ||
    text.includes('RESGATE') ||
    text.includes('APLICACAO') ||
    text.includes('TAR BANCARIA') ||
    text.includes('BOLETO');

  if (isCorporateOrBank) return false;

  // PIX de clientes legítimos
  return text.includes('PIX') || text.includes('TED') || text.includes('DOC') || text.includes('DEP');
}
```

## 2. Redirecionamento para `ofxSemMatch` (Entradas Avulsas)
- Toda entrada que não for de adquirente (Rede/Cielo) e não for PIX de cliente legítimo entra em `ofxSemMatch`.
- As transações SISPAG, Aportes e Rendimentos aparecem imediatamente na tabela de Entradas Avulsas com o botão **[Justificar]**.

## 3. Abate de Diferença por Loja em `conciliacao.index.tsx`
- Cada transação justificada em uma loja (seja como `Somar` ou `Apenas Conciliar`) reduz a pendência/diferença daquela loja específica:
```typescript
const storeJustified = justifiedData?.totalByStore[store.id] || 0;
const diferencaAjustada = Math.max(0, log.diferenca - storeJustified);
```
- Se a loja tinha `Diferença = R$ 5.574,04` e o operador justifica `R$ 5.000,00` (Aporte) + `R$ 574,03` (SISPAG) + `R$ 0,01` (Rendimento), a diferença cai para **R$ 0,00** e o card fica verde com badge de fechamento aprovado!

## 4. Script de Limpeza dos Falsos Matches no Banco
- Executar limpeza em `ofx_transactions` onde `matched_os_number` está vinculado a SISPAG, REND PAGO ou APORTE, liberando-as para a aba de Entradas Avulsas.
