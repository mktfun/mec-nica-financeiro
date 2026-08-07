# Design: Automatizar Contas a Pagar e Outros Faturamentos via OFX (077)

## Arquitetura Técnica
A alteração modifica o "Ponto de Verdade" dos campos:
Antes: `Input (ImportWizard) -> daily_snapshots -> ResumoDiaPanel -> modulo1Calculations`
Agora: `Extrato Bancário (transactions) -> useConciliacaoResumo -> ResumoDiaPanel -> modulo1Calculations`

## Componentes / Hooks / Funções

### `src/components/importacoes/CentralImportWizard.tsx`
- Remover os states: `manualOutrosFaturamentos`, `manualOutrosDesc`, `manualContasAPagar`, `manualProvisao`.
- Remover a UI correspondente desses 4 campos.
- No payload do `saveSnapshot.mutateAsync`, enviaremos `0` (ou não enviar) para essas chaves. (Como o banco espera números e lida com o estado, será `0` gravado no daily_snapshot durante o import, já que agora a tela de conciliação vai ignorar esse valor e calcular on-the-fly).

### `src/components/conciliacao/ResumoDiaPanel.tsx`
- Recuperar os totais via hook: `totalOfxOut` e `totalOfxIn` já vêm do `resumo`.
- Recuperar os totais de PIX vinculados das lojas iterando sobre `storesMod1`:
  ```typescript
  let totalPixOs = 0;
  if (storesMod1) {
    Object.values(storesMod1).forEach(st => {
      totalPixOs += (st.pix_os || 0);
    });
  }
  ```
- Recalcular os inputs para a fórmula global:
  ```typescript
  const faturamento_outros_automatico = (resumo?.totalOfxIn || 0) - totalPixOs;
  const contas_a_pagar_automatico = (resumo?.totalOfxOut || 0);
  
  const inputForCalculation: GlobalConciliacaoInput = {
    // ...
    faturamento_outros: faturamento_outros_automatico,
    contas_a_pagar: contas_a_pagar_automatico,
    provisao: 0,
  };
  ```
- Atualizar o `handleSave` para gravar no `daily_snapshots` os novos valores calculados (no fim do dia, o snapshot salva o estado final):
  ```typescript
  await saveSnapshot.mutateAsync({
    // ...
    faturamento_outros_valor: faturamento_outros_automatico,
    contas_a_pagar: contas_a_pagar_automatico,
    provisao: 0,
    // ...
  });
  ```

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1**: O usuário abre o importador. Ele não deve ver "Contas a Pagar", "Provisão", "Outros Faturamentos" e "Desc.". Apenas "Dinheiro MP" e "A Receber".
- **Cenário 2**: Na tela de conciliação diária, as seções de contas e despesas devem exibir o valor somado de saídas do OFX e o valor de faturamento extra corretamente baseado no extrato, e a diferença global deve bater perto de zero sem intervenção de digitação de contas.
