# Proposal: Marco Zero Definitivo (Global + Data de Implantação) (168)

## Problema
As versões anteriores trataram todos os valores (Dinheiro MP, A Receber, Negativo, Caixa) como métricas individuais de cada loja (repetindo-os em cada card). No entanto, o Excel de conciliação tem esses saldos como **um bloco único (Global)**, localizados nas Colunas G e H. As filiais possuem individualmente apenas as **OSs pendentes** (e talvez o seu saldo em caixa).
Além disso, a implantação não pedia uma Data, e o Marco Zero deve gerar o Snapshot inicial no banco de dados (`daily_snapshots`) para ancorar o "Caixa Anterior" da primeira conciliação do dia seguinte.
Por fim, o Marco Zero deve desaparecer da tela de importações após ser executado uma vez.

## Solução Proposta
1. **Refatoração do Parser (`marcoZeroParser.ts`):**
   - Extrair `Dinheiro MP`, `A Receber`, `Negativo` e `Caixa Atual` globalmente, procurando os rótulos na **Coluna H** e os valores na **Coluna G**.
   - Nas filiais, ler estritamente o **Número da OS** e o seu **Valor a Receber** na **Coluna D**. O valor "Total Pago" (Coluna E) e as linhas isoladas de "Total" serão ignorados.
2. **Atualização da Interface (`MarcoZeroWizard.tsx`):**
   - Mudar a UI para exibir um bloco **Global** no topo (mostrando Dinheiro MP, A Receber, Negativo e Caixa Inicial).
   - Listar as lojas embaixo apenas para aprovar as OSs Pendentes.
   - Adicionar um **Date Picker** obrigatório para escolher a "Data do Marco Zero".
3. **Persistência no Banco (`save_marco_zero` ou via RPC):**
   - Ao implantar, inserir as OSs Pendentes nas filiais.
   - Criar o registro na tabela `daily_snapshots` com a Data escolhida e os saldos globais (Caixa Atual, Dinheiro MP, etc).
4. **Condição de Ocultação:**
   - O card "Implantação de Saldo (Marco Zero)" na tela `/importacoes` só será exibido se a tabela `daily_snapshots` estiver vazia. Se já existir histórico, ele some.

## Contratos de Dados
- Tabela afetada: `daily_snapshots` (receberá 1 registro retroativo global).
- Tabela afetada: `estoque_os_pendente` (receberá N registros por loja).

## Open Questions (Dúvidas para o Usuário)
> [!IMPORTANT]  
> Você mencionou: *"esses ai por loja eu so preciso de os e saldo de cada loja"*.
> Se o **Caixa Atual** é Global (junto com Dinheiro MP, Negativo), qual é o "saldo de cada loja" que fica nas filiais? É o valor em dinheiro da gaveta daquela loja (que vai para a tabela `reconciliations`)? Ou você quis dizer apenas "o saldo das OSs de cada loja"?

## Risco Principal
- **Probabilidade**: Baixa.
- **Impacto**: Irreversível se a data for escolhida errada (precisaria limpar o banco).
- **Mitigação**: Alerta visual forte na hora de escolher a Data (ex: "Atenção: A data deve ser o dia exato da planilha de marco zero, geralmente ontem").
