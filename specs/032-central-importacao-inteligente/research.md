# RPI-R: Central de Importação Inteligente (Spec 032)

## 1. Contexto e Problema
Na Spec 031, unificamos o input de arquivos na própria tela de "Conciliação", o que acabou poluindo o fluxo de caixa diário e contrariando a preferência do usuário. O usuário deixou claro que:
1. **O local correto é a rota de Importações (`/importacoes`)**. A tela de conciliação deve ser apenas para visualizar e dar match, sem fazer upload.
2. **Separação de Contexto**: A importação em massa significa fazer upload de vários arquivos do mesmo tipo (Ex: Vários OFX, ou Várias Maquininhas), cada um pertencente a uma loja diferente.
3. **Exceções**: "Juros" é um único arquivo que contém todas as lojas dentro dele.
4. **Inteligência de Mapeamento**: O sistema deve extrair o nome da loja de *dentro* do conteúdo do arquivo (não dependendo exclusivamente do nome do arquivo), assim como já funciona na tela de `importacoes-despesas.tsx`, para auto-mapear arquivos com segurança.

## 2. Análise da Base de Código
- **`src/routes/conciliacao.tsx`**: Deve ser revertida para o layout focado apenas na visualização dos resultados já importados (Dashboard de Caixas e Bancos).
- **`src/routes/importacoes.tsx`**: Atualmente serve apenas como "Histórico de Lotes". Deverá ser transformada na **Central de Importação**.
- **`src/routes/importacoes-despesas.tsx`**: Contém um modelo excelente de *wizard* de 3 passos (Upload -> Mapeamento Inteligente -> Revisão). Vamos replicar e expandir essa arquitetura.
- **Parsers Disponíveis**:
  - `ofxParser.ts` -> Para Banco
  - `jurosRedeParser.ts` -> Para Juros
  - O sistema de Maquininhas precisa de um parser aprimorado para ler a loja dentro do arquivo.

## 3. Benchmarking de UX/UI
- **Interfaces Modernas de Data Ingestion**: Ferramentas como o Flatfile ou o Dropzone do Stripe utilizam steps muito claros: Seleção de Tipo -> Upload -> Mapeamento de Colunas/Lojas -> Confirmação.
- **Maximalismo**: Botões grandes de seleção de tipo de arquivo na etapa 1, deixando óbvio o caminho feliz.

## 4. Conclusão da Pesquisa
O sistema não deve adivinhar o tipo de arquivo. O usuário **escolhe o tipo** (OFX, Maquininha, OS, Despesas, Juros) antes de subir. A "mágica" (inteligência) acontece logo depois: o sistema lê o miolo dos arquivos, detecta a qual loja cada aba/texto se refere e faz a ponte (de-para) automaticamente, exigindo clique apenas se não reconhecer a loja.
