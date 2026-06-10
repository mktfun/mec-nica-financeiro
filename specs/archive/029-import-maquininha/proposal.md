# Proposta: Importação Inteligente de Maquininha (Rede) na Conciliação

## Contexto e Problema
O usuário informou que o fechamento das lojas não depende apenas de bater o Dinheiro Físico com o Sistema. É vital também comparar as **Transações de Cartão/Pix** importadas pelo arquivo da Maquininha (ex: "Rede") com o que foi reportado no Pátio (Sistema).
Atualmente, as lojas enviam relatórios Excel das maquininhas (ex: `Rede_PIRA.xlsx`) e precisamos integrar isso na rotina de Conciliação Diária de forma inteligente (extraindo a loja do nome do arquivo).

## Objetivo
1. Criar um botão "Importar Maquininha" diretamente na tela de **Conciliação Diária**.
2. Ler e interpretar a planilha padrão "Rede" (identificada pelos cabeçalhos `valor da venda original`, `status da venda`, etc).
3. Usar **Mapeamento Explícito pelo Conteúdo**: O sistema abrirá o arquivo XLSX antes de qualquer coisa e lerá as colunas `CNPJ` e `nome do estabelecimento` diretamente de dentro da planilha (células da "Rede"). Ele tentará:
   - Achar uma Loja cadastrada no sistema com esse CNPJ exato.
   - Se não achar, buscará na Memória (`localStorage`) se você já ensinou qual loja é dona desse CNPJ.
   - Se for totalmente desconhecido, aí sim abrirá o Modal: *"A qual loja pertence a maquininha do estabelecimento EMPORIO MP (CNPJ 17.953.410/0001-50)?"*. A escolha fica salva para as próximas vezes, tornando o nome do arquivo (ex: `Rede_HD (1).xlsx`) totalmente irrelevante.
4. Adicionar um novo bloco no painel de cada loja na tela de conciliação para mostrar a comparação específica: **Sistema (Cartão/Pix) vs Maquininha**.

## BDD Scenarios

### Cenário: Primeira Importação de um Estabelecimento (Mapeamento Manual)
- **Given (Dado):** O usuário sobe o arquivo `vendas_ontem.xlsx` (da máquina da Rede).
- **When (Quando):** O sistema lê o arquivo, extrai o CNPJ `12.345.678/0001-99` e o nome "SUPER AUTO HD", mas não encontra no banco nem na memória.
- **Then (Então):** O sistema ignora o nome do arquivo, abre um popup mostrando o CNPJ/Nome encontrado e pergunta a qual loja pertence. O usuário escolhe "HD" e a relação é memorizada.

### Cenário: Importação Inteligente (Reconhecimento Explícito)
- **Given (Dado):** O usuário já vinculou o CNPJ `17.953.410/0001-50` com a loja "Piraporinha".
- **When (Quando):** Ele sobe o arquivo da Rede com qualquer nome (ex: `qqq.xlsx`).
- **Then (Então):** O sistema lê o conteúdo, acha o CNPJ `17.953.410/0001-50`, lembra que é "Piraporinha" e debita R$ 8.500 no painel da loja automaticamente, sem perguntas.

### Cenário: Divergência entre Maquininha e Sistema
- **Given (Dado):** O sistema registrou que entraram R$ 9.000 via OS para a loja "Piraporinha".
- **When (Quando):** O usuário importa o relatório da Maquininha que consta R$ 8.500 aprovados.
- **Then (Então):** O card da loja Piraporinha exibirá uma divergência específica de Maquininha (- R$ 500), destacando-se em vermelho para facilitar a investigação.

### Cenário: Dia Sem Vendas na Maquininha
- **Given (Dado):** Uma loja não teve vendas na maquininha ontem.
- **When (Quando):** O usuário não sobe arquivo para essa loja (ou sobe um arquivo vazio).
- **Then (Então):** O sistema entende que "não entrou nada" (Maquininha = R$ 0,00) e consolida a divergência baseada nisso caso existam lançamentos no sistema.
