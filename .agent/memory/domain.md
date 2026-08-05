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

**Não fazer:** Nunca salvar `bank_total` em centavos na tabela `reconciliations`. Se detectar valores > 10.000 sem casas decimais nos dados, desconfie de centavos.