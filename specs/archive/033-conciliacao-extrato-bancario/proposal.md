# Proposal: Refatoração da Tela de Conciliação e Universal Import Fix (Spec 033)

## Objetivos
1. Adaptar o layout e a regra de negócio da tela de conciliação diária (`/conciliacao`) para refletir um processo de consolidação bancária: (Sistema vs Extrato Bancário).
2. **[CRÍTICO] Resolver o Bug de Parsing Universal nas Importações:** Planilhas de Despesas, Maquininha e Juros estão extraindo valores absurdos (ex: 1.8 milhões em vez de 24k) devido a falhas de leitura de formatação numérica do Excel (`24.000,00`, `R$ 2400.00`, etc.), e leitura acidental de linhas de "TOTAL" ou linhas ocultas.

## Requisitos
1. A divergência global (Aguardando Fechamento) deve exibir "Apurado Sistema" e "Extrato Bancário".
2. A fórmula de cálculo de divergência passará a ser `Divergência = Apurado Sistema - Extrato Bancário`.
3. Criar uma função utilitária `extractNumber(val: any): number` robusta, capaz de limpar `R$`, espaços, identificar o separador de milhar vs decimal (ex: `1.800,00` vs `1,800.00`) e retornar um `float` limpo.
4. Aplicar o `extractNumber` e filtros anti-sujeira (ignorar linhas que contenham "Total" ou "Soma") em:
   - `WizardImportacao.tsx` (Maquininha)
   - `contasAPagarParser.ts` (Despesas)
   - `jurosRedeParser.ts` (Juros)
5. Ajustar o card de "Lote OS" no Histórico (`importacoes.tsx`) para identificar corretamente quando o lote é de Despesas e exibir o valor rotulado adequadamente.

## User Stories
- **Como gerente financeiro**, quero que a tela de conciliação diária compare diretamente o que o sistema apurou com o valor do extrato, sem depender de caixas manuais.
- **Como analista financeiro**, quero que, ao importar uma planilha do sistema antigo, o meu software entenda se o número está formatado como "1.800,00" ou "24.000,00" sem transformar um valor de 24 mil em 1.8 milhões por erro de casa decimal.

## BDD Scenarios
### Cenário: Extração Correta de Números do Excel
- **Given:** Uma planilha contendo o valor "R$ 24.500,50" (string) ou 24500.5 (number).
- **When:** O sistema rodar o parser de despesas ou maquininha.
- **Then:** O valor computado no banco deverá ser estritamente `24500.50`.

### Cenário: Cálculo correto da divergência Global
- **Given:** Sistema: R$ 5.000,00 / Extrato: R$ 4.500,00.
- **When:** O usuário acessar a `/conciliacao`.
- **Then:** A tela deve mostrar Extrato: R$ 4.500,00 e Divergência: R$ 500,00.
