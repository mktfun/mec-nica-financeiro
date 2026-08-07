# Spec Plan: Fix Centavos TRNAMT (100)

## Tasks

- [x] [ENGINE] Editar `src/lib/parsers/ofxParser.ts`
  - Injetar a lógica de conversÁo de centavos (checagem de decimal separator e divisÁo por 100) diretamente abaixo da captura base de `TRNAMT` (variável `amount`).
  - Remover do bloco de captura "SALDO ANTERIOR" (linha 98) a lógica duplicada/isolada de centavos que existia apenas lá, já que a variável `amount` base já chegará normalizada para todo o resto do loop.
