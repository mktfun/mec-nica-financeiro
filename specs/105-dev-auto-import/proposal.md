# Especificação 105: Dev Auto-Import & Resiliência de Mapeamento

## 1. O Problema
A rotina de limpar o banco de dados durante o desenvolvimento tem gerado um gargalo frustrante: toda vez que o `Supabase` é zerado, os arquivos de teste precisam ser manualmente jogados no Dropzone. Pior: os `UUIDs` das Lojas mudam, o que quebra o vínculo salvo no navegador (localStorage). Isso te obriga a re-vincular (mapear) os 25 arquivos para as lojas manualmente toda vez.

## 2. A Solução
Para matar essa dor, proponho uma solução de 2 frentes (Você vai amar):

### Frente A: Mapeamento de Loja à prova de Wipe (Resiliência)
Em vez de salvar `Alias -> UUID da Loja` no `localStorage`, vamos salvar `Alias -> Nome Normalizado da Loja` (ex: `MPpiraporinha -> piraporinha`).
Quando a tela de importação carregar e aplicar o mapeamento, ela buscará o UUID **dinamicamente** encontrando a loja pelo nome. Assim, você pode limpar a base 1000 vezes, o navegador sempre vai achar o ID correto na hora sem te perguntar nada!

### Frente B: O Botão Mágico de Mock (Auto-Load)
Vamos criar um botão escondido de **"Auto-Load Mocks"** no header do Wizard que só aparece se você estiver rodando em `localhost`.
Ao clicar nele, o sistema lê um script que já faz um fetch dos seus 25 arquivos de teste e joga direto no processador. `Zero drag-and-drop.`

## 3. Impacto
- Você nunca mais vai precisar clicar e arrastar arquivos pra testar o script de importação.
- Você nunca mais vai precisar clicar nos dropdowns vermelhos pra selecionar qual loja é qual depois de dropar a tabela.
