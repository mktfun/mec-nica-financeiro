# Design: Desacoplamento OFX Saídas vs Contas (152)

## Arquitetura Técnica
Nenhuma mudança de infraestrutura ou tabela.
O fluxo será contido no React (Frontend):
ResumoDiaPanel (Input onChange) → update state → reavalia Matemática Global (caixa_atual, diferenca) → Grava no `daily_snapshots`.

## Interfaces TypeScript
Nenhuma nova interface. Utilizaremos o já existente `GlobalConciliacaoInput`, apenas manipulando a propriedade `contas_a_pagar` via useState local.

## Componentes / Hooks / Funções
1. `src/components/conciliacao/ResumoDiaPanel.tsx`
   - Adição do estado `manualContas`
   - UI: Um campo de Input monetário interativo ao lado de Juros
   - Hidratação de `manualContas` pelo `currentSnapshot?.contas_a_pagar` quando a prop `selectedDate` mudar.

2. `src/routes/conciliacao.index.tsx`
   - Removerá a injeção forçada de `totalOfxOut` em `ResumoDiaPanel`. O OFX out continua disponível, mas não será repassado à força para `contas_a_pagar` na UI.

## Fluxo de UI
1. O usuário entra na tela de conciliação do dia anterior (Sexta-feira).
2. "Contas a Pagar (Manual)" aparece como zero (ou um valor salvo anteriormente).
3. O usuário digita "R$ 10.000,00" (que ele obteve do Oficina Inteligente).
4. O painel global atualiza automaticamente a Diferença e o Saldo Bancário Final e o Fluxo de Caixa.
5. O usuário clica em "Salvar Fechamento", esse valor exato de 10k vai para o banco.
6. As transações (Raio-X OFX de saída) continuam na tela para ele ver (R$ 30.000), mas ele sabe que 20k referem-se ao próximo dia e as ignora.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1:** Carregar dia anterior já fechado → o input manual de Contas deve estar preenchido com o valor salvo no banco.
- **Cenário 2:** Digitar novo valor em Contas → O card "Fluxo de Caixa" e "Diferença" devem refletir imediatamente a mudança.
- **Cenário 3:** Valor no painel inferior "Por Loja" vs Global → O Raio-X individual da loja (Saídas) deve continuar funcionando normalmente sem interferir no Global.
