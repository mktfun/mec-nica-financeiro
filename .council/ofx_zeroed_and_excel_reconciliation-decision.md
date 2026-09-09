# 🏛️ Deliberação do Conselho Técnico: Causa-Raiz das 4 Filiais Zeradas no OFX e Discrepância de Planalto (Sistema x OFX x Excel)

**Data:** 09/09/2026  
**Status:** [DECISION_APPROVED]  
**Tema:** Investigação Forense dos 10 Extratos OFX (`C:\Users\admin\Desktop\conciliacao\09-26\09-09`), Planilha Excel (`C:\Users\admin\Downloads\CONCILIAÇÃO 0909.xlsx`) e Print do Sistema (Raio-X de Saldos).

---

## 👥 Personas e Rodada 1 — Diagnósticos Técnicos

### 1. O Pragmático (Engenheiro de Execução)
> "O bug das lojas zeradas é simples, direto e mecânico: nos 10 arquivos OFX recebidos, 4 lojas (Rudge Ramos, Santo André, Jabaquara e Kennedy) não tiveram transações financeiras liquidadas especificamente no dia 09/09. Todas as movimentações delas eram de 08/09. O nosso código do importador (`useTransactions.ts:503`) assumiu cegamente que a data do saldo bancário deveria ser a data da última transação, gravando o saldo no dia 08/09. Depois, o wizard gravou o pátio de OSs no dia 09/09 com `bank_total: null`, criando uma linha vazia que 'engoliu' o saldo.
> 
> Já no caso do Planalto: o banco Itaú diz formalmente na tag `<LEDGERBAL>` que o saldo é **-R$ 5.659,95**. O sistema leu o arquivo perfeitamente. O Excel está com -R$ 7.659,95 porque quem preencheu o Excel digitou na mão um número estático 2 mil reais maior. O sistema não errou; quem errou foi o Excel!"

### 2. O Cético (Auditor de Risco e Segurança de Dados)
> "Vejam o perigo da planilha manual: analisando o Excel célula a célula, descobri que em Mauá, Rudge Ramos e Santo André o operador somou o saldo bancário com as vendas de cartão que ele achava que iam entrar:
> - Mauá: Banco R$ 147,88 + Débito R$ 629,78 = R$ 777,66 no Excel.
> - Rudge Ramos: Banco R$ 2.913,76 + Crédito R$ 942,40 = R$ 3.856,16 no Excel.
> - Santo André: Banco R$ 2.171,16 + Crédito R$ 8.639,70 = R$ 10.810,86 no Excel.
> 
> O Excel não tem segregação patrimonial. Ele mistura saldo bancário liquidado com previsão de vendas futuras na mesma linha. Se o sistema imitasse o Excel, cometeríamos fraude de fluxo de caixa por dupla contagem (somar o saldo bancário inflado com o pilar de cartões a compensar). O sistema DEVE manter o saldo bancário estritamente igual ao extrato oficial do Itaú."

### 3. O Arquiteto (Padrões, Banco e Integridade SSOT)
> "Na modelagem de dados, a tabela `reconciliations` possui chave única `(store_id, date)`. Quando o importador processa múltiplos lotes (OFX, OSs, Pátio, Rede), qualquer operação de `upsert` parcial com colunas omitidas ou sobrescritas como nulas corrompe o snapshot diário.
> 
> Precisamos de três garantias arquiteturais imediatas:
> 1. **Âncora de Data do Saldo Bancário:** O saldo bancário extraído do OFX (`<LEDGERBAL>`) deve ser gravado obrigatoriamente na `targetDate` da conciliação (ou na data da tag `<DTASOF>`), NUNCA na data de transações individuais antigas.
> 2. **Idempotência no Upsert de Pátio:** Em `CentralImportWizard.tsx`, o salvamento de pátio deve usar `COALESCE` ou atualizar apenas `na_loja_os`, sem sobrescrever `bank_total` para nulo.
> 3. **Fallback da RPC `get_daily_reconciliation_summary`:** Se uma loja tiver `bank_total` nulo ou zerado na data mas possuir saldo consolidado no dia anterior útil sem movimentação, herdar o saldo com status 'sem movimentação'."

### 4. O Advogado do Diabo (Desconstrutor de Premissas)
> "O usuário tomou um susto achando que 'piorou o import dos OFX' porque viu 4 lojas zeradas e Planalto com 2k de diferença. Mas a verdade nua e crua é o oposto:
> - Em 6 lojas, o sistema bateu centavo por centavo com o extrato bancário oficial do Itaú.
> - Em Planalto, o sistema provou matematicamente o saldo do banco Itaú (-5.659,95), enquanto o Excel estava com uma digitação estática não comprovada (-7.659,95).
> - O único defeito real do sistema foi o deslocamento temporal de 1 dia (D vs D-1) nas 4 lojas que não movimentaram a conta corrente no dia 09/09.
> 
> Ajustando essa âncora de data e corrigindo as 4 lojas, o sistema atinge 100% de precisão auditável contra os extratos reais do Itaú."

---

## ⚔️ Rodada 2 — Refutação Cruzada e Trade-offs

- **Cético questiona Pragmático:** "Podemos apenas forçar a data `targetDate` ao salvar o OFX?"  
  **Resposta do Pragmático:** "Sim! Se o operador está importando a pasta `09-09`, o saldo bancário da conta naquele momento é o saldo daquela data de fechamento. O `<DTASOF>` dos 10 arquivos é `20260909100000`. Portanto, o saldo é estritamente do dia 09/09."
- **Arquiteto questiona Cético:** "E se o usuário quiser ver no sistema a soma de banco + cartão igual ele faz no Excel?"  
  **Resposta do Cético:** "Jamais misturar no campo `bank_total`. No sistema, o modal Raio-X já possui as colunas segregadas: Coluna 1 (Saldo Banco Itaú) + Coluna 2 (Dinheiro Físico) + Coluna 3 (Cartões a Compensar) = Saldo Consolidado. Isso é muito superior à planilha manual."

---

## 🎯 Rodada 3 — Síntese e Decisão Final

1. **Veredicto:** **[GO] para Correção Imediata da Âncora Temporal do Saldo OFX e Upsert Seguro de Pátio.**
2. **Backfill Emergencial:** Corrigir os registros de 09/09 das 4 lojas zeradas (Rudge Ramos, Santo André, Jabaquara, Kennedy) com os valores reais dos arquivos OFX.
3. **Explicação Cristalina para o Usuário:** Apresentar a tabela comparativa tríplice desmistificando a divergência do Excel e comprovando a matemática oficial do Itaú.
