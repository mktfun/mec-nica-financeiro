# Goal Description

Corrigir a matemática do Painel Global de Conciliação e permitir a edição manual (override) dos valores de Contas a Pagar, resolvendo a divergência de R$ 8k reclamada pelo usuário e garantindo que o `Na Loja OS` global some corretamente as lojas, sem ficar preso em um loop de `0`.

## Background

1. **Na Loja OS Global (Pátio):** No momento, o valor Global do Pátio na tela de Conciliação Diária lê do valor salvo no banco (`currentSnapshot?.total_patio`). O problema é que, como o usuário salvou o valor com R$ 0,00 anteriormente (devido ao bug que já corrigimos), o sistema travou nesse 0 e nunca mais soma o legado correto. Como a tela de conciliação é *read-only*, ele não tem como consertar.
2. **Contas a Pagar (OFX vs Conciliação Manual):** A pedido anterior, automatizamos o "Contas a Pagar" para somar 100% de todas as saídas (`out`) do OFX. O resultado foi `114k`. Porém, a conciliação manual do usuário resulta em `106k`, indicando que há transações de saída no OFX (como resgates, transferências entre contas da mesma empresa, etc.) que *não devem* ser consideradas como "Contas a Pagar". Como removemos o input manual na Importação, o usuário perdeu o poder de corrigir esse número.
3. **Dupla Contagem de Juros:** A conta de "Valor Contas" parece somar `contas_a_pagar + juros_rede + provisao`. Se o OFX já contém as tarifas da Rede misturadas nas saídas `out`, somá-las de novo duplica os juros no fechamento.

## User Review Required

> [!IMPORTANT]
> **Retorno do Campo Manual:** Vamos devolver o campo "Contas a Pagar" para a tela de **Importação** (Wizard). Ele virá pré-preenchido com o valor total calculado do OFX, mas deixaremos editável para que você possa colocar seus exatos **106k**. Faz sentido?

## Proposed Changes

### UI de Importação (CentralImportWizard)

#### [MODIFY] [CentralImportWizard.tsx](file:///c:/Users/User/.gemini/antigravity/repos/mec-nica-financeiro/src/components/importacoes/CentralImportWizard.tsx)
- Reativar o campo numérico "Contas a Pagar" nos "Valores Manuais do Dia".
- Como valor *default*, ele somará as saídas do OFX (subtraindo as tarifas de máquina já identificadas, para evitar dupla contagem).
- Passar esse valor manual inserido pelo usuário na função de deleção/salvamento do dia.

### Lógica de Conciliação Global

#### [MODIFY] [useConciliacao.ts](file:///c:/Users/User/.gemini/antigravity/repos/mec-nica-financeiro/src/hooks/useConciliacao.ts)
- Se o usuário não preencher manualmente, a lógica de `contasAPagarAutomatico` descontará os `juros_rede` do `totalOfxOut`, evitando dupla-contagem no Subtotal de Valor Contas.
- Caso o usuário preencha o valor manual no import, utilizaremos esse valor no lugar do automático.

#### [MODIFY] [ResumoDiaPanel.tsx](file:///c:/Users/User/.gemini/antigravity/repos/mec-nica-financeiro/src/components/conciliacao/ResumoDiaPanel.tsx)
- Modificar a atribuição do campo `na_loja_os` no cálculo `GlobalConciliacaoInput`.
- Em vez de forçar a leitura do `currentSnapshot?.total_patio` (que está travado em 0), somaremos dinamicamente os valores de todas as lojas via `Object.values(storesData).reduce(..., 0)`. Isso fará com que o 13k legado apareça instantaneamente na soma Global, consertando o Fluxo de Caixa.
- Corrigir a delegação do botão "Gravar Fechamento Diário" para salvar essa nova soma em vez do valor bugado.

## Verification Plan

### Manual Verification
1. Ao recarregar a tela (ou ao realizar nova importação), o `Na Loja OS` global exibirá a soma correta (~13k+) refletindo a correção feita nos hook local das lojas.
2. Na tela de importação, haverá um campo editável para "Contas a Pagar". O usuário poderá apagar os 114k e digitar seus 106k reais.
3. Ao verificar a tela principal de Conciliação, a "Diferença Final" e o "Fluxo de Caixa" devem normalizar substancialmente.
