# Proposal: Central de ImportaçÁo Inteligente (Spec 032)

## 1. VisÁo Geral
Mover toda a lógica de upload de arquivos para fora da tela de ConciliaçÁo e centralizá-la em `/importacoes`. O usuário terá um *Wizard* onde ele dirá "O que vou importar agora?" e subirá os arquivos. O sistema usará inteligência para escanear o conteúdo das planilhas/extratos e fazer o mapeamento automático para a respectiva loja, mantendo o controle total na mÁo do usuário antes da inserçÁo no banco.

## 2. Requisitos Funcionais
- **RF01:** A tela `/importacoes` deve conter botões claros de seleçÁo de tipo de importaçÁo (OFX Bancário, Maquininha, OS/Pátio, Despesas, Juros).
- **RF02:** O fluxo deve seguir o padrÁo de 3 etapas do wizard: SeleçÁo de Arquivos -> Mapeamento de Lojas -> RevisÁo & ConfirmaçÁo.
- **RF03:** O sistema deve buscar o nome da loja **no conteúdo** do arquivo (dentro do Excel ou dentro do OFX) para realizar o auto-match com a base de lojas, persistindo a memória em `localStorage`.
- **RF04:** A tela de `/conciliacao` deve ser refatorada para atuar APENAS como Dashboard analítico (removendo qualquer input de arquivo de lá).

## BDD Scenarios

### Cenário: SeleçÁo do tipo de arquivo e importaçÁo de múltiplos Extratos (OFX)
- **Given:** O usuário está na tela `/importacoes`.
- **When:** Ele clica na categoria "Extrato Bancário (OFX)" e arrasta 5 arquivos OFX diferentes.
- **Then:** O sistema lê os arquivos, extrai a identificaçÁo da conta/banco por dentro do XML de cada um, auto-mapeia para as 5 lojas correspondentes, e avança para a etapa de RevisÁo sem exigir cliques extras (caso 100% mapeado).

### Cenário: ImportaçÁo do Arquivo Único de Juros
- **Given:** O usuário seleciona "Juros Rede" no wizard.
- **When:** Ele sobe apenas 1 arquivo XLSX.
- **Then:** O sistema lê a planilha, identifica blocos de dados de diferentes lojas na mesma aba, quebra os dados virtualmente e mostra na tela de RevisÁo a distribuiçÁo do valor cobrado para cada loja identificada (ex: PIRA, HD, etc).

### Cenário: Arquivo sem loja identificável (Tratamento de ExceçÁo)
- **Given:** O usuário sobe um arquivo de Maquininha cuja planilha interna nÁo possui cabeçalho claro da loja.
- **When:** O processamento interno falha em encontrar um match seguro.
- **Then:** O wizard para no "Passo 2: Mapeamento" e exige que o usuário vincule manualmente aquele arquivo "Desconhecido" a uma Loja do sistema, aprendendo para a próxima vez.
