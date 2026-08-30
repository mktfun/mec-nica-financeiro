# Proposal: Motor de Auto-Match em Memória & Fluxo de 8 Passos Lineares Nativos (312)

## Problema

Nas tentativas anteriores (Specs 310 e 311), foram identificados três problemas críticos de arquitetura e usabilidade reportados pelo operador:

1. **Falsos Positivos Massivos de Órfãos (Falha do Matcher):**
   - Os arquivos de vendas da Rede e os extratos bancários OFX são carregados crus em memória, sem número de OS preenchido pela adquirente/banco.
   - Como não havia um motor de *auto-matching* prévio em memória cruzando os dados antes de exibir a tela de pendências, **100% das transações da Rede e PIX eram classificadas como órfãs**, gerando dezenas de pendências falsas na tela de conciliação.

2. **Modal de Vínculo de OS Vazio ("Nenhuma OS em aberto nesta filial"):**
   - Ao tentar vincular manualmente uma transação à OS, o modal consultava unicamente a tabela patio_os no Supabase com filtros restritivos.
   - Como o usuário acabou de subir os arquivos no Step 1 do Wizard, as OSs do dia estão **em memória no lote (esults.osFiles)**, e a tabela patio_os estava vazia (0 registros). O modal ignorava o lote em memória, tornando impossível vincular qualquer transação.

3. **Quebra da Navegação de Steps (Scroll Sprawl / Extensão para Baixo):**
   - As telas do Wizard pós-ingestão foram renderizadas **dentro e abaixo** do Preview do Step 3, criando uma página esticada e confusa em vez de transitar de tela sequencialmente como o restante do app.
   - O usuário exige que cada etapa substitua 100% da tela, seguindo os mesmos padrões de badges, cards e tabelas do sistema (step 1 ao step 8).

---

## Solução Proposta

### 1. Máquina de Estados Linear Nativa (Step 1 ao Step 8 no CentralImportWizard)
Eliminar qualquer renderização aninhada ou componentes duplicados. Cada passo ocupa a tela inteira com o mesmo badge, cabeçalho e botões de Voltar e Avançar:

* **Step 1:** Upload de Arquivos (OFX, OS Excel, Rede, Contas a Pagar).
* **Step 2:** Mapeamento de Filiais (Alias -> Store ID).
* **Step 3:** Preview & Conferência Geral (MissingPatioOsEditor, DiagnosticPanel e Inputs Manuais Globais com Trava).
* **Step 4 (Tela A):** Vínculo de Pagamentos sem Lançamento na OS (apenas as sobras REAIS pós-matcher + modal de fonte dupla).
* **Step 5 (Tela B):** Justificativas de Não-Faturamento por Loja (Transferências entre lojas, Aportes, Estornos, Tarifas).
* **Step 6 (Tela C):** Conferência de Cofre do Daniel (Radio SIM/NÃO + Baixa em lote de store_cash_vault).
* **Step 7 (Tela D):** Auditoria Final dos 5 Pilares & Gravação (Semáforo $\pm\text{R\$}~50$, Copiloto Gemini 3.5 Flash Lite e Gravação no Banco).
* **Step 8:** Sucesso & Resumo Executivo (KPIs do lote, relatório de Auto-Healing e atalho para a conciliação diária).

### 2. Motor de Auto-Match em Memória (executeAutoMatchingEngine)
Disparado imediatamente na saída do Step 3 ao clicar em *"Avançar para Conciliação"*:
* **Cartões (Rede x OS):** Cruza vendas da Rede com recebimentos de cartão (parsed_credit, parsed_debit, payment_method) das OSs da mesma loja em esults.osFiles com tolerância de $\pm\text{R\$}~0,10$.
* **PIX (OFX x OS):** Cruza créditos PIX do extrato com pagamentos em PIX (parsed_pix_transfer, payment_method) das OSs da mesma filial por valor e nome do cliente.
* **Isolamento de Sobras Reais:** Apenas as transações que **não** tiveram match automático seguem para o Step 4.

### 3. Modal de Vínculo de OS com Fonte Dupla (Lote em Memória + Banco de Dados)
O modal de busca e vínculo unifica:
1. Todas as OSs de esults.osFiles daquela filial no lote atual (com saldo em aberto);
2. Todas as OSs ativas do banco patio_os no Supabase.
Deduplica por os_number e permite busca instantânea por placa, cliente ou número da OS, aplicando o vínculo de 1 clique com herança automática de valor e forma de pagamento.

---

## Contratos de Dados

### Tabelas Envolvidas
- patio_os: Atualização de paid_value, payment_method, status.
- conciliation_matches: Registro de vínculos automáticos e manuais (match_type: 'AUTO_REDE', 'AUTO_PIX', 'MANUAL_1CLICK').
- daily_manual_bills: Justificativas contábeis de não-faturamento.
- store_cash_vault: Atualização de status para 'depositado'.
- daily_snapshots / 	ransactions: Gravação consolidada do dia.

---

## Risco Principal e Mitigação

* **Risco:** Falso casamento de transações de valores comuns (ex: R$ 50,00) em filiais diferentes.
* **Mitigação:** Cláusula de guarda obrigatória: 	x.storeId === os.storeId e compatibilidade estrita de método (Cartão com Cartão, PIX com PIX).
