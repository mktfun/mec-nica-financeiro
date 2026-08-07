# Design: Conserto do Match de PIX (095)

## Arquitetura Técnica

### 1. `useConciliacao.ts`
O filtro textual falha em conciliar depósitos ou transferências cujas nomenclaturas variam entre bancos (ex: depósitos em dinheiro, nomenclaturas legadas de TED).
- **Antes:** `return txt.includes('PIX') || txt.includes('TRANSF')...`
- **Depois:** O filtro `ofxPixTxs` apenas verificará `t.source === 'ofx' && t.type === 'in'`. Qualquer entrada OFX torna-se elegível para a dedução matemática.

### 2. `conciliacao.index.tsx`
A tela de conciliação utilizava a variável derivada matematicamente `pix_os` (que sofria do bug de nomenclatura) por conta das falhas nas amarrações do Banco (Wipeout Bug). Como a integridade relacional (`conciliation_matches`) foi restaurada, devemos reabilitar o uso de `faturamento_real_ofx`.
- **Fórmula de Exibição:** `const faturamento = maquininha + storeMod1.faturamento_real_ofx`
- **Por que isso é seguro agora?** Porque a amarração entre OS e OFX sobrevive aos re-uploads, garantindo que o `faturamento_real_ofx` contenha o valor exato conciliado no banco.
