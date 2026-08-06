## [2026-08-03] — [Feature ID: 056 e 057]

**Contexto:** Implementação de parsing, mapeamento e idempotência de transações de Maquininha (Rede) para não perder dados genéricos (Visa, Mastercard) e não duplicar transações ao importar múltiplas vezes.

**Regra aprendida:** Transações de maquininha não devem ter bandeiras genéricas excluídas de forma destrutiva (ex: 'IGNORAR'). Em vez disso, elas devem receber um ID sintético determinístico (fitid gerado combinando fonte, loja, data, valor líquido e método) para serem absorvidas pelo Upsert nativo da tabela de transações (onConflict: 'store_id, fitid').

**Risco identificado:** A geração de IDs sintéticos deve evitar espaços em branco inconsistentes (usando replace de espaços e lowercase) para que re-importações gerem o mesmíssimo hash e desencadeiem o Upsert.

**Não fazer:** NUNCA usar uma estratégia destrutiva (descartar silenciosamente do array) para lidar com sujeira em tabelas de importação se as linhas na verdade representam transações reais com metadados agrupados.

## [2026-08-04] — [Feature ID: 079]
**Contexto:** Correção do loop infinito do valor a_loja_os no Painel Global.

**Regra aprendida:** Nunca use o valor currentSnapshot para recalcular o próprio currentSnapshot em campos agregados como o Pátio Global. Use uma computação derivada (Object.values(storesData).reduce(...)) a partir das fontes base. Isso previne que valores bugados sobrescritos no banco travem a tela.

**Não fazer:** Não sobrescreva campos de snapshot global lendo do próprio snapshot se eles são soma viva das lojas.

## [2026-08-05] — [Feature ID: 084-maquininha-ui-fix]

**Contexto:** Correção do fechamento diário da conciliação que estava com valores de maquininha zerados e vazando transações de outros dias devido a buscas no banco usando occurred_at.

**Regra aprendida:** 
1. **Isolamento Diário (Regra de Ouro):** Toda e qualquer busca de dados para conciliação ou histórico DEVE ser filtrada exclusivamente por target_date. Nunca use occurred_at ou created_at em listagens de conciliação diária, pois as datas reais das transações (do arquivo) frequentemente caem em dias diferentes do pacote de fechamento e causarão vazamento de dados fantasmas em dias indevidos.
2. **Dupla-Entrada Maquininha:** Arquivos genéricos de maquininha e arquivos da Rede devem ser registrados tanto na tabela receivables quanto na tabela transactions com seus respectivos source ('maquininha' ou 'rede') para que a conciliação diária consiga consolidá-los.

**Risco identificado:** Se novos wizards de importação não inserirem na tabela transactions, os totais na tela de conciliação falharão silenciosamente.

**Não fazer:** Nunca use .gte('occurred_at', startOfDay) em views e hooks da UI de conciliação.

## [2026-08-05] — [Feature ID: 085-clear-snapshot-bug]

**Contexto:** Ao acionar a limpeza de banco ("Limpar Todos os Dados"), os metadados manuais e globais como "Dinheiro MP", "A Receber" e "Juros (REDE)" sobreviviam no banco e vazavam como fantasmas para as telas de conciliação diária de outras datas.

**Regra aprendida:** 
1. **Lixo Órfão:** A tabela daily_snapshots armazena os metadados contextuais de uma data (target_date) gerados via wizard de importação ou inputs manuais. Ao implementar rotinas de clear db ou limpeza de período, **nunca se esqueça de incluir a tabela daily_snapshots**. Caso contrário, telas de UI que puxam snapshots (como os painéis de conciliação) exibirão valores zumbis sobrepostos.

**Não fazer:** Nunca crie lógicas de hard-delete do banco (useClearAllData) que esqueçam de listar a tabela daily_snapshots.

## [2026-08-05] — [Feature ID: 087-fix-import-duplications]

**Contexto:** Ao importar extratos OFX várias vezes ou lidar com transações de maquininha "GLOBAL" (store_id null), o Dashboard apresentava valores astronômicos (duplicação).

**Regra aprendida:** 
A regra de ouro na importação é: *Importar um dia é um pacote fechado. O novo pacote substitui o pacote velho daquele dia.*
- **OFX e fitid:** NUNCA confie cegamente no `fitid` do banco para `upsert`. Alguns bancos mudam o `fitid` na re-exportação. Use sempre a estratégia **Delete-then-Insert**: delete todas as transações daquela `target_date` (e daquele `store_id`) antes de inserir as novas.
- **Null store_id:** Lembre-se de deletar explicitamente `.is('store_id', null)` ao invés de ignorá-lo na query de deleção global.

