# Spec 443 — Restaurar fechamento por filial, Rede a compensar e vínculo Rede × OS

Status: em implementação. Prioridade: urgente.

## Problema

Depois da alteração do matcher Rede, o usuário relata desaparecimento de Rede a compensar, fechamento de filiais zerado e vendas com parcela de cartão compatível ainda sem vínculo automático. A correção precisa preservar simultaneamente três resultados: identificação da OS, liquidação bancária da adquirente e integridade do fechamento. Esta spec complementa a 440 (matcher e datas), mantendo a 441 (baixa/pátio) e a 442 (MEMO OFX) como trabalhos separados.

## Evidência auditada

Fonte: `C:\Users\admin\Downloads\auditoria-logs-2026-09-28.json`, 31 eventos entre 13:21:11 e 13:21:19. SHA-256: `CD5478BDA2C2AD9FA12B58060791FB903523600E6D01DB861DC81AA566C235D3`. O arquivo contém mensagens do aplicativo, não respostas SQL, IDs de transações nem a data contábil selecionada. A data no nome do arquivo é a da exportação; não prova que o fechamento seja de 28/09. O segundo print informa venda em 24/09/2026. Correlacionar a execução, o lote e a data antes do saneamento.

| Evidência do log | Resultado registrado |
|---|---:|
| OFX a processar | 46 lançamentos |
| Batch enviado ao banco | 78 transações |
| Pares de conciliação anunciados | 2 |
| Contas anunciadas como salvas | 28 / R$ 33.437,47 |
| Match de saídas | 0 vínculos / 7 débitos órfãos |
| RPC Rede × OS e PIX × OS | 0 Rede / 0 PIX |
| Divergência residual final | R$ 13.726,73 |

Os números enviados e as mensagens de sucesso não comprovam a quantidade realmente inserida, deduplicada ou atualizada. Os dois pares iniciais tampouco provam que houve vínculo Rede × OS; o log não identifica seu tipo.

| Filial | Rede a compensar anunciada |
|---|---:|
| Rudge Ramos - CAP | R$ 5.686,41 |
| Jabaquara - JAB | R$ 7.053,18 |
| Planalto - BRASICAR | R$ 1.568,70 |
| Kennedy - MP | R$ 4.660,57 |
| MHE MP | R$ 3.229,40 |
| Santo André - HD | R$ 5.052,32 |
| EMPORIO MP | R$ 6.411,13 |
| Jorge Beretta - DHJV | R$ 11.095,80 |
| Rei do Módulo - MP | R$ 3.477,47 |
| **Soma das nove mensagens** | **R$ 48.234,98** |

O motor anuncia zero liquidado no banco para essas nove filiais. Isso demonstra a contradição entre o processamento anunciado e o print, mas não autoriza gravar R$ 48.234,98 à força: o valor deve ser reconciliado com os registros persistidos e seu escopo temporal. Não há mensagem de Rede de Dom Pedro neste trecho; não assumir que aquela loja deveria ter movimento.

No primeiro print, Dom Pedro, Jabaquara e Jorge Beretta conservam saldo bancário e pátio, enquanto Rede, entradas, saídas e diferenças aparecem zeradas, com indicação de 100% conciliado. Portanto, o que está comprovadamente zerado na imagem é o detalhamento de movimentos, não todo o patrimônio. O usuário relata o mesmo nas demais lojas.

No segundo print, a OS #4427 mostra crédito de R$ 1.811,46, PIX de R$ 1.844,64, total de R$ 3.656,10 e saldo aberto zero. A venda selecionada é exibida como R$ 1.811,46 e recebe sugestão de match por valor. O código local passa o bruto ao modal, apesar do rótulo “Valor líquido”. Conferir `gross_amount`/`net_amount` reais, filial, origem da OS e unicidade antes de concluir elegibilidade automática. Havendo parcela bruta de cartão única elegível, o vínculo deve ocorrer mesmo com OS já paga, sem aumentar novamente `paid_value`.

## Diagnóstico confirmado no código local

