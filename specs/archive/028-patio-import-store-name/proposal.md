# Proposal: Melhoria na IdentificaçÁo da Loja nas Planilhas de OS

## Requisitos
- O parser de importaçÁo de Pátio / ConciliaçÁo de OS deve identificar de forma inteligente o nome da loja consultando o conteúdo do arquivo `.xls`.
- Deve haver suporte explícito ao padrÁo `[NomeDaLoja] - Por Data da OS:` contido nas linhas iniciais do relatório.
- Se nenhuma string for encontrada, usar o nome do arquivo limpo como fallback de última linha.
- Na etapa 2 da importaçÁo (`importar-os.tsx`), automatizar o mapeamento (se a string normalizada extraída do Excel for idêntica ao nome de uma loja cadastrada, ela deve ser auto-selecionada).

## BDD Scenarios

### Cenário: ExtraçÁo via Relatório de Pátio
- **Given (Dado):** O usuário possui uma planilha XLS gerada pelo sistema de gestÁo cujo título da linha 3 é "MPrudge - Por Data da OS: 02/06/2026 e 02/06/2026".
- **When (Quando):** O usuário faz o upload desse arquivo na tela de Importar Lote OS.
- **Then (EntÁo):** O sistema nÁo deve exibir o nome original do arquivo, mas sim interpretar "MPrudge" como a loja candidata.

### Cenário: Mapeamento Automático da Loja (Auto-match)
- **Given (Dado):** O sistema identificou que a planilha se chama internamente "Kennedy" e o usuário possui uma loja chamada "Kennedy" no banco de dados.
- **When (Quando):** A etapa de validaçÁo na tela de "Ajustar Mapeamento" for renderizada.
- **Then (EntÁo):** O select field para essa planilha já virá pré-preenchido com a loja "Kennedy" sem requerer açÁo manual, passando direto ao próximo passo se todas forem mapeadas com sucesso.