**Risco identificado:** Usar `upsert` baseado em chaves geradas externamente (`fitid`) pode gerar acúmulo infinito de fantasmas se o provedor alterar a string em exportações subsequentes, inflando o financeiro.

**Não fazer:** Nunca use `upsert` na tabela de transações para deduplicação de importações de arquivos em lote visando atualizar conciliações diárias. Sempre apague o estado anterior da data inteira e re-insira do zero.

## [2026-08-05] — [Feature ID: 088-fix-dashboard-centavos]

**Contexto:** O Dashboard exibia valores astronômicos (R$ 12 milhões) no Saldo Total. A causa era que `bank_total` na tabela `reconciliations` estava armazenado em centavos (inteiro), mas o hook `useDashboardV2.ts` lia e somava como reais.

**Regra aprendida:**
- **Centavos OFX Brasileiros:** Bancos brasileiros (Itaú, Bradesco etc.) exportam o `BALAMT` no OFX como inteiro sem ponto decimal (ex: `1931431` ao invés de `19314.31`). O parser deve SEMPRE verificar se a string não tem separador decimal E o valor é > 100, e se sim, dividir por 100 antes de salvar como `bank_total` em reais.
- **Unidade Canônica:** A unidade do sistema é REAIS com duas casas decimais. Nenhum campo monetário do Supabase deve jamais armazenar centavos.

**Risco identificado:** Se o banco exportar `5000` como centavos (R$ 50,00), o critério `> 100` ativaria a divisão erroneamente (resultaria em R$ 50,00 correto, coincidência feliz). Mas se o saldo real for R$ 50,00 e vier como `5000`, precisaria dividir. Edge case raro e aceitável dado o padrão dos bancos nacionais.

**Não fazer:** Nunca salvar `bank_total` em centavos na tabela `reconciliations`. Se detectar valores > 10.000 sem casas decimais nos dados, desconfie de centavos.## [2026-08-05] — [Feature ID: 089]

**Não fazer:** Nunca salvar `bank_total` em centavos na tabela `reconciliations`. Se detectar valores > 10.000 sem casas decimais nos dados, desconfie de centavos.

## [2026-08-05] — [Feature ID: 089]

**Contexto:** O saldo anterior (Caixa Inicial) da conciliação estava propenso a amnésia e efeito cascata caso dias anteriores não tivessem sido importados. O OFX traz essa verdade na transação com `<MEMO>SALDO ANTERIOR`.

**Regra aprendida:** O `<SALDO ANTERIOR>` extraído do OFX também precisa de verificação anti-centavos, pois seu `<TRNAMT>` pode vir sem vírgulas em contas do Itaú (ex: `1931431`). Use a mesma lógica de divisão por 100 do `bank_total`. Na conciliação, deve-se usar esse `previous_balance` originado do OFX para que o dia feche independente de o usuário ter pulado importações de dias anteriores.

**Risco identificado:** Basear o Saldo Anterior em snapshots de fechamento de conciliação de ontem quebra todo o sistema em cascata se o usuário pular um dia. O OFX blinda isso.

**Não fazer:** Nunca recalcule Saldo Anterior via soma de tabelas se ele já vem escrito de forma absoluta no próprio documento bancário importado.

## [2026-08-05] — [Feature ID: 090-reconciliation-math]

**Contexto:** Refatoração matemática da conciliação para resolver o descasamento temporal (D+1, D+30) e separar Venda Bruta (OS) de Pagamento Líquido (OFX).

**Regra aprendida:** 
- A divergência principal em relatórios de vendas ocorre pelo desconto das taxas da maquininha.
- **OS (Bruto)** deve ser cruzada com **Maquininha (Bruto)** na Data da Venda.
- **Maquininha (Líquido)** deve ser cruzada com **OFX (Líquido)** na Data do Payout.
- A tabela `transactions` precisa suportar campos `gross_amount` e `fee_amount` para registrar a anatomia completa da venda da maquininha, evitando que o desconto pareça uma divergência de quebra de caixa.

**Risco identificado:** Tentar conciliar a venda da maquininha de hoje (D+0) com o depósito do banco (D+1) usando a mesma data gera falsos "em caminho" infinitamente.

