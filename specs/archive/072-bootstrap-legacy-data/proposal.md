# Spec 072: Bootstrap (O Dia Zero)

## 1. O Problema da "Síndrome do Sistema Virgem"
Você identificou perfeitamente um gargalo clássico de sistemas financeiros: **O primeiro dia de uso.**
Se o seu primeiro dia de conciliação no sistema for 31/07, o Dashboard vai calcular as métricas contra o dia 30/07. Como o dia 30/07 não existe no banco de dados, teremos as seguintes deficiências:
- **Fluxo de Caixa Quebrado:** O cálculo é `Saldo (31/07) - Saldo (30/07)`. Se o saldo de 30/07 for R$ 0, o fluxo de caixa vai parecer ser de + R$ 200 mil (lucro irreal), distorcendo tudo.
- **Variação de Faturamento (+0%):** Não haverá base de faturamento anterior para comparar.
- **Falta de Continuidade:** O histórico macroscópico começará do zero.

## 2. A Solução (Estratégia de Onboarding)
Você enviou a `CONCILIAÇÃO 3007.xlsx`. Fazer um parser complexo para ler um arquivo `.xlsx` que só será usado **uma única vez** na vida útil do sistema é um desperdício de engenharia e tem alto risco de quebrar por células mescladas na sua planilha.

Em vez disso, a melhor abordagem é criar uma rotina de **"Bootstrap (Carga Inicial)"**. 

### Nossa Proposta: O Painel de "Carga Inicial" (Setup do Dia Zero)
Criaremos uma tela escondida (ex: `/admin/bootstrap`) ou uma aba no próprio Importador Central, projetada exatamente para o "Dia Zero". 
Nessa tela, ao invés de codificarmos a leitura de um Excel instável, exibiremos um **Grid Editável Rápido** (semelhante ao Excel) para você digitar os 3 valores fundamentais do dia 30/07 de cada loja em menos de 2 minutos:
1. **Saldo em Conta (Fechamento do dia 30/07)**
2. **Faturamento Bruto Total (Dia 30/07)**
3. **Contas Pagas (Dia 30/07)**

Ao clicar em "Salvar Carga Inicial", o sistema fará uma injeção cirúrgica no banco de dados:
- Criará registros retroativos falsos em `reconciliations` (para o Saldo).
- Criará registros retroativos em `daily_snapshots` (para o Faturamento e Contas manuais).

## 3. Deficiência Identificada no Backend (Bug Oculto)
Analisando sua ideia, percebi uma deficiência na nossa query atual do Dashboard (`useDashboardV2.ts`). 
Atualmente, o dashboard calcula o "Faturamento Anterior" olhando **apenas** para transações importadas (Pix/Maquininha). Ele não está somando os lançamentos manuais do "Dia Anterior", apenas os manuais do "Dia Atual". 
Precisaremos ajustar essa matemática no hook para que a Carga Inicial funcione perfeitamente.
