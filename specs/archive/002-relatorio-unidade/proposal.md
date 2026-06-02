# Proposal: Importação de Relatório Diário de Unidades

## 1. Objetivo
Permitir que a equipe lance o fechamento diário das mecânicas importando um documento base (imagem, PDF ou CSV). O sistema deve extrair os valores relevantes do documento para criar o registro de conciliação do dia e expor as possíveis divergências.

## 2. Requisitos e User Stories
- **Upload de Arquivo**: O usuário no Dashboard acessa "Importar Relatório", escolhe a Unidade correspondente e faz o upload do documento.
- **Leitura de Dados (OCR/Parsing)**: O sistema deve processar o documento importado e extrair os dados chaves, como: Faturamento Total, Quantidade de OS, ou valores pagos em cartão/dinheiro/pix. *(Precisamos do arquivo de exemplo para definir exatamente o que será lido)*.
- **Validação com o Banco**: Uma vez extraído o "Liquidado", o sistema irá cruzar com o "Apurado Sistema" daquele dia e exibir a tela de confirmação de Conciliação.
- **Dias de Fechamento**: Como determinado, a importação referente ao dia *atual* será sempre baseada na data do fechamento (D-1 = Ontem).

## 3. O que já existe e será REUTILIZADO
- `ImportReportDialog.tsx`: Modal estrutural de UI para fazer o upload já está criado.
- `useSaveDailyCash` em `useConciliacao.ts`: Função pronta no banco para salvar/atualizar o resultado do caixa (`daily_cash`) na tabela `reconciliations`.
- Tabela de Armazenamento (`storage` do Supabase): Se necessário guardar os relatórios passados por auditoria, usaremos o bucket do Supabase.

## 4. O que precisa ser CRIADO
- **Parser do Documento**: Uma função utilitária (ou Serverless Edge Function no Supabase) para realizar a extração dos valores de dentro do documento utilizando IA ou bibliotecas de parsing.
- **Feedback de Parsing**: UI de Loading com mensagens explicativas ("Analisando documento...", "Extraindo valores...") no modal.
- **Preview de Validação**: Uma tela intermediária dentro do próprio modal que diz: *"Encontramos o valor R$ X no documento. O sistema apurou R$ Y. Divergência: R$ Z. Salvar?"*

## 5. Critérios de Aceite
- Ao importar o relatório em anexo de uma loja X, o campo "Liquidado Conta" desta loja no Dashboard do D-1 deve ser atualizado instantaneamente após o salvamento.
- Arquivos inválidos ou sem valor visível devem retornar erro amigável ao invés de tela branca.
