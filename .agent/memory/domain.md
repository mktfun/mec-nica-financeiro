## [2026-08-07] — [Feature ID: 141-fix-conciliacao-valor-contas-fluxo]

**Contexto:** O painel global de Conciliação Diária estava com a matemática quebrada, ignorando contas originárias de OFX e não calculando o Fluxo de Caixa histórico. A RPC do Supabase (`get_dashboard_metrics`) desviava das fórmulas aplicadas no React.

**Regra aprendida:** The Single Source of Truth matemática. Para a conciliação:
1. "Valor Contas" DEVE abrigar as saídas (type=out) do banco de dados onde `source = 'ofx'`, pois representam despesas não mapeadas pelo sistema interno.
2. "Fluxo de Caixa" DEVE ser obrigatoriamente a diferença entre `Caixa Atual (hoje)` e `Caixa Atual (ontem / snapshot fechado anterior)`. O cálculo nunca deve ser `Faturamento Líquido - Contas`, pois a variação patrimonial é a única métrica que importa para o usuário.

**Risco identificado:** Matemática em duplicidade. O frontend e o backend devem sempre utilizar a mesma fórmula para compor fluxos, caso contrário o cliente vê um valor na tela principal e outro no breakdown detalhado.

**Não fazer:** Nunca preencher propriedades matemáticas reativas com variáveis hardcoded (ex: `totalOfxOut={0}`) em componentes vitais como o dashboard, ocultando bugs do backend no layout.

## [2026-08-07] — [Feature ID: 145-fix-fluxo-and-autosave]

**Contexto:** Correção avançada na matemática do fluxo de caixa e automação do autosave no `CentralImportWizard.tsx`.

**Regra aprendida:** 
1. "Valor Disponível" DEVE ser calculado como `Faturamento - Fluxo de Caixa`, nunca somado.
2. "Diferença" DEVE ser `(Faturamento - Fluxo de Caixa) - Valor Contas`, fechando o saldo zero exato.
3. Snapshots Diários (`daily_snapshots`) devem ser auto-salvos assim que uma importação de lote é confirmada via RPC `get_dashboard_metrics` para garantir que o "Caixa Anterior" (o lastro do fluxo de caixa) sempre exista para o próximo dia.

**Risco identificado:** Ficar dependendo de interação humana (clique manual de "Salvar Fechamento Diário") impede que conciliações de dias passados fechem a matemática do fluxo de caixa porque o "Caixa Anterior" se perde no banco.

**Não fazer:** Nunca calcular Fluxo de Caixa sem ter um snapshot gravado do último estado, pois o lastro financeiro se torna inexistente.

## [2026-08-10] — [Feature ID: match-audit-and-fix]

**Contexto:** Correção da engine de Auto-Match (RPC `auto_match_transactions`) para respeitar regras de escopo global vs local (loja) durante o pareamento de OFX, Maquininha e OS.

**Regra aprendida:** O OFX bancário é global (`store_id` é nulo). Maquininhas (POS) e Ordens de Serviço (OS) são locais (`store_id` definido). O pareamento exige 3 pipelines distintos: 1) PIX (OFX Global vs OS Local - busca transversal); 2) Maquininha Líquida vs OFX Rede (Soma de POS local vs entrada OFX global); 3) Maquininha Bruta vs OS Cartão (POS local vs OS local no cartão).

**Risco identificado:** Tentar fazer `WHERE store_id = ofx.store_id` quebra silenciosamente qualquer match porque `NULL = DP` avalia como falso. Além disso, esquecer do LIMIT 1 nas associações pode causar N matches para a mesma OS caso hajam valores repetidos no mesmo dia.

**Não fazer:** Nunca assuma que transações bancárias (OFX) terão `store_id` populado, e nunca ignore o valor bruto da maquininha no pareamento direto com a OS (pátio).
