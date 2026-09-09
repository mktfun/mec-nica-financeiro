# Spec Plan: Janela de Detalhes da Transação (Revolut Card Details Modal) e Limpeza da Linha do Extrato (389)

## Tasks

- [x] [FRONTEND/COMPONENT] Criar componente `src/components/conciliacao/TransactionDetailModal.tsx` baseado no padrão Revolut Card Details com ficha técnica e painel de ações
- [x] [FRONTEND/ROW-CLEANUP] Remover botões de ação soltos da linha de cada transação em `StoreExtratoBancarioView.tsx` e adicionar chevron sutil de abertura
- [x] [FRONTEND/ORCHESTRATION] Implementar estado `selectedDetailTx` e conectar o clique da linha à abertura de `TransactionDetailModal` com integração total aos fluxos de Mover p/ Hoje, Vincular OS e Editar
- [x] [BUILD] Executar `npm run build` garantindo 0 erros de compilação TypeScript
- [x] [TEST] Testar navegação, clique nas transações de D-1 e 09/09 e acionamento das ações em http://localhost:8080/conciliacao/st-06?date=2026-09-09
