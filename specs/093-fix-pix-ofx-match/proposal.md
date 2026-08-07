# Proposal: Fix PIX x OFX Matching na ConciliaçÁo (093-fix-pix-ofx-match)

## Contexto e Problema
Na tela de ConciliaçÁo, especificamente na tabela "Fechamento por Loja" (`conciliacao.index.tsx`), a coluna "PIX" exibe a expectativa gerada pelas Ordens de Serviço (OS) com sucesso (ex: R$ 5.000,00). No entanto, a coluna "Faturamento" (que reflete o valor estrito validado via OFX bancário) fica permanentemente zerada (R$ 0,00), criando uma "Diferença" irreal de R$ 5.000,00.

O erro foi diagnosticado: as entradas brutas vindas de arquivos OFX (ex: extrato do Itaú) nascem sem `store_id` (sÁo nulas), pois a conta bancária costuma ser centralizada. Contudo, o algoritmo no `useModulo1StoresData` filtra estritamente `t.store_id === store.id` para encontrar as transações PIX, o que inviabiliza o "match" entre a OS (que tem loja) e a entrada do banco (que nÁo tem).

## SoluçÁo Proposta
1. **Afrouxar o Filtro de Busca (Hook):** Ao processar o array `ofxPixTxs` no hook `useConciliacao.ts`, as transações oriundas do OFX (`source === 'ofx'`) com `store_id === null` devem ser elegíveis para o algoritmo de match, caso os valores e as datas batam com as expectativas.
2. **SeparaçÁo Semântica Clara:** O hook deve exportar isoladamente a `pix_expectativa` (criada pela OS) e o `pix_ofx_matched` (o valor do OFX que confirmou essa expectativa). O `faturamento_atual` passará a ser estritamente a soma dos matches bancários (`cartao_ofx_matched + pix_ofx_matched`).
3. **Frontend Exato:** A tabela de UI mapeará as colunas de acordo com essa separaçÁo rígida e aplicará uma tolerância (Math.abs < 1.0) para anular distorções de centavos.

## Contratos de Dados
- NÁo há migrações no banco de dados. O ajuste reside puramente na lógica de agregaçÁo em memória (Frontend/Hooks).
