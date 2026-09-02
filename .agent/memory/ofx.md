## [2026-09-01] — [Feature ID: 314-auditoria-saldo-deduplicacao-ofx-rede]

**Contexto:** Correcao da ingestao de extratos OFX multi-dias no CentralImportWizard.tsx e useTransactions.ts.

**Regra aprendida:**
1. **Particao Temporal Estrita:** Extratos bancarios frequentemente contem transacoes de multiplos dias (ex: D-1 e D). Cada transacao OFX inserida na tabela ofx_transactions DEVE receber target_date = DATE(occurred_at) (extraido de <DTPOSTED>), e NUNCA a data global selecionada no wizard.
2. Isso garante que os creditos da Rede de ontem permanecam no dia contabil de ontem e os creditos de hoje no dia de hoje, sem aglutinar 4 depositos em um unico dia.

**Risco identificado / Anti-pattern:** Forcar target_date = targetDate para todas as linhas de um arquivo OFX importado.


# Importação & Conciliação OFX / XLSX

## Regras de Domínio
- **Deduplicação**: Sempre deduplicar FITIDs antes do INSERT usando chave composta (account_id, fitid) ou hash único.
- **Validação**: Verificar formato de datas (dd/MM/yyyy vs yyyy-MM-dd) e valores monetários (ponto vs vírgula).
- **Transações**: Utilizar transações atômicas (BEGIN/COMMIT) para importação em lote para evitar importação parcial.

## [2026-09-01] — [Feature ID: 331-fix-nulls-and-revert-diferenca]
**Contexto:** Correção do sumiço de lançamentos de fim de semana (PIX) no Frontend (CentralImportWizard) e correção do drop silencioso de arquivos da Rede.
**Regra aprendida:**
1. **Agrupamento de Fim de Semana (OFX):** Se um arquivo OFX importado em uma segunda-feira (ex: 01/09) contiver PIXs do fim de semana (31/08), o sistema DEVE gravar `target_date` com a data escolhida pelo usuário no Wizard (`targetDate`), não a data do lançamento. Isso anula a regra da Spec 314 para que o Dashboard exiba os valores compensados no dia contábil correto para o fechamento.
2. **Fallback da Rede (GLOBAL):** Nunca descarte transações iteradas em `results.redeResults` e `maquininhaItems` apenas porque `mapping[t.storeName]` não tem correspondência imediata (`sid`). Utilize `'GLOBAL'` ou `null` como chave para garantir que todos os dados brutos cheguem ao banco em `pos_transactions`.
**Risco identificado / Anti-pattern:** Usar `if (sid)` sem bloco de fallback no loop de iteração de `redeByStore`/`maqByStore`, descartando registros e gerando falso negativo R$ 0,00 na UI.

## [2026-09-02] — [Feature ID: 349] Descarte de Valores Zerados e Deduplicação no Parser de Contas a Pagar
**Contexto:** Correção de falhas no parser de planilhas `BuscaContasAPagar.xls` (`contasPagarParser.ts`).
**Regra aprendida:**
1. **Descarte Estrito de Valores Zerados:** Linhas de títulos cancelados, estornos ou linhas com código de fornecedor mas sem valor pago/a pagar (`amount <= 0`) DEVEM ser ignoradas no loop de parsing: `if (!amount || amount <= 0 || isNaN(amount)) continue;`.
2. **Deduplicação de Títulos:** Múltiplas linhas do mesmo título na mesma data devem ser deduplicadas por chave `external_code + installment + recipient_name + amount + due_date` antes da inserção em `daily_manual_bills`.
**Risco identificado / Anti-pattern:** Criar objetos `ParsedContaAPagar` com `amount: 0`, que acionam a check constraint do banco de dados e abortam lotes inteiros de importação.

