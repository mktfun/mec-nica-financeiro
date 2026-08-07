# Research: RefatoraçÁo da Tela de ConciliaçÁo (Spec 033)

## Contexto Atual
A tela de conciliaçÁo diária (`src/routes/conciliacao.tsx`) atualmente exibe uma divergência baseada na fórmula:
`Divergência = Apurado Sistema - (Declarado Físico + Total Maquininhas)`

No entanto, o fluxo de caixa real da oficina requer a validaçÁo de que os valores lançados no sistema ("Apurado Sistema") entraram de fato na conta bancária ("Extrato Bancário"). A visualizaçÁo atual exibe os valores físicos e de maquininhas isoladamente, o que nÁo atende perfeitamente à visÁo de consolidaçÁo bancária desejada pelo cliente.

## Análise do Código Atual
1. O arquivo `src/routes/conciliacao.tsx` utiliza as variáveis:
   - `sys = rec?.financial_total || 0` (Apurado Sistema)
   - `fis = rec?.daily_cash || 0` (Físico/Dinheiro)
   - `maq = rec?.machine_total || 0` (Apurado Maquininha)
2. No banco de dados (`supabase.ts`), a tabela `reconciliations` possui essas três colunas. NÁo há uma coluna clara como `bank_total` (Extrato Bancário). Contudo, a lógica solicitada requer a substituiçÁo da exibiçÁo de `fis` e `maq` por um valor consolidado de extrato bancário.
3. Precisaremos:
   - Extrair ou calcular o valor do "Extrato Bancário" por loja.
   - Atualizar a interface (`conciliacao.tsx`) tanto no resumo global ("Aguardando Fechamento") quanto na listagem de cards por loja, substituindo as colunas de Físico e Maquininha pela de Extrato Bancário.
   - Atualizar a fórmula de divergência na UI para `Sistema - Extrato Bancário`.

## Decisões Arquiteturais
- **Backend:** Será necessário introduzir o campo `bank_total` na tabela `reconciliations` (via nova migration) ou agregar esse valor a partir das transações importadas com `type = 'in'` e origem de extrato/OFX/maquininha. Dado o padrÁo atual (de guardar totais na tabela de reconciliaçÁo), adicionar uma coluna `bank_total` (ou aproveitar uma já existente caso adaptável) fará o processamento ser mais rápido e consistente com os hooks atuais (`useConciliacaoResumo`, `useConciliacaoDetalhes`).
- **Frontend:** Os cards e o painel superior serÁo remodelados. O layout com "Apple Liquid Glass" recém introduzido será mantido, alterando as labels e removendo os inputs de ediçÁo manual de "Declarado Físico" daquela visÁo principal, simplificando a tela de conciliaçÁo para uma tela de conferência "Sistema vs Extrato".