1. **Existe um corte arbitrário de R$ 40 mil.** `src/hooks/useBackendConciliacao.ts:441-445` usa zero quando `raw.cartoes_a_compensar >= 40000`, caso não consiga o enriquecimento POS e não encontre o campo no snapshot. O total do log está acima do corte. É um defeito real, mas a execução desse ramo no incidente ainda não foi provada.
2. **Ausência/incompatibilidade de campos vira zero legítimo.** O mesmo hook (`:370-429`) preenche movimentos ausentes com `0`. `ConciliacaoLojasView.tsx:23-64` considera a loja presente pelo objeto, mesmo incompleto. `StoreCardModulo1.tsx:18-19` considera diferenças ausentes/zero corretas. A guarda de `ResumoDiaPanel.tsx:358-381` só bloqueia quando não existe nenhuma loja; um array com lojas e movimentos faltantes passa. O padrão do print é compatível com esse caminho.
3. **Snapshot parcial pode prevalecer sobre dados calculados.** `20260922000004_equalize_summary_rpc_centralized_saidas.sql:319-368` escolhe `metadata.stores` de dia fechado se o array tiver elementos, sem validar os campos obrigatórios. `CentralImportWizard.tsx:2043-2203` calcula e salva snapshot no frontend antes do matcher final; `:2380-2401` só chama `fechar_dia` no ramo `!advanceToWizard`. A RPC de fechamento grava `metadata = v_summary`; os demais caminhos não garantem o mesmo contrato. O log não registra a chamada final de `fechar_dia`; isso pede verificação, não comprova que a chamada faltou.
4. **Há fontes divergentes para Rede pendente.** A RPC de resumo local mais recente (`...20260922000004...sql:395-406`) soma `net_amount` sem filtrar liquidação; o hook subtrai `settled_amount` somente para estados diferentes de `entrou/liquidado`; a Central soma o arquivo antes do motor e possui fallback diferente. O hook mistura POS atual com snapshot fechado, podendo mudar uma foto histórica ao ocorrer liquidação posterior.
5. **Vínculo de OS ainda pode liquidar banco indevidamente.** A migration local `20260903000030_fix_match_stage2_rede_os_v_chosen_os_record.sql:263-265` marca `settlement_status='entrou'` ao casar OS. Já `auto_match_daily_transactions` na migration de 14/09 preserva esse estado. Corrigir só uma rota deixa a outra regredir o a compensar.
6. **O reconciliador bancário admite evidência insuficiente.** `reconciliadorRedeOfx.ts:155-193` fabrica crédito `ofx-balance-absorbed-*` da diferença de saldo; `:255-350` aceita tolerância de até 3% em certas liquidações e não exige a previsão de crédito nas comparações. A Central (`:2244-2340`) procura venda para atualizar pelo líquido aproximado ou substring de identificador, zera liquidações de não encontrados e atualiza OFX por FITID sem escopo de loja. Isso pode trocar a identidade da venda ou reutilizar créditos de outro período. São defeitos locais; o log desta execução anuncia zero liquidado, portanto não prova que esses ramos causaram o zero observado.
7. **Manual e automático têm candidatos diferentes.** `useManualMatch.ts` consulta `patio_os` e `estoque_os_pendente`; o SQL automático examinado consulta `patio_os`. O modal calcula sugestão por valor localmente. O SQL possui filtros de status/fallbacks e contagem de candidatos diferentes; o motor em memória usa outras regras. A ausência de motivo por candidato impede explicar a #4427. Match por valor não prova unicidade, mas deve alimentar o mesmo diagnóstico usado pelo automático.
8. **O log termina com sucesso incondicional.** `CentralImportWizard.tsx:2357-2442` registra divergência e depois sucesso global; também pode anunciar 100% conciliado apenas porque a lista de órfãos está vazia. Falhas de consulta e resultados incompletos não podem significar conciliação perfeita.

## Limite importante: versão em execução

O log contém a etapa `apply_ofx_balance_selection`, ausente em `src/` e `supabase/` da cópia local examinada. A sequência do log também difere do código local. Portanto, há evidência de diferença de versão entre a aplicação que produziu o log e este checkout. Não foi consultado o PostgreSQL implantado; não há conector SQL disponível nesta sessão. Antes de aplicar, capturar versão do frontend e definições efetivas de RPC/trigger. Não atribuir a regressão a um commit específico nem reinstalar a função antiga do repo como solução.

## Solução proposta

