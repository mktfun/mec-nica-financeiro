# Design e auditoria — Spec 443

## 1. Verificação inicial que decide a correção

Correlacionar o log exportado com o `import_batch_id`, ambiente/versão do aplicativo e data selecionada. Os horários isolados do JSON não contêm fuso/data completa. Na leitura do banco, comparar POS, OFX, contas, OS, vínculos, `reconciliations`, snapshot e retornos da RPC para a MESMA data e escopo de loja. Capturar retorno bruto antes de qualquer normalização JavaScript.

Consultas de diagnóstico somente leitura, após estabelecer a conexão correta:

```sql
SELECT p.oid::regprocedure AS assinatura, pg_get_functiondef(p.oid) AS definicao
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname IN (
  'get_daily_reconciliation_summary', 'fechar_dia',
  'auto_match_daily_transactions', 'match_stage2_rede_os',
  'run_autonomous_reconciliation_loop', 'apply_ofx_balance_selection'
);

SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name IN (
  'pos_transactions', 'ofx_transactions', 'patio_os', 'estoque_os_pendente',
  'conciliation_matches', 'daily_snapshots', 'reconciliations', 'import_batches'
) ORDER BY table_name, ordinal_position;
```

Depois de confirmar as assinaturas e que a RPC de resumo é somente leitura, comparar `get_daily_reconciliation_summary(D, false)` com `(D, true)` e `daily_snapshots.metadata.stores`. Inspecionar distribuição por `target_date`, data efetiva em `occurred_at`, filial, lote, `settlement_status` e `settled_date`, com quantidade e soma bruta/líquida. Conferir políticas RLS com o mesmo perfil do frontend: consulta vazia por permissão também não prova ausência de movimentos.

Árvore de decisão:

1. Dados persistidos corretos + resumo dinâmico correto + snapshot incorreto: revisar snapshot/contrato de fechamento, sem reimportar transações.
2. Dados corretos + resumo dinâmico zerado: investigar filtros de data/loja/RLS, joins e versão efetiva da RPC.
3. Resumo bruto correto + tela zerada: corrigir schema/adaptador/prioridades do frontend, incluindo o corte de 40 mil.
4. Dados fora da data ou ausentes: localizar lote, deduplicação e erro de escrita; reparar a ingestão comprovada antes de recalcular.
5. Resultado do motor em memória diferente da leitura persistida: tratar como falha de gravação/verificação, sem anunciar fechamento concluído.

Não presumir que os cinco casos são mutuamente exclusivos.

## 2. Datas e identidade

Manter separados data da venda, data esperada do crédito, data real do crédito, período contábil do fechamento e data de importação. As vendas Rede do dia obedecem à data canônica definida na spec 440. Pendências anteriores podem aparecer em um estoque a compensar separado e liquidar depois; não devem reaparecer como vendas novas ou candidatos à OS do dia.

Nesta correção, preservar o significado atual de `cartoes_a_compensar` como pendência da coorte de vendas incluídas no fechamento; não transformá-lo silenciosamente em soma de todo o histórico. Se o produto precisar consolidar estoque anterior, expor separadamente `saldo_anterior`, `novas_pendencias`, `liquidacoes` e `saldo_final`, conciliados no backend. Para o período OFX, registrar vínculo explícito de lote/conta/competência em vez de ampliar indiscriminadamente janelas de até quatro dias. Não mover todas as linhas para uma data pelo nome do arquivo.

Para cada vínculo bancário, usar IDs persistidos de POS/OFX e escopo da loja/conta; preservar NSU/autorização/estabelecimento como evidência adicional. Não identificar linha por igualdade do líquido ou `dedup_hash.includes(saleId)`. Não aplicar atualização por FITID isolado a múltiplas lojas. Ausência de arquivo/venda no lote atual não autoriza limpar uma liquidação anterior válida.

## 3. Regra única para a compensação

Rede × OS registra a origem do pagamento do cliente. Não altera `settlement_status`, `settled_amount` ou `settled_date`. Rede × OFX registra crédito efetivo da adquirente e suas alocações, com data e valor. É o único domínio autorizado a reduzir a pendência bancária.

Para vendas positivas elegíveis, na data de corte D:

