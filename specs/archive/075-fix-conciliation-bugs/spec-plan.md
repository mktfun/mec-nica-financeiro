# Spec Plan: Correções de ConciliaçÁo (075)

## Tasks

- [x] [FRONTEND] Em `src/routes/conciliacao.index.tsx`, alterar o `disabled` do botÁo de avançar o DatePicker para `disabled={selectedDate === new Date().toISOString().substring(0, 10)}`.
- [x] [FRONTEND] Em `src/components/conciliacao/ResumoDiaPanel.tsx`, alterar o construtor do `inputForCalculation` em `saldo_bancario` para consumir `totalBancarioIn` ao invés de `totalBancarioRaw` como fallback (o OFX da holding multiplicado por N lojas nÁo deve ser somado no macro, usamos a soma das transações filtradas do dia).
- [x] [TEST] Verificar visualmente se a propriedade exibe o valor correto (sem os milhares de milhões) na interface.
- [x] [TEST] Verificar se o calendário pode navegar no dia atual (hoje).
