# Proposal — Spec 368: Correção do Parser OFX SGML (Itaú sem fechamento) e Mapeamento Automático Persistente das 10 Contas

## 1. Contexto e Problemas Diagnosticados
Ao arrastar os 10 extratos bancários do Itaú (`Extrato_{agencia}_{conta}_{data}.ofx`) na Central de Importação, dois problemas críticos ocorreram:

### Problema 1: Parser OFX retornando 0 transações
O extrato bancário oficial do Itaú Empresas é gerado no padrão OFX 1.0 (SGML), onde blocos `<STMTTRN>` **não possuem tags de fechamento** `</STMTTRN>`.
A regex atual no `ofxParser.ts`:
```typescript
const stmtTrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g;
```
exigia a tag `</STMTTRN>`. Como o arquivo do Itaú não a possui, a regex capturava **0 transações** em todos os 10 extratos, gerando totalizadores zerados (`+R$ 0,00` e `-R$ 0,00`) e saldo anterior indefinido (`-`).

### Problema 2: Mapeamento de contas quebrado e não persistido no banco
1. Os nomes dos arquivos seguem o padrão `Extrato_{agencia}_{conta}_{data}.ofx`:
   - `0263_811531` -> Agência 0263, Conta 81153-1 (Rudge Ramos - CAP)
   - `2783_070820` -> Agência 2783, Conta 07082-0 (Mauá - MHE)
   - `3385_988047` -> Agência 3385, Conta 98804-7 (Jorge Beretta - DHJV)
   - `7386_162601` -> Agência 7386, Conta 16260-1 (Piraporinha - EMPORIO)
   - `7386_166586` -> Agência 7386, Conta 16658-6 (Planalto - BRASICAR)
   - `7386_175298` -> Agência 7386, Conta 17529-8 (Kennedy - MP)
   - `8813_984112` -> Agência 8813, Conta 98411-2 (Jabaquara - JAB)
   - `8813_984633` -> Agência 8813, Conta 98463-3 (Dom Pedro - DP)
   - `8813_992677` -> Agência 8813, Conta 99267-7 (Rei do Módulo - MP)
   - `8813_994293` -> Agência 8813, Conta 99429-3 (Santo André - HD)
2. No `useStoreFileMappings.ts` e no `resolveStoreForOfx`, o lookup buscava `\d{8,12}` contínuo (sem underscore), falhando quando o arquivo continha underscore (`0263_811531`).
3. Além disso, a tabela `store_file_mappings` no Supabase não continha os mapeamentos das contas bancárias (apenas nomes de OSs como `BRASICAR MP`), forçando o operador a adivinhar a correspondência.

---

## 2. Solução Proposta

### 2.1 Suporte Universal a OFX SGML (Com e Sem Tag de Fechamento) em `ofxParser.ts`
- Modificar o extrator de transações para suportar ambos os formatos:
  - Formato com tag de fechamento: `/<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi`
  - Formato SGML padrão sem tag de fechamento: split inteligente por `<STMTTRN>` delimitado pelo início da próxima transação ou pelo fim do `<BANKTRANLIST>`.
- Garantir decodificação resiliente com `TextDecoder('windows-1252')` / `TextDecoder('latin1')` para extratos Itaú.
- Extrair agência e conta tanto das tags (`<BANKID>`, `<ACCTID>`) quanto do nome do arquivo (`Extrato_(\d{4})_(\d{5,8})`), garantindo chave canônica `{agencia}{conta}` (ex: `0263811531`).

### 2.2 Resolução Automática e Persistência Definitiva das 10 Contas
- Atualizar `KNOWN_ACCOUNT_DEFAULTS` em `useStoreFileMappings.ts` e `resolveStoreForOfx` em `CentralImportWizard.tsx` para reconhecer todas as permutações:
  - `{agencia}{conta}` (ex: `0263811531`)
  - `{agencia}_{conta}` (ex: `0263_811531`)
  - `{conta}` isolada (ex: `811531`, `070820`)
  - `Extrato_{agencia}_{conta}`
  - `ITAU - {agencia}{conta}`
- Criar migration SQL `supabase/migrations/20260903000031_seed_ofx_store_file_mappings.sql` inserindo todos os aliases oficiais das 10 filiais diretamente na tabela `store_file_mappings` do PostgreSQL, blindando a persistência no banco.

### 2.3 UX Clara na Tela de Mapeamento do `CentralImportWizard`
- No Step 2, exibir para cada conta o nome humanizado:
  - Ex: **Itaú Ag. 0263 Conta 81153-1 — Rudge Ramos (CAP)**
- As 10 contas aparecerão **100% pré-selecionadas e vinculadas**, eliminando a necessidade de seleção manual pelo operador.

---

## 3. Critérios de Aceite
- [ ] O parser OFX extrai 100% das transações e saldos dos arquivos do Itaú sem fechar `</STMTTRN>`.
- [ ] Todas as 10 contas de extrato são reconhecidas e pré-selecionadas automaticamente no dropdown.
- [ ] Todos os mapeamentos de conta bancária ficam salvos no Supabase (`store_file_mappings`).
- [ ] A tabela de auditoria de saldos exibe saldo anterior, total de entradas, total de saídas e saldo final.
- [ ] `bun run build` passa com código 0.