`pendente_venda(D) = max(0, liquido_elegivel - liquidacoes_comprovadas_ate_D)`

`a_compensar_loja(D) = soma das pendencias da coorte da loja`

`cartoes_a_compensar(D) = soma de a_compensar_loja(D)`

Uma liquidação posterior a D não reduz a foto fechada em D. Parcelas precisam de alocação datada; `settled_amount` atual sozinho não basta para reconstruir dias passados. Se não houver trilha suficiente, usar snapshot íntegro ou sinalizar histórico indisponível; não inventar rateio. Estornos/devoluções ficam explicitamente separados e são abatidos uma única vez segundo a regra existente, sem usar `abs` para transformá-los em recebíveis positivos. Estados legados `pending/matched/entrou/liquidado/parcial/a_compensar/nao_entrou` precisam de normalização baseada na evidência bancária; `matched` de OS não prova compensação.

Remover crédito sintético inferido por diferença de saldo. Divergência entre abertura, movimentos e saldo final gera pendência de auditoria. Tolerâncias não podem liquidar diferenças de 3% sem lançamento/documento de ajuste identificável; comparar líquido Rede com crédito bancário sem descontar MDR duas vezes. O valor alocado de cada OFX nunca excede seu crédito disponível, e um mesmo crédito não pode liquidar lotes independentes duas vezes.

## 4. Contrato de resumo e publicação

Tipos reais existentes: `DailyReconciliationSummary` contém `date`, `cartoes_a_compensar`, `diferenca_final`, `status_geral`, `stores` e `stores_detail?`; `StoreReconciliationSummary` contém `store_id`, `saldo_banco`, `maquininha`, `pix`, `na_loja_os`, `previsto_ofx`, `diferenca`, `status` e vários movimentos opcionais. `StoreCardData` já aceita números `null` e `isMissingData?`. Hoje a opcionalidade dos movimentos permite preencher payload incompleto com zero.

Estender o contrato canônico com versão, revisão, data de apuração, origem (`live`/`snapshot`) e estado de integridade (`complete`, `incomplete`, `inconsistent`). Definir no schema Zod os campos obrigatórios de movimento por filial: contagens POS/OFX entrada/OFX saída/contas, bruto/líquido Rede, a compensar, totais OFX, parcelas conciliadas/justificadas e diferenças. Nos estados incompletos, retornar motivo e manter valores indisponíveis como `null`; não aceitar `NaN` nem strings inválidas convertidas em zero. IDs e tipos devem partir dos contratos inspecionados, sem `any` no novo adaptador.

Os números financeiros e o estado de integridade são calculados no backend. A UI apenas valida contrato, formata e apresenta. Eliminar sobreposição do a compensar por consultas locais, limite de 40 mil e fallback por teste `> 0`; zero legítimo precisa permanecer zero. Nunca montar a mesma resposta com movimentos de snapshot de uma revisão e pendências POS vivas de outra.

Snapshot completo exige todas as lojas do escopo, campos obrigatórios, revisão e conservação de totais. Array não vazio não basta. Um dia sem movimentos pode conter saldo bancário/pátio e continua válido se as contagens e totais bancários do período comprovarem zero. A guarda deve detectar especificamente campos faltantes ou contagens persistidas incompatíveis, sem bloquear um dia legítimo apenas por ter patrimônio.

Pipeline: validar arquivos/escopo → inserir/deduplicar com resultado verificável → executar match operacional e liquidação bancária isolados → auditar pendências → apurar resumo canônico → verificar contrato/invariantes → publicar snapshot completo. Reutilizar o bloqueio transacional por data de `fechar_dia`, proteger a revisão contra importação concorrente e impedir snapshot parcial publicado como fechado. Tanto `advanceToWizard` quanto conclusão direta devem atingir o mesmo finalizador. Rascunhos podem ser salvos antes, sem `is_closed=true` nem selo de conciliação.

Fechamento completo pode estar divergente; refletir `closed + divergence` com motivos. Incompletude técnica impede publicação como fechamento válido. Mensagem final distingue importado, conciliado parcialmente, fechado com divergência e falha. Os sete débitos órfãos e R$ 13.726,73 do log não podem coexistir com uma alegação genérica de 100% conciliado da mesma execução.

