# Spec Plan: Marco Zero Definitivo (168)

## Tasks

- [x] [FRONTEND] Modificar `MarcoZeroExtraction` e `parseMarcoZeroPlanilha` para separar `global` e `stores`.
  - Escanear a aba SALDO lendo a Coluna G (índices 6) e H (índices 7) para encontrar as tags Dinheiro MP, A Receber e Negativo. Acumular num objeto global.
  - Escanear aba OS e extrair apenas a Coluna D (índice 3) para o `valor_os`, ignorando Coluna E e ignorando a linha "Total" (que não possui `numero_os`).
- [x] [FRONTEND] Refatorar `MarcoZeroWizard.tsx`:
  - Adicionar um estado `<input type="date" />` para a Data da Implantação.
  - Mudar o visual para ter 1 "Card Resumo Global" no topo e a listagem de Lojas Embaixo apenas mostrando as OSs Pendentes.
- [x] [BACKEND/FRONTEND] Modificar a inserção ao clicar em "Implantar":
  - Inserir as OSs Pendentes em `estoque_os_pendente` normalmente (associadas aos seus `storeId`).
  - Fazer um INSERT na tabela `daily_snapshots` com a Data informada, inserindo o `dinheiro_mp`, `total_recebiveis` (A Receber), `saldo_bancario` (Negativo) e `caixa_atual`.
- [x] [FRONTEND] Ocultar o card "Implantação de Saldo" na rota `importacoes/index.tsx` ou similar se o backend indicar que já existem registros de reconciliação ou de snapshots passados.
- [x] [TEST] Re-importar o arquivo e ver a mágica do separador global vs local.