**Não fazer:** Nunca subtrair OS Bruto de Banco Líquido de forma direta. A diferença entre os dois deve ser classificada de forma transparente como Juros/Taxas da adquirente.

## [2026-08-06] — [Feature ID: 092-fix-faturamento-math]

**Contexto:** Refatoração do cálculo de faturamento na conciliação. Em vez de somar expectativas, o faturamento passou a ser extraído do cruzamento real dos depósitos do OFX (`faturamento_real_ofx`) que estão devidamente linkados (`conciliation_matches`). A diferença agora é tratada como a balança: `(Expectativa Maquininha + Expectativa PIX) - Realidade Faturamento (OFX)`.

**Regra aprendida:** O cálculo de Conciliação Diária de uma loja é uma balança de verificação (Expectativa vs Realidade) e não uma construção teórica. O Faturamento não é o que o sistema Pátio/OS gerou de receita no dia, mas única e exclusivamente o dinheiro real (OFX) pingado na conta e comprovadamente amarrado, somado às liquidações de cartão.

**Risco identificado:** Construir faturamentos baseando-se em `paid_value` de uma OS causa divergências imensas com o financeiro bancário, criando desconfiança. Só registre como "Faturamento Atual" aquilo que for corroborado pelo banco/adquirente.

**Não fazer:** NUNCA calcule "Faturamento da Loja" somando os totais preenchidos no sistema de gerenciamento de OS (Pátio OS). Esse valor representa apenas a "Expectativa", não a liquidez real bancária.

## [2026-08-06] — [Feature ID: 093-fix-faturamento-visor]

**Contexto:** O faturamento no visor de conciliação diária foi ajustado para consolidar duas realidades: o arquivo da Maquininha (liquidação em D+0) e o PIX (crédito no OFX). Anteriormente, a Maquininha estava de fora do visor de faturamento.

**Regra aprendida:** O Faturamento Real de D+0 é a soma de TUDO o que foi processado e liquidado no dia pela operação (Cartão Entrou) mais as entradas diretas na conta corrente (PIX no OFX). A Diferença (Balança) compara essa realidade com a expectativa declarada (Maquininha lida + PIX de OS).

**Risco identificado:** Excluir do `Faturamento` a Maquininha causa um falso positivo grave de diferença, pois a expectativa (OS + Rede) será sempre muito maior que apenas o PIX bancário.

**Não fazer:** Nunca restrinja o Faturamento de uma loja exclusivamente ao arquivo OFX. Arquivos de Adquirentes também são documentos de liquidez real e devem compor o painel principal.

## [2026-08-06] � [Feature ID: 095-fix-pix-match-text]

**Regra de Nomenclatura Banc�ria:** NUNCA filtre dep�sitos ou recebimentos PIX/TED do extrato (OFX) buscando por nomes fixos no t�tulo (como 'PIX', 'TRANSF' ou 'TED'). Cada institui��o financeira utiliza nomenclaturas legadas diferentes (ex: DEP DINH, CRED TEF). Para cruzar valores recebidos, utilize sempre e unicamente a valida��o matem�tica do valor atrelada � dire��o do fluxo (	ype === 'in').

## [2026-08-06] � [Feature ID: 096-fix-math-rage]

**Blindagem Planilha vs Banco:** O Faturamento deve ser estritamente o valor que consta no extrato banc�rio (OFX) vinculado. NUNCA some expectativas de recebimento de planilhas (como Maquininha ou previs�es de PIX) com os valores consolidados do banco no c�lculo de Faturamento. A diferen�a de fechamento deve ser estruturada como (Planilhas) - (Faturamento Banco).
**Snapshot Hist�rico (P�tio OS):** Valores mut�veis (como d�vidas de OS no p�tio) devem sofrer snapshot no momento da importa��o e serem salvos no banco para a data-alvo. N�o dependa de tabelas vivas para calcular saldos hist�ricos.

## [2026-08-06] � [Feature ID: 097-saldo-faturamento-fix]

**Nomenclatura UI e Diferen�a:** O termo 'Faturamento Banco' substitui 'Saldo' para representar exclusivamente o dinheiro que entrou na conta (OFX IN). O 'Previsto' representa o que a loja declarou esperar (Maquininha + PIX planilhados). A 'Diferen�a' no fechamento � SEMPRE calculada como Faturamento Banco - Previsto. Valores positivos (>= 0) indicam sobra de caixa e devem ser exibidos em verde. Valores negativos indicam falta/furo e exibidos em vermelho.
