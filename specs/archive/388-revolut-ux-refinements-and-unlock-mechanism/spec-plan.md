# Spec Plan: Refinamentos Revolut UX, Contraste Cromático e Mecanismo de Desbloqueio de Transações D-1 (388)

## Tasks

- [x] [FRONTEND/COLORS] Corrigir semântica visual das saídas para rose/vermelho (`text-rose-400`, avatares em tom rose) e entradas em emerald (`text-emerald-400`)
- [x] [FRONTEND/TITLES] Implementar de-duplicação de nomes de fornecedores do Itaú e resolução para o traço `-`
- [x] [FRONTEND/BADGES] Remover mega-badges da linha do título e transferir informações de conta e intercompany para a linha de metadados
- [x] [FRONTEND/UNLOCK] Adicionar botão `[Mover p/ Hoje]` para transações de D-1 pós-fechamento, atualizando `target_date` no banco
- [x] [FRONTEND/ACTIONS] Habilitar ações de `[Vincular OS]` e `[Editar / Desbloquear]` em transações de lote anterior
- [x] [BUILD] Executar `npm run build` garantindo 0 erros de compilação TypeScript
- [x] [TEST] Testar fluxo visual e desbloqueio em http://localhost:8080/conciliacao/st-06?date=2026-09-09
