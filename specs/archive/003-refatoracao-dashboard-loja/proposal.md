# Proposta de SoluçÁo: RefatoraçÁo de Detalhes da Loja e Saldo Inicial

## VisÁo Geral
A arquitetura do painel de lojas passará por uma transiçÁo do modelo "Side Sheet" (painel lateral) para um modelo de "Dedicated Route" (Página Completa). O objetivo é desobstruir a visÁo de relatórios ricos, permitir injeçÁo de saldos iniciais de forma limpa e despoluir a tela de "ConciliaçÁo", focando ela apenas na essência de auditoria de caixa. Além disso, o gráfico "Formas de Pagamento" será modular.

## Requisitos de Negócio (User Stories)
1. **Como Gerente**, quero poder visualizar os detalhes financeiros de uma loja em uma página completa ao clicar nela no painel global, para nÁo ficar limitado por uma janelinha lateral espremida.
2. **Como Analista Financeiro**, ao olhar o dashboard detalhado da loja, quero que o gráfico "Formas de Pagamento" reflita exatamente a aba selecionada (Todas, Apenas Entradas, Apenas Saídas), para que eu consiga entender em que categorias de despesas ou métodos o dinheiro está saindo.
3. **Como Administrador Financeiro**, quero ter a opçÁo de informar o "Saldo em Banco Atual" da loja, para que o saldo exibido no sistema acompanhe exatamente a realidade bancária retroativa que nÁo entrou pelo sistema.
4. **Como Operador**, quero poder fazer upload de várias planilhas de Receitas/OS de diversas lojas de uma só vez (arrastar e soltar), tendo o mesmo mapeamento inteligente de lojas que já existe nas Despesas.
5. **Como Usuário**, quero que a tela de "ConciliaçÁo" mostre os indicativos de caixa diário e alertas, mas sem poluir a navegaçÁo tentando fazer o papel da tela "Lojas".

## BDD Scenarios

### Cenário: ImportaçÁo em Massa de Receitas (OSs)
- **Given:** O usuário está na tela de importaçÁo de receitas (`/importacoes`).
- **When:** Ele arrasta múltiplos arquivos XLSX de diferentes lojas (ex: "Master", "Piraporinha", etc).
- **Then:** O sistema processa todos os arquivos, pede o mapeamento inteligente de lojas desconhecidas apenas uma vez, consolida o lote e processa todas as lojas de uma só vez.

### Cenário: NavegaçÁo dedicada à loja (RemoçÁo do Side Sheet)
- **Given:** Que o usuário está na listagem de "Lojas" consolidada (`/lojas`).
- **When:** Ele clica sobre o card da Loja "Santo André".
- **Then:** O sistema deve rotear o usuário para `/loja/ID_DA_LOJA` em página cheia, descartando o `StoreDetailsSheet`.

### Cenário: Gráfico modular refletindo o tab selecionado
- **Given:** Que o usuário está na tela de Detalhes da Loja (`/loja/$lojaId`).
- **When:** Ele alterna o filtro da listagem de transações para "Apenas Saídas".
- **Then:** O Gráfico (Recharts) deve atualizar instantaneamente seus dados para exibir as categorias de saída ("Contas de Luz", "Fornecedores", etc) ao invés dos métodos de entrada de receita.

### Cenário: ImputaçÁo de Saldo Inicial
- **Given:** Que a loja "Matriz" possui R$ 5.000,00 fisicamente no banco antes do uso do sistema, mas no sistema marca R$ 0.
- **When:** O usuário clica em "Definir Saldo em Conta", digita `5000` e confirma.
- **Then:** O sistema deve registrar uma transaçÁo fantasma (`type: 'in'`, `icon_type: 'bank'`, `subtitle: 'Ajuste de Saldo Inicial'`) somando R$ 5.000 ao Extrato e Saldo Total, sem vincular a OS, e atualizando o Saldo Real instantaneamente.

## Critérios de Aceite
- O componente `StoreDetailsSheet.tsx` deve ser apagado e referências limpas em `lojas.tsx`.
- Tela de Lojas consolidada aponta para a rota detalhada.
- Gráfico na tela detalhada deve mostrar Formas de Pagamento (Entradas) se a aba for 'in' ou 'all', e mostrar Agrupamento de Categorias/Despesas se a aba for 'out'.
- Componente/Modal `InitialBalanceDialog` deve existir e gravar a transaçÁo correta.
