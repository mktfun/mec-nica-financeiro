# Proposal: Refinamento de Precisão do Auto-Match (PIX x TED x Boletos), Modal Amplo e Filtro Estrito da Tela B (313)

## Problema

1. **Falhas no Auto-Matcher e Diferenciação de Instrumentos Financeiros:**
   - No extrato bancário OFX, as entradas trazem no histórico o nome ou CNPJ do pagador (ex: ENTRADA PIX QRS JOSE DE ARI..., ENTRADA PIX TRANSF FABIANO..., ENTRADA PIX TRANSF 24.318.878...).
   - Nas Ordens de Serviço (OS) do ERP da mesma filial, constam exatamente os mesmos clientes (JOSE DE ARI..., FABIANO..., CNPJ da empresa) e os mesmos valores (R$ 1.052,00, R$ 1.344,04, R$ 3.962,75).
   - **Distinção Crítica de Meios de Pagamento:**
     - **PIX (Instantâneo D+0):** Liquidação imediata no ato do serviço. Deve casar com o pagamento em PIX da OS.
     - **Transferência Bancária / TED / DOC (D+1 ou a prazo):** Tem prazo de compensação e gera recebível com data prevista.
     - **Boleto Bancário (A Receber a Prazo Parcelado):** Título de cobrança futuro com due_date (ex: 30/60/90 dias), número de parcelas (1/N, 2/N, 3/N) e status pendente. **Boletos futuros não devem ser confundidos com PIX do dia**, pois compõem o pilar de *A Receber*.
   - Vendas da Rede com método 'Outros' ou divergências de bruto vs líquido (R$ 948,60 e R$ 1.133,80 em Rudge Ramos - CAP) também falhavam.

2. **Modal de Vínculo de OS Espremido (media_1787863118011.png):**
   - O modal abria no tamanho default max-w-md (448px), comprimindo as placas, modelos e truncando o botão de vínculo contra a barra de rolagem.

3. **Vazamento de Liquidações de Adquirentes e Rendimentos na Tela B:**
   - Entradas bancárias como RECEBIMENTO REDE REDE VISA..., RECEBIMENTO REDE REDE MAST... e REND PAGO APLIC AUT APR vazavam para a Tela B de justificativas contábeis.

---

## Solução Proposta (Reuso e Extensão Cirúrgica)

### 1. [MODIFY] src/lib/matchers/autoMatchingEngine.ts
Implementar motor de auto-matching refinado com separação estrita de instrumentos:
* **Casamento Semântico de Contraparte (Nome e CNPJ):** Extrai nomes e CNPJs de ENTRADA PIX QRS <NOME>, ENTRADA PIX TRANSF <NOME> e cruza com client_name da OS da mesma filial.
* **Tier 1 (PIX Instantâneo D+0):** Cruza créditos PIX com OSs onde o cliente pagou em PIX (parsed_pix_transfer ou match de Nome + Valor $\le \text{R\$}~0,05$).
* **Tier 2 (Rede Líquido/Bruto + Recebíveis de Cartão):** Cruza vendas da Rede (mesmo com method 'Outros') com parsed_credit, parsed_debit, eceivablesArray (Cartão) e 	otal_value da mesma filial ($\le \text{R\$}~0,05$).
* **Tier 3 (Transferência Bancária x Recebíveis de Transferência):** Cruza TEDs/DOCs compensados com recebíveis de transferência bancária, respeitando prazos.
* **Tier 4 (Blindagem de Boletos):** Boletos parcelados com vencimento futuro permanecem em eceivables (A Receber) e são preservados sem colisão com entradas à vista.
* **Tier 5 (Unicidade Estrita na Filial):** Se houver uma única OS na filial com aquele valor exato disponível, confirma o match sem risco de colisão.

### 2. [MODIFY] src/components/importacoes/wizard/Step1UnregisteredPayments.tsx
* Configurar <Modal size="xl"> (**896px / max-w-4xl**).
* Card de contexto superior em 3 colunas.
* **Placa em Badge Automotivo** (g-zinc-900 border-zinc-700 text-zinc-100 font-mono font-bold text-xs flex items-center gap-1.5).
* Nome do cliente sem corte prematuro e botão de vínculo blindado (min-w-[155px], whitespace-nowrap).

### 3. [MODIFY] src/components/importacoes/wizard/Step2NonRevenueJustifications.tsx
* Aplicar EXCLUDE_ACQUIRER_REGEX e EXCLUDE_BANK_EARNINGS_REGEX bloqueando 100% de liquidações da Rede, Cielo e rendimentos bancários automáticos.
* Exibir exclusivamente transferências entre filiais (ex: DHJV SERVICOS), aportes e tarifas avulsas.
* Corrigir persistência no Supabase para a coluna canônica description da tabela daily_manual_bills.

---

## Risco Principal e Mitigação

* **Risco:** Casamento indevido de PIX à vista com parcelas de boleto futuro.
* **Mitigação:** Isolamento tipado de recebíveis: boletos com due_date > targetDate e tipo 'Boleto' são mantidos no estoque de A Receber e não são consumidos por PIX do dia.
