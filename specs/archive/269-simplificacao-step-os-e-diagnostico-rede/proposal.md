# Proposal: Simplificação do Card de OSs Ausentes no Wizard e Diagnóstico de Juros/Compensação Rede (269)

## Problema
1. **Poluição Visual e Duplicação no Wizard de Importação:** Na Step 3 de importação (`CentralImportWizard.tsx`), foram renderizados dois componentes/cards de OSs simultaneamente: o editor focado de OSs ausentes (`MissingPatioOsEditor`) e uma tabela completa redundante com todas as centenas de OSs do arquivo (`allPreviewOsList`). O usuário necessita apenas de **um único card**, focado exclusivamente nas OSs que precisam ser ajustadas manualmente por não terem vindo nos relatórios de pátio do dia.
2. **Divergência de Juros Rede (R$ 6.148,50 vs R$ 5.650,15):** No fechamento inicial, o valor de Juros Rede veio inflado em R$ 498,35 em relação à planilha oficial de 24/08.
3. **Classificação de Compensação da Rede por Loja (Entrou vs Não Entrou):** A conciliação por loja na RPC marcava lojas como Santo André (`st-08`) como `parcial` ou `não entrou` devido ao acúmulo de créditos de final de semana no extrato OFX e a termos com falso-positivo no filtro de maquininhas.

## Solução Proposta
1. **Unificação e Limpeza no `CentralImportWizard.tsx`:**
   - Remover a tabela secundária duplicada de todas as OSs do preview (`allPreviewOsList`).
   - Manter um **único card dedicado e limpo**: o `<MissingPatioOsEditor>`, permitindo ao usuário revisar e ajustar com agilidade apenas as OSs ausentes nos arquivos de hoje.
2. **Diagnóstico & Mitigação dos Juros Rede:**
   - O delta de R$ 498,35 foi originado pela duplicata de transação da Rede de R$ 2.588,37 em Santo André (`2.588,37 bruto - 2.090,02 líquido = 498,35 taxa/juros`). O saneamento já foi aplicado no banco e a deduplicação determinística no frontend impede novas duplicidades.
3. **Refinamento do Diagnóstico de Compensação de Cartões:**
   - Explicar com precisão a regra de conciliação de cartões para segundas-feiras (onde o OFX recebe os créditos acumulados de sexta a domingo), garantindo que lojas onde o valor creditado no extrato cobre as vendas sejam marcadas com clareza como `ENTROU`.

## Contratos de Dados
- Nenhuma migration nova necessária.
- Reutiliza o schema existente de `patio_os`, `pos_transactions`, `transactions` e `daily_snapshots`.

## Features Existentes Impactadas
- `CentralImportWizard.tsx` (Step 3 - Preview e Ajuste de OSs)
- `MissingPatioOsEditor.tsx`

## Risco Principal
- Ocultar a listagem geral de OSs não impacta a gravação, pois o backend e o hook `savePatioOsAndReceivables` continuam recebendo todas as OSs do payload normalmente. O risco é mínimo (100% contido no layout da Step 3).
