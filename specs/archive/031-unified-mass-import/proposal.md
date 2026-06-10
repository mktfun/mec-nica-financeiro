# Proposal: Central de Fechamento Massivo (031)

## 1. Visão Geral
A Central de Fechamento Massivo é uma refatoração profunda da Experiência do Usuário (UX) na rotina diária de conciliação financeira. O objetivo é remover o fardo de tratar cada arquivo de origem separadamente. O gestor apenas "despeja" os arquivos do dia (OFX de bancos, XLSX de vendas de cartão, XLSX de custos/juros) em uma única "Magic Dropzone". O sistema assume a responsabilidade cognitiva de ler, rotear, mapear às lojas e gerar o Dashboard Final Consolidado em um clique.

## 2. Requisitos de Negócio
- **RF1 (Magic Dropzone):** O sistema deve fornecer uma única área de arrastar-e-soltar que aceita múltiplos arquivos (`.ofx`, `.xlsx`, `.xls`, `.csv`).
- **RF2 (Smart Router):** O sistema lerá e categorizará cada arquivo inferindo seu propósito:
  - Se for `.ofx`: Marca como arquivo de Extrato Bancário.
  - Se for `.xlsx`: Avalia as headers e linhas da primeira planilha para classificar como `Maquininha` ou `Juros da Adquirente`.
- **RF3 (Mapeamento de Lojas em Massa):** O sistema fará a inferência da loja para cada arquivo (seja buscando CNPJ no conteúdo do Excel, seja buscando o nome da loja no nome do arquivo OFX).
- **RF4 (Resolução de Conflitos Única):** Caso 1 ou mais arquivos não possam ser mapeados a uma loja, o sistema exibirá uma modal única de "Triagem", permitindo ao usuário mapear os "arquivos órfãos" antes do processamento.
- **RF5 (Console de Resumo Integrado):** O painel de resultado deve mostrar, loja por loja, os três grandes totais do dia (`Apurado Maquininha`, `Match Extrato/Sistema`, `Custos`).
- **RF6:** Um único botão "Finalizar Fechamento Global" salvará os saldos em lote para todas as lojas de uma vez, populando a tabela `reconciliations` no Supabase com todos os parâmetros simultaneamente.

## 3. Requisitos Não Funcionais
- **RNF1 (Performance Client-side):** O processamento de até 30 planilhas e OFXs simultâneos deve ser distribuído via promises locais (ou WebWorkers, se ficar pesado) no navegador, usando as libs `ofxParser` e `XLSX` já implementadas, evitando sobrecarga no Supabase/Backend antes do "Save".
- **RNF2 (Persistência):** Todos os mapeamentos devem usar `localStorage` para que o sistema se torne progressivamente mais inteligente a cada fechamento.

## 4. BDD Scenarios

### Cenário: Upload de Diferentes Formatos na Mesma Dropzone
- **Given (Dado):** que o usuário está na tela de Conciliação
- **When (Quando):** ele arrasta 1 arquivo `.ofx` e 2 arquivos `.xlsx` (um de juros e um de maquininha) para a Central de Fechamento
- **Then (Então):** o FileRouter categoriza e sinaliza visualmente: `1 Extrato, 1 Maquininha, 1 Juros` detectados.

### Cenário: Resolução de Lojas Desconhecidas
- **Given (Dado):** que 1 OFX possui o nome `extrato_geral.ofx` e o sistema não sabe de que loja é
- **When (Quando):** a triagem inicial termina
- **Then (Então):** uma modal aparece dizendo "Falta mapear 1 arquivo", e após a seleção do usuário, o processamento geral é destravado.

### Cenário: Fechamento em Um Clique
- **Given (Dado):** que todos os arquivos foram roteados e processados e as tabelas com divergências de R$ 0.00 são exibidas
- **When (Quando):** o usuário clica em "Salvar Fechamento Consolidado"
- **Then (Então):** as mutações disparam UPSERTs no Supabase preenchendo as colunas `machine_total`, `ofx_imported`, `bank_divergence` e `machine_fees` de todas as lojas afetadas de forma massiva.