## 5. Caso obrigatório: OS #4427

Reproduzir a OS com crédito 1.811,46 + PIX 1.844,64 = total/pago 3.656,10, saldo zero. Identificar o POS do print por ID/NSU/loja e verificar se 1.811,46 é de fato `gross_amount`; o rótulo atual do modal não é evidência do líquido. Buscar fontes realmente usadas pelo automático e manual, status, datas, campos estruturados de pagamento e candidatos concorrentes.

Se houver exatamente uma parcela de cartão elegível para aquela venda na mesma filial, vincular informativamente sem incrementar `paid_value`, sem reabrir a OS e sem alterar compensação. Se houver colisão, conflito, parcela já consumida, fonte não elegível ou data ambígua, retornar motivo explícito e candidatos. Não usar `total_value=3.656,10` ou saldo zero como critério para recusar uma parcela de cartão válida. Não proibir outros meios de pagamento na mesma OS nem usar apenas número de OS global como chave; isolar por filial e parcela/pagamento.

O modal e o automático devem consumir o mesmo diagnóstico do servidor (consolidar o trabalho da spec 440). Exibir bruto, taxas e líquido corretamente. Um badge local de valor igual não substitui a decisão automática, mas o usuário deve ver o motivo concreto que impediu a associação.

## 6. Observabilidade e recuperação

Evoluir o log estruturado com `run_id`, `import_batch_id`, data contábil, versão da aplicação/RPC/contrato, filial, etapa, contagens enviadas/inseridas/atualizadas/deduplicadas/rejeitadas, totais antes/depois, revisão, resultado/error real da escrita e motivos de match por POS. Não registrar credenciais nem duplicar dados pessoais desnecessários. A mensagem de R$ 48.234,98 deve dizer se é previsão em memória ou total lido do banco.

Recuperação: exportar apenas linhas/estados relacionados; classificar causa pela árvore da seção 1; corrigir contrato/cálculo antes do reprocessamento; executar dry-run por data/filial; comparar todos os pilares e vínculos; publicar revisão corrigida de forma auditável. Valores oficiais de saldo e justificativas não serão substituídos pelos valores do log. Retificar histórico fechado exige trilha de revisão e preservação da versão anterior. Verificar se correção de D impacta a abertura de D+1, sem reescrever automaticamente toda a série.

## 7. Aceitação e testes de regressão

| Cenário | Resultado verificável |
|---|---|
| Total 39.999,99 / 40.000,00 / 48.234,98 | Nenhum corte artificial; soma das lojas igual ao global |
| Fixture das nove mensagens do log, sem liquidação comprovada | 48.234,98 pendente; Jabaquara 7.053,18 e Jorge Beretta 11.095,80 visíveis; fixture não substitui apuração real |
| Loja presente com saldo/pátio e campos de movimento ausentes | Estado incompleto, sem selo de 100%, sem publicar snapshot completo |
| Consulta/RPC falha ou RLS retorna escopo insuficiente | Erro ou incompletude visível; não converter em dia vazio |
| Dia realmente sem movimentos, comprovado pelas contagens | Zero válido com saldo/pátio preservados |
| Vínculo Rede × OS por qualquer rota | `settlement_status`, valor/data de liquidação inalterados |
| OS #4427 paga, cartão único compatível | Vínculo sem dupla baixa; PIX preservado; motivo explícito se não elegível |
| Duas vendas/OS com valor igual | Sem primeira escolha arbitrária; ambiguidade diagnosticada |
| Crédito D−1, venda D; ou liquidação real D+1 | Sem liquidar venda por crédito anterior; snapshot D não muda ao liquidar em D+1 |
| Liquidação parcial, estorno, crédito utilizado duas vezes | Residual e sinal corretos; nenhum consumo acima do crédito; sem dupla dedução |
| Snapshot parcial antigo e resumo dinâmico completo | Inconsistência detectada; recuperação controlada, sem mistura de revisões |
| Reexecução e dois fechamentos concorrentes | Sem duplicidade, baixa extra ou publicação parcial |
| 7 órfãos e divergência 13.726,73 | Status compatível com pendências, não 100% conciliado |
