# 📋 Proposta Técnica — Spec 417: Geração Automática de Recebíveis de OSs (Boletos & Transferências) sem Cliques Manuais

## 1. Contexto & Diagnóstico

O usuário pontuou que:
1. **Zero Cliques Manuais:** Não quer ter que ficar abrindo modal e clicando para gerar recebível de cada OS. O sistema deve verificar automaticamente se o recebível já existe no banco; se não existir, já gera e insere diretamente no banco.
2. **Casamento de Dados (Nome + Valor + Parcelas):** A geração automática deve compor a descrição padronizada contendo o Tipo (`BOLETO` ou `TRANSFERÊNCIA`), Nome do Cliente (extraído da OS), Número da OS e Parcela (ex: `BOLETO MARINHO LOCADORA OS 40369 1/3`).
3. **Idempotência Estrita (Anti-Duplicação):** Se a OS já possui recebíveis lançados na mesma loja (`store_id + os_number`), o sistema preserva os títulos existentes e não gera duplicatas.
4. **Descontaminação de Cartões:** Remover em definitivo o código do `CentralImportWizard.tsx` que convertia vendas de maquininhas/Rede em registros genéricos de `Cartão Crédito` com `OS: null` dentro de `receivables`.

---

## 2. Solução Proposta

### A. Geração Automática Transparente no Processador de OS (`useOsImportProcessor.ts` & `useImportProcessor.ts`)
1. **Composição Canônica de Descrição com Nome do Cliente:**
   Ao processar cada OS faturada em Boleto/Transferência:
   - Extrai o nome do cliente de `row['Cliente']` (ex: `MARINHO LOCADORA DE VEICULOS - LTDA` $\to$ `MARINHO LOCADORA`).
   - Monta a descrição canônica:
     ```typescript
     description = `${tipoUpper} ${cleanClient} OS ${osNumber} ${inst}/${numInstallments}`;
     ```
     Exemplo: `BOLETO MARINHO LOCADORA OS 40369 1/3`.

2. **Idempotência por `store_id + os_number`:**
   No `savePatioOsAndReceivables`, antes de inserir:
   - Consulta se já existem recebíveis para a mesma loja e mesmo `os_number`.
   - Se já existirem (mesmo que com parcelas diferentes como 1/3, 2/3, 3/3 já salvas), **PRESERVA** e não reinsere nada.
   - Se não existirem, insere diretamente os títulos com status `pendente` e vencimento calculado (+30d, etc.).

3. **Leitura Automática da Aba `RECEBIVEIS` no Wizard:**
   - Se o usuário arrastar a planilha de fechamento/conciliação (que contém a aba `RECEBIVEIS`), o `CentralImportWizard` passa o arquivo pelo `parseRecebiveisExcel` e salva os recebíveis já parcelados pelo operador automaticamente.

### B. Descontaminação Total de Cartões
- Expurga as chamadas `maqPromises` e `redePromises` que inseriam `type: 'Cartão Crédito'` com `OS: null` em `receivables`.
- Remove do banco os recebíveis órfãos gerados indevidamente por cartão (`os_number IS NULL AND type ILIKE 'Cartão%'`).

---

## 3. Skills Especializadas Aplicadas
- `database`: Idempotência por chave composta `(store_id, os_number, installment)`, queries atômicas e proteção contra duplicidade.
- `backend-patterns`: Normalização defensiva de nomes de clientes e cálculo determinístico de parcelas e centavos.

---

## 4. Arquivos Afetados

### Arquivos Modificados (ZERO complexidade de UI manual):
- `src/hooks/useOsImportProcessor.ts` (Enriquecer geração automática com Nome do Cliente e formato padronizado)
- `src/hooks/useImportProcessor.ts` (Blindagem de idempotência por `os_number + store_id`)
- `src/components/importacoes/CentralImportWizard.tsx` (Remover criação de cartão em `receivables` e integrar aba `RECEBIVEIS` se presente)
- `specs/417-radar-recebiveis-os-patio-boleto-transferencia/proposal.md`
- `specs/417-radar-recebiveis-os-patio-boleto-transferencia/design.md`
- `specs/417-radar-recebiveis-os-patio-boleto-transferencia/spec-plan.md`

---

## 5. Plano de Rollback
As alterações são restritas à rotina de extração e salvamento de recebíveis. Em caso de necessidade de reversão, basta reverter os 3 arquivos `.ts`/`.tsx` modificados via Git.

---

## 6. Critérios de Aceitação
1. Ingestão de `1845_ConferenciaOSxFinanceiro.xls` detecta automaticamente OS 40369 e grava `BOLETO MARINHO LOCADORA OS 40369` em `receivables` sem requerer nenhum clique manual.
2. Nenhuma venda de maquininha da Rede gera registros em `receivables`.
3. Se a OS já possuir recebíveis cadastrados, nenhuma duplicação ocorre.
4. `npm run build` passa com exit code 0.
