# Design: Refatoração da Tela de Conciliação (Spec 033)

## Supabase (Database Layer)
1. **Nova Migration:** O banco de dados precisará sofrer uma alteração estrutural simples: a adição de uma coluna `bank_total` na tabela `reconciliations`.
   - Tipo: `numeric`, padrão: `0`.
   - Objetivo: Hospedar a soma calculada (via importações, como o OFX ou a lógica nativa de transações com `type = 'in'`) para viabilizar o cálculo da divergência diretamente no backend sem consultas agressivas na renderização.
2. **Atualização dos Hooks:**
   - Em `useConciliacao.ts` (`useConciliacaoResumo`, `useConciliacaoDetalhes` etc.), a fórmula interna do `status` (approved, divergence) deverá substituir o uso atual de `(dailyCash + machineTotal)` por `bank_total` ou adaptar os pesos dependendo de como as regras passadas serão preservadas, porém primando pelo foco na divergência `financial_total - bank_total`.

## Stitch (UI Layer)
Seguindo o design system "Apple Liquid Glass" introduzido anteriormente, a tela `src/routes/conciliacao.tsx` passará por uma refatoração da UI principal.

### 1. Painel Global (Aguardando Fechamento)
- A métrica superior agora apresentará apenas os contêineres horizontais:
  - **Apurado Sistema:** (`totalSistema`) - Tipografia forte e limpa.
  - **Extrato Bancário:** (`totalBancario`) - Tipografia com ênfase visual (talvez utilizando a cor brand `var(--color-primary)` da estética da marca).
- As animações do `Framer Motion` e as tags dinâmicas continuam atreladas ao alerta de Divergência, garantindo impacto tátil na interação.

### 2. Card por Loja
- Será modificado para adotar um Grid Flex mais leve.
- **Antes:**
  - Sistema (Cartão+Din)
  - Apurado Maquininha
  - Declarado Físico (Input)
  - Divergência
- **Depois:**
  - **Sistema:** (o que ERP enviou pra base)
  - **Extrato Bancário:** (o que a integração importou na conta do mês)
  - **Divergência:** (com uso da coloração verde/vermelha dependente do resultado da operação `Sistema - Extrato`).
- O sumiço do `input` na interface primária limpa o design para o conceito de "Dashboards de Confiança Plena". O caixa manual será gerido, se aplicável, por outros caminhos ou pop-ups no futuro (mas não exigido por este Spec).
