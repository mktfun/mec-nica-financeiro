# Design: Faturamento Baseado em ConciliaçÁo Real (OFX Vinculado) (092-fix-faturamento-math)

## Arquitetura Técnica
A "Diferença" no Resumo do Dia agora é baseada estritamente na balança contábil.
`Diferença = Expectativa - Realidade`
Onde:
- Expectativa: `Maquininha` (Líquido da Rede) + `PIX` (Total gerado nas OSs do Pátio)
- Realidade: `Faturamento_Real` (Soma das transações do OFX `in` cujos IDs estÁo na tabela `conciliation_matches` para o respectivo `store_id` e `target_date`)

### ImplementaçÁo em `useModulo1StoresData` (`src/hooks/useConciliacao.ts`)
1. **Adicionar consulta à tabela `conciliation_matches`:**
   Trazer todos os matches do dia alvo para cruzar com as transações.
2. **Nova propriedade `pix_os_expected`:**
   Substituir/Adicionar a lógica para somar todo o PIX esperado (todo o PIX das OSs daquele dia, independentemente de ter dado match).
3. **Nova propriedade `faturamento_real_ofx`:**
   Filtrar as transações do OFX (`source === 'ofx' && type === 'in'`) cujo `id` esteja contido no array de `ofx_transaction_id` dos matches recuperados. Somar o `amount`.

### ImplementaçÁo na UI (`src/routes/conciliacao.index.tsx` e `ResumoDiaPanel.tsx`)
1. **Atribuir o novo Faturamento:**
   `faturamento_atual: storeMod1?.faturamento_real_ofx || 0`
2. **Atribuir a Expectativa de PIX:**
   `pix_os: storeMod1?.pix_os_expected || 0`
3. **Zerar a variável residual:**
   `faturamento_outros = 0` (Remover o cálculo mágico).

## Cenários de VerificaçÁo (SCAN → INFER → VERIFY → FIX)
- **Cenário 1:** Sistema gerou R$ 1.000 em PIX nas OSs e R$ 500 líquidos de Maquininha. No extrato, pingou R$ 1.000 de PIX e R$ 500 de maquininha, ambos vinculados.
  - *Resultado esperado:* Faturamento = 1500. Expectativa = 1500. Diferença = R$ 0,00.
- **Cenário 2:** Sistema gerou R$ 1.000 em PIX, mas cliente só transferiu R$ 800 (Faltou R$ 200). A transaçÁo de 800 foi vinculada.
  - *Resultado esperado:* Faturamento = 800. Expectativa = 1000. Diferença = R$ 200 (Positiva/Faltando no banco, o sistema avisa).
