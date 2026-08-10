# Spec Plan: Automação Pátio OS Multi-mês (Bot OI) - 154

## Tasks

- [ ] [BACKEND] Refatorar `/api/sync/oficina` em `bot/src/server.ts` para suportar aceitar um payload complexo de `{ mode: 'historical_patio', slices: DateSlice[] }`.
- [ ] [BACKEND] Modificar `bot/src/runner.ts` para capturar a branch lógica de `historical_patio` e delegá-la a uma nova função orquestradora.
- [ ] [BACKEND] Implementar a função abstrata de orquestração `downloadPatioOSMultimes(page, slices)` em `bot/src/scrapers/oficina.ts`.
- [ ] [BACKEND] Ajustar a lógica do seletor da página da OI para usar `slices[i].start` e `slices[i].end` iterativamente e realizar multiplos downloads dentro do mesmo loop de Loja.
- [ ] [BACKEND] Adicionar um script no bot para fazer merge (mesclar) os múltiplos arquivos Excel de pátio antes de parsear/salvar, evitando duplicidades de OSs do mesmo mês.
- [ ] [FRONTEND] Criar o botão/modal disparador "Atualizar Pátio (Últimos 2 Meses)" na interface principal do app web, enviando dinamicamente os `slices` de datas relativos a M-1 e M.
- [ ] [TEST] Verificar cenário 1: Bot inicia Puppeteer (modo visível), faz login e baixa 2 Excels separados para a loja A.
- [ ] [TEST] Verificar cenário 2: Dados não ficam duplicados na tabela `patio_os`.
