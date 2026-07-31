# Spec 036 - Refatoração do Fluxo de Importação e Competência de Data

## Requisitos
1. **Competência de Data:** O sistema hoje vincula o lote de importação (`import_logs`) e o histórico de reconciliação para a data atual (`new Date()`). O usuário precisa poder informar a "Data de Competência" (ex: "Esses dados são de ontem") no momento da importação, para que as métricas afetem o dia correto.
2. **Redirecionamento Inteligente no Dashboard de Importações:** A tela principal (`importacoes.tsx`) exibe 5 botões de importação. No entanto, ela abre o modal genérico `WizardImportacao` para todos. Isso quebra as categorias "Despesas", "Juros" e "Pátio", pois o modal só entende OFX e Maquininha. O sistema já possui telas incríveis e dedicadas (`/importacoes-despesas` e `/importar-os`), então os botões de Despesas, Juros e Pátio devem simplesmente navegar para essas rotas em vez de abrir o modal genérico.
3. **Consolidação de "Juros Rede" e "Contas a Pagar":** A tela `/importacoes-despesas` já processa ambas. O botão de "Juros Rede" deve navegar para ela também.

## BDD Scenarios

### Cenário: Definição de Data em Extrato
- **Given (Dado):** que o usuário está no `WizardImportacao` para subir o Extrato OFX do dia anterior.
- **When (Quando):** ele chega na etapa 3 (Revisão).
- **Then (Então):** ele deve visualizar um campo "Data de Competência" pré-preenchido com hoje, e ao alterá-lo para ontem, a importação salva o `import_logs` e as reconciliações no dia de ontem.

### Cenário: Roteamento de Despesas
- **Given (Dado):** que o usuário está na tela `/importacoes`.
- **When (Quando):** ele clica em "Importar Despesas" ou "Juros Rede".
- **Then (Então):** o modal genérico não deve abrir. O sistema deve navegar para a rota `/importacoes-despesas`, onde o parser especializado cuidará do arquivo corretamente.