- Restaurar o fechamento por filial por uma única apuração no backend, com contrato completo, data e revisão identificáveis. O frontend deve renderizar o resultado; campos ausentes/erro de consulta são estado indisponível/inconsistente, nunca R$ 0,00 ou “100% conciliado”. Zero verdadeiro continua válido.
- Remover o corte de R$ 40 mil e as recomposições financeiras concorrentes do caminho afetado, substituindo-as pelo cálculo canônico testado. A soma de pendências das lojas deve coincidir com o total global da mesma revisão.
- Separar os estados Rede × OS e Rede × OFX. Associar OS não altera compensação. Somente crédito bancário real, datado e alocado às vendas corretas reduz a pendência. Não fabricar liquidação por variação de saldo, coincidência de valor isolada ou referência parcial.
- Preservar a regra de datas da spec 440 para vendas e explicitar o período de extrato do fechamento. Não reaproveitar cegamente o filtro de data da venda para OFX/contas. O lote deve declarar datas incluídas; a data da exportação de log não é data contábil.
- Concluir importação/match/apuração antes de publicar fechamento. Salvar um único snapshot completo pelo backend, incluindo lojas e indicadores globais da mesma revisão; manter importação parcial em rascunho. Revalidar o que foi persistido antes de anunciar sucesso.
- Auditar #4427 contra a parcela de cartão bruto e candidatos reais. Automatizar o vínculo informativo quando único e válido, mesmo com saldo aberto zero; explicar com código de motivo os casos recusados. Preservar identidade estrita para PIX e regras contra intercompany.
- Reparar somente datas/filiais/lotes comprovadamente afetados, com antes/depois, preservando saldos OFX escolhidos, justificativas, pagamentos e vínculos legítimos. Não reiniciar todos os fechamentos nem forçar os valores do log.

## Arquivos afetados

**Existentes reutilizados/modificados:** `src/hooks/useBackendConciliacao.ts`; `src/hooks/useDailySnapshot.ts`; `src/components/importacoes/CentralImportWizard.tsx`; `src/components/conciliacao/ConciliacaoLojasView.tsx`; `src/components/conciliacao/StoreCardModulo1.tsx`; `src/components/conciliacao/ResumoDiaPanel.tsx`; `src/components/conciliacao/StoreCartaoMaquininhaView.tsx`; `src/components/conciliacao/ManualMatchOsModal.tsx`; `src/hooks/useManualMatch.ts`; `src/components/importacoes/manual/Fase2RedeVsOsReview.tsx`; `src/lib/matchers/reconciliadorRedeOfx.ts`; `src/lib/matchers/autoMatchingEngine.ts`; `src/components/importacoes/wizard/PostMotorDiagnosticCockpit.tsx`; `src/components/importacoes/wizard/Step4FinalAuditAndClose.tsx`; `src/integrations/supabase/types.ts` se o contrato mudar. Remover apenas sobreposições relacionadas a fechamento/Rede; evitar refatorar cofre e demais domínios nesta correção.

**SQL histórico consultado, sem reescrever migrations aplicadas:** `20260903000030_fix_match_stage2_rede_os_v_chosen_os_record.sql`, `20260914000034_fix_rede_ofx_settlement_and_summary.sql`, `20260917000002_create_fechar_dia_and_standardize_statuses.sql`, `20260922000004_equalize_summary_rpc_centralized_saidas.sql`. Comparar com definições implantadas de resumo, matcher, fechamento e auditoria autônoma.

**Novos previstos:** migrations posteriores às existentes para RPCs/guardas; schema tipado compartilhado para validar resposta; testes de regressão de contrato/cálculo/SQL; procedimento de auditoria e reparação por IDs. Usar as tabelas existentes de vínculos e lotes quando suficientes; eventual estrutura de alocação bancária só após inspecionar schema real. Consultas de leitura adicionais: `SaldoBancosDetailModal`, `MaquininhasDetailModal`, `useReconciliationInsights` e rotas da conciliação. Graphify mapeou 27 nós dependentes do hook; validar consumidores sem alterar todos por padrão.

## Aceitação e rollback

Critérios detalhados em `design.md`: fechamento por loja/global consistente; nenhum valor zerado por limite/ausência de campo; OS paga vinculável sem dupla baixa; liquidação bancária independente; snapshots completos e históricos estáveis; nenhum sucesso global falso. Verificar por testes de integração SQL e testes de contrato no terminal, além de `npm run build`.

Guardar funções implantadas, hashes dos arquivos, IDs/vínculos, resumos e snapshots antes da intervenção. Usar alterações aditivas/compatíveis, transação e bloqueio por data no fechamento, reparação com pré-condição de revisão e execução reversível por lote. Se falhar a validação, reverter somente o patch aplicado e as linhas comprovadamente alteradas; preservar dados importados e trabalho concorrente. Rollback de RPC por migration compensatória da versão realmente implantada, sem restaurar cegamente SQL antigo permissivo. Não alterar snapshots anteriores/posteriores sem dependência comprovada.
