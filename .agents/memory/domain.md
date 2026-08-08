## [2026-08-07] — [Feature ID: 146]

**Contexto:** O sistema estava perdendo despesas do OFX que foram baixadas e processadas hoje (target_date), mas cujas datas da transação original (occurred_at) eram de dias anteriores. A view substituía a data-alvo de conciliação pela data física.

**Regra aprendida:** Em importações bancárias para sistemas de conciliação diária, as transações físicas possuem seu momento `occurred_at` original, mas DEVEM possuir e ser unificadas via uma `target_date` que indica em que conciliação diária aquela despesa/receita foi atribuída. Nunca substitua um pelo outro.

**Risco identificado:** Forçar o `target_date` como sendo o `TO_CHAR(occurred_at, 'YYYY-MM-DD')` diretamente na View quebra a lógica de retroatividade de arquivos OFX que agrupam lançamentos passados.

**Não fazer:** Nunca crie views contábeis ou de transações que removam a data de contexto da importação, mantendo apenas a data da ocorrência original. A contabilidade da loja é fechada no "caixa", logo a transação passa a valer na data em que o fluxo foi consolidado.
