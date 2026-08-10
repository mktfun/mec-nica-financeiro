# Proposal: Painel Detalhado de Fontes de Dados (149-conciliation-details)

## Problema
Atualmente, na tela de conciliação por loja (`/conciliacao/$lojaId`), o usuário tem acesso às tabelas de pareamento cruzado (Cartão, Maquininha, PIX), mas não tem uma forma simples de inspecionar os **dados brutos que vieram nos 3 arquivos de importação** (OS do Pátio, Rede/Maquininha, Extrato OFX) isoladamente. Isso dificulta a auditoria rápida quando as contas não batem, pois o usuário precisa saber exatamente o que o sistema leu de cada arquivo individualmente, com detalhes específicos como status das OSs, taxas aplicadas na rede e o limite/saldo da conta OFX. 
Além disso, fazer queries extensas e complexas no frontend polui o código e quebra o encapsulamento de banco de dados.

## Solução Proposta
Criar uma interface de "Inspeção de Lotes" baseada em badges interativas e modais (Dialogs) detalhados, alimentados 100% por **RPCs (Remote Procedure Calls)** dedicadas no PostgreSQL, garantindo que toda a inteligência e junção de dados fique no backend.
1. **Badges Minimalistas:** Serão adicionados logo abaixo do cabeçalho "Data alvo: DD/MM/AAAA" três badges (pílulas visuais) representando os arquivos: **Excel OS** (Verde), **Rede/Maquininha** (Laranja/Amarelo) e **OFX** (Azul).
2. **Modais de Detalhamento:** Ao clicar em um badge, um Modal se sobreporá à tela.
3. **Novas RPCs:** Três funções isoladas para devolver os arrays prontos e formatados pro front.

## Contratos de Dados
O frontend não fará queries diretas. Novas RPCs retornarão o JSON cravado:
- **`get_raw_os_data(p_store_id uuid, p_date date)`:** Retorna a lista de OSs importadas na data. (os_number, opened_at, status, closed_at, total_value, paid_value, restante, payment_method).
- **`get_raw_rede_data(p_store_id uuid, p_date date)`:** Retorna a lista de transações da maquininha, já com a taxa % calculada no backend. (id, gross_amount, net_amount, fee_amount, fee_percentage, matched_os_number).
- **`get_raw_ofx_data(p_store_id uuid, p_date date)`:** Retorna a lista de extratos bancários, além de uma linha (ou wrapper) trazendo o `account_limit` da loja e o `previous_balance` do último fechamento bancário.

## API / Interface
- Backend: Criação da migration `20260810165000_raw_data_rpcs.sql`.
- Frontend: Criação do componente isolado `ImportSourceBadges` e componentes de tabela crua (`RawOsTable`, `RawRedeTable`, `RawOfxTable`).
- Criação do hook `useRawImportData.ts` apontando EXCLUSIVAMENTE para as RPCs.

## Features Existentes Impactadas
- Tela de `ConciliacaoLojaPage` (`src/routes/conciliacao.$lojaId.tsx`) receberá a injeção do componente de Badges.
- Nenhuma lógica de conciliação será alterada (uso em Read-Only mode).

## Risco Principal
- **Probabilidade:** Baixa
- **Impacto:** Parcialmente Reversível
- **Mitigação:** RPCs serão testadas para garantir que não tragam dados de outros dias. Lazy-loading no React garante que o Supabase só seja acionado mediante clique no modal.
