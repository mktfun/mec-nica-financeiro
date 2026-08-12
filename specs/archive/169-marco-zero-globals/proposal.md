# Proposal: Marco Zero Global Completo (169-marco-zero-globals)

## Problema
O parser atual estava extraindo valores zerados para os dados globais pois não percorria todas as linhas/colunas corretamente na versão mais recente da planilha de conciliação. 
Além disso, o usuário precisa registrar um "Lastro Completo" (Marco Zero) que englobe não só os 4 valores atuais, mas todo o balanço financeiro do dia retroativo (incluindo despesas, juros, retiradas e faturamento) para que o fluxo de caixa inicial bata exatamente com a conciliação retroativa, usando isso como ponto de partida da nova plataforma.

## Solução Proposta
1. **Novo Parser Resiliente**: Atualizar o `marcoZeroParser.ts` para usar varredura de labels independentemente da coluna exata. Vamos procurar a string do label em todas as células da linha e assumir que o valor está na célula adjacente anterior ou em posições relativas conhecidas, garantindo a extração mesmo com colunas vazias.
2. **Novos Dados Globais**: Extrair e consolidar no Parser:
   - SALDO BANCO ITAÚ / NEGATIVO
   - DINHEIRO MP
   - A RECEBER
   - CAIXA ATUAL e CAIXA ANTERIOR
   - FLUXO CAIXA
   - FATURAMENTO (ATUAL e ANTERIOR)
   - VALOR FLUXO DE CAIXA
   - CONTAS (Juros, Contas Gerais, Prolabores)
   - DIFERENÇA
3. **Expansão do Banco (Supabase)**: Criar uma migration para adicionar uma coluna `metadata JSONB DEFAULT '{}'::jsonb` na tabela `daily_snapshots`. 
   - *Por que JSONB?* O Marco Zero carrega vários valores que servem apenas de exibição de conciliação (Diferença, Juros, Prolabores), mas que não são colunas core de indexação no banco. Assim evitamos criar 15 colunas novas.
4. **Fix de Encodings**: Normalizar strings quebradas (ex: `SALDO BANCO ITAÁš` -> `SALDO BANCO ITAÚ`).
5. **Atualização da Interface**: Exibir no `MarcoZeroWizard.tsx` todos esses novos valores encontrados antes do botão de confirmar.

## Contratos de Dados
- **Tabela**: `daily_snapshots`
- **Nova Coluna**: `metadata` (JSONB)
- **Estrutura do JSONB no INSERT do Marco Zero**:
```json
{
  "caixa_anterior": 186395.74,
  "fluxo_caixa": 36402.91,
  "faturamento_atual": 48742.94,
  "faturamento_anterior": 208268.09,
  "valor_disponivel_contas": 12340.03,
  "valor_das_contas": 12340.30,
  "diferenca": -0.27,
  "juros_atual": 2921.68,
  "contas": 9418.62,
  "prolabore_daniel": 0,
  "prolabore_henrique": 0
}
```

## API / Interface
- `MarcoZeroGlobalData` (Typescript): será estendido para conter todos os campos acima.
- O payload de inserção enviado ao Supabase no frontend também enviará esse objeto JSON para a nova coluna `metadata`.

## Features Existentes Impactadas
- Fluxo de Importação Global (Rota: `/importacoes`)
- Tabela `daily_snapshots`

## Risco Principal
- **Probabilidade**: Baixa
- **Impacto**: Parcialmente reversível
- **Risco**: Se a formatação da planilha mudar drasticamente, o parser pode falhar ao achar os labels.
- **Mitigação**: O parser será baseado na correspondência de strings normalizadas (`includes`), varrendo todas as chaves (colunas) da linha (ex: `Unnamed: 6`, `Unnamed: 7`) e associando o valor numérico mais próximo, ao invés de fixar o índice da coluna. E tudo é exibido na tela antes da implantação.
