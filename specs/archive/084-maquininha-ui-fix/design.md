# Design: Fix Maquininha Conciliation & Preview (084)

## Arquitetura Técnica
A camada de importação `CentralImportWizard.tsx` deve preparar um array em memória de `transactions` (txsToInsert) antes de fazer o POST para o Supabase. Restauraremos a lógica de adicionar objetos `maquininhaItems` e `redeResults` nesse array para garantir a visibilidade nas tabelas de conciliação.
Os hooks React-Query em `useConciliacao.ts` serão ajustados para isolar rigidamente as datas baseando-se em `target_date`, erradicando as anomalias onde dias sem importação puxavam transações importadas com `target_date` diferente.

## Componentes / Hooks

1. **`CentralImportWizard.tsx`**:
   - Função `handleConfirm`: 
     - Adicionar iteração sobre `maqByStore` e `redeByStore` para gerar transações de `source: 'maquininha'` e `source: 'rede'` e empurrar (push) para `txsToInsert` com o respectivo `target_date`.
   - Renderização da UI (Card da loja):
     - Atualizar o cálculo de `storeRedeNet` para somar também o valor de `results.maquininhaItems` que tenham o `storeName` correspondente à loja.
2. **`useConciliacao.ts`**:
   - `useSystemTransactions(date)`: Trocar `created_at` (range de 24h) por `.eq('target_date', date)`.
   - `useDailyReconciliationDelta(targetDate)`: Trocar `occurred_at` (range de 24h) por `.eq('target_date', targetDate)`.

## Funções Auxiliares Necessárias
Utilizaremos `crypto.randomUUID()` para os IDs das transações de maquininha, e a função `generateSyntheticFitId` (se importada) ou uma chave única composta para evitar colisões ao re-importar.

## Fluxo de UI
1. O usuário visualiza o preview na etapa 3: a coluna "Maquininha" exibe a soma de Rede + Maquininhas genéricas juntas sem confusão.
2. O usuário conclui a importação.
3. Ao abrir a tela de Conciliação, o total de Maquininha aparece corretamente (não zerado).
4. O usuário muda para o dia anterior (onde não importou nada): os valores ficam perfeitamente zerados sem herdar transações de arquivos antigos.
