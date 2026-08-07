# Design: RefatoraçÁo do Faturamento e PIX na ConciliaçÁo Diária (faturamento-pix-refactor)

## Arquitetura Técnica
A lógica residirá inteiramente na funçÁo `queryFn` do `useModulo1StoresData` em `src/hooks/useConciliacao.ts`.
Fluxo:
1. `useModulo1StoresData` carrega OSs, Transações e Recebíveis.
2. Para o cálculo do PIX:
   - Filtramos do OFX (transações `source === 'ofx'`) aquelas que representam PIX/Transferência (usando regex no título/subtítulo, como já feito em `PixVsOfxTable`).
   - Mapeamos as OSs do dia que possuem pagamento do tipo PIX ou valor no campo `pix_transfer_value`.
   - Executamos um pseudo-match: se existe uma transaçÁo PIX no extrato de valor idêntico ao PIX declarado na OS (margem de R$ 0.05), consideramos como "Matched".
   - Somamos todos os valores das transações de OFX "Matched" na variável `pixOsMatched`.
3. Para o Faturamento:
   - Definimos `faturamento_atual = cartaoEntrou + pixOsMatched`.

## Componentes / Hooks / Funções
- Modificar `src/hooks/useConciliacao.ts` na exportaçÁo de `useModulo1StoresData`.
- NÁo afetará interfaces TypeScript exportadas. A interface `StoreSaldoState` permanecerá inalterada; apenas a sua hidrataçÁo de dados será diferente.

## Fluxo de UI
1. O usuário abre o Painel de ConciliaçÁo.
2. Os cards de Loja carregarÁo imediatamente os novos valores.
3. O Faturamento listado corresponderá exatamente ao valor da `Maquininha` + `PIX` daquela linha.

## Cenários de VerificaçÁo (SCAN → INFER → VERIFY → FIX)
- **Cenário 1 (PIX Casado):** OS no valor de 200 via PIX; OFX registra entrada de 200 PIX. -> `pixOs` = 200. Faturamento deve incluir 200.
- **Cenário 2 (PIX NÁo Casado):** OS no valor de 200 via PIX; Nenhum depósito OFX de 200. -> `pixOs` = 0. Faturamento nÁo inclui os 200. (Diferença evidenciará a falta).
- **Cenário 3 (Total Faturamento):** Uma loja teve 5.000 em CartÁo, 1.000 em PIX casados. Faturamento exibido deve ser exatamente 6.000.
