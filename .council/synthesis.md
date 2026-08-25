# Council Debate — Final Synthesis (Round 3)

## 1. The Consensus Map (Consensos Unânimes)
- **Extração Automática de Boletos e Transferências:** Todas as OSs importadas de relatórios ERP cujas formas de pagamento indiquem faturamento a prazo (Boleto, Bol 2x, Bol 30/60, Transferência Bancária, TED/DOC, Débito em Conta) devem gerar registros estruturados e idempotentes na tabela `public.receivables`.
- **Isolamento Contábil contra Dupla Contagem:** OSs que geram títulos em `receivables` não devem acumular simultaneamente no passivo físico do pátio (`patio_os` / Pilar 4 Na Loja OS). O valor migra determinística e exclusivamente para o **Pilar 3 (A Receber)**, garantindo que o Caixa Atual reflita a realidade patrimonial sem distorções.
- **Idempotência de Ingestão:** A restrição `UNIQUE (store_id, os_number, installment)` com política de preservação de títulos com `status = 'recebido'` blinda o sistema contra duplicações em re-importações de arquivos no mesmo dia.
- **Calendário Bancário e Regras de Compensação:** O cálculo de vencimento para boletos (D+30, D+60) e transferências (D+1 útil) deve ajustar as datas de vencimento que caem em finais de semana ou feriados bancários para o próximo dia útil subsequente.
- **Arquitetura 100% Backend (Supabase RPCs):** Toda a agregação, cálculo de prazos e operações de baixa/vínculo devem residir em funções SQL/RPC no PostgreSQL, sem lógica matemática dispersa no frontend.

## 2. The Hard Disagreements & Mitigações
- **Match 100% Cego vs Falsos Positivos:** O Contrarian alertou para o perigo de descritivos bancários genéricos (ex: `LIQ COBRANCA`). 
  - **Mitigação Consensuada:** Adoção do modelo de 3 camadas:
    1. **Camada 1 (Automática Alta Certeza):** Match automático quando houver coincidência de Valor + Loja + Data + OS/Identificador no memo do OFX.
    2. **Camada 2 (Sugestão Inteligente 1-Click):** Para descritivos genéricos com mesmo valor e data próxima, o sistema sugere a baixa com um botão de confirmação ágil na tela de Recebíveis.
    3. **Camada 3 (Vínculo Manual / Intercompany):** Modal de pesquisa para conciliação de transferências atípicas entre filiais.

## 3. The Pivot (O que foi aprimorado pelo debate)
A ideia inicial de fazer apenas "match automático" foi refinada para um **mecanismo completo de ciclo de vida de recebíveis**:
- Classificação inteligente de formas de pagamento na importação de OS.
- Cálculo de parcelas e datas de vencimento com calendário de dias úteis bancários.
- Baixa automática no extrato OFX com tolerância de tarifas de cobrança bancária.
- Sincronização em tempo real com os 5 Pilares da conciliação diária.

## 4. Final Verdict
# [GO] — Aprovado para Especificação e Implementação
A proposta está madura, matematicamente blindada contra dupla contagem contábil, idempotente e alinhada à arquitetura canônica do projeto.
