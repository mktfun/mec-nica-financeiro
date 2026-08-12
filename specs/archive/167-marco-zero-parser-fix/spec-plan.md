# Spec Plan: Correção Estrutural do Parser Marco Zero (167)

## Tasks

- [x] [FRONTEND] Criar função utilitária em `marcoZeroParser.ts` chamada `isKnownStore(rawName)` que cruza a string com `REDE_STORE_MAPPING` usando validação rígida e fuzzy limitadas.
- [x] [FRONTEND] Modificar a rotina da aba "SALDO" em `marcoZeroParser.ts` para introduzir estado (`activeStore`). 
  - Ao ler a linha, verificar se a Coluna A ou B possuem nome de loja válido. Se sim, instanciar `activeStore` ou atualizar a referência atual.
  - Se a linha não for nome de loja, mas houver um `activeStore`, verificar se a linha contém as palavras-chave (Dinheiro, Receber, Limite, Cartão, Saldo).
  - Extrair os valores correspondentes (geralmente localizados na Coluna D / índice 3) e agregar no `activeStore`.
- [x] [FRONTEND] Modificar a rotina da aba "OS" para usar o mesmo padrão `activeStore`. Toda OS lida após a declaração de um nome de loja pertencerá a esse `activeStore`.
- [ ] [TEST] Verificar visualmente no `MarcoZeroWizard` se a importação agrupou todas as lojas corretamente e expurgou as lojas falsas como "Cartão Débito".
