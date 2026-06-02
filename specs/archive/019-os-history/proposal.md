# Proposal - 019 OS History & Layout Spacing

## Requisitos
1. **Rastreabilidade de OS:** Adicionar a capacidade de salvar um histórico contínuo (timeline) sempre que o valor faturado, valor pago ou status de uma OS sofrer alterações durante a importação da planilha.
2. **Visualização do Histórico:** Exibir essa linha do tempo de forma estética (UX 2026) na tela de "Detalhes da OS".
3. **Correção de Layout:** Aplicar um padding bottom generoso no layout global para descolar o conteúdo da margem inferior do navegador.

## User Stories
- **US1:** Como gerente, quero ver se uma OS que antes valia R$ 500 agora vale R$ 800, para entender quando o ticket médio subiu e evitar confusões financeiras.
- **US2:** Como usuário do sistema, quero fazer scroll até o final da página e ver uma margem vazia (respiro visual) para não sentir a interface esmagada na base do meu monitor.

## BDD Scenarios

### Cenário: Atualizando os valores da OS na importação
- **Given (Dado):** Que a OS #123 existe no sistema com o valor total de R$ 100,00 e o array `history_log` vazio.
- **When (Quando):** O usuário importa uma planilha mais recente onde a OS #123 aparece com o valor total de R$ 150,00.
- **Then (Então):** O sistema atualiza o `total_value` para R$ 150,00 e adiciona um objeto no `history_log` registrando a data da mudança, o valor anterior e o novo valor.

### Cenário: Visualização de Detalhes
- **Given (Dado):** O usuário clica na OS #123 no Pátio.
- **When (Quando):** O modal de detalhes se abre.
- **Then (Então):** É exibida uma seção "Histórico" com o visual de timeline, mostrando claramente as alterações que a OS sofreu.
