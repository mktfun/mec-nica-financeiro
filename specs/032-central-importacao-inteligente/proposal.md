# Proposal: Central de Importação Inteligente (Spec 032)

## 1. Visão Geral
Mover toda a lógica de upload de arquivos para fora da tela de Conciliação e centralizá-la em `/importacoes`. O usuário terá um *Wizard* onde ele dirá "O que vou importar agora?" e subirá os arquivos. O sistema usará inteligência para escanear o conteúdo das planilhas/extratos e fazer o mapeamento automático para a respectiva loja, mantendo o controle total na mão do usuário antes da inserção no banco.

## 2. Requisitos Funcionais
- **RF01:** A tela `/importacoes` deve conter botões claros de seleção de tipo de importação (OFX Bancário, Maquininha, OS/Pátio, Despesas, Juros).
- **RF02:** O fluxo deve seguir o padrão de 3 etapas do wizard: Seleção de Arquivos -> Mapeamento de Lojas -> Revisão & Confirmação.
- **RF03:** O sistema deve buscar o nome da loja **no conteúdo** do arquivo (dentro do Excel ou dentro do OFX) para realizar o auto-match com a base de lojas, persistindo a memória em `localStorage`.
- **RF04:** A tela de `/conciliacao` deve ser refatorada para atuar APENAS como Dashboard analítico (removendo qualquer input de arquivo de lá).

## BDD Scenarios

### Cenário: Seleção do tipo de arquivo e importação de múltiplos Extratos (OFX)
- **Given:** O usuário está na tela `/importacoes`.
- **When:** Ele clica na categoria "Extrato Bancário (OFX)" e arrasta 5 arquivos OFX diferentes.
- **Then:** O sistema lê os arquivos, extrai a identificação da conta/banco por dentro do XML de cada um, auto-mapeia para as 5 lojas correspondentes, e avança para a etapa de Revisão sem exigir cliques extras (caso 100% mapeado).

### Cenário: Importação do Arquivo Único de Juros
- **Given:** O usuário seleciona "Juros Rede" no wizard.
- **When:** Ele sobe apenas 1 arquivo XLSX.
- **Then:** O sistema lê a planilha, identifica blocos de dados de diferentes lojas na mesma aba, quebra os dados virtualmente e mostra na tela de Revisão a distribuição do valor cobrado para cada loja identificada (ex: PIRA, HD, etc).

### Cenário: Arquivo sem loja identificável (Tratamento de Exceção)
- **Given:** O usuário sobe um arquivo de Maquininha cuja planilha interna não possui cabeçalho claro da loja.
- **When:** O processamento interno falha em encontrar um match seguro.
- **Then:** O wizard para no "Passo 2: Mapeamento" e exige que o usuário vincule manualmente aquele arquivo "Desconhecido" a uma Loja do sistema, aprendendo para a próxima vez.
