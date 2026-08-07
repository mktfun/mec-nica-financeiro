# Proposta: Conciliação de Pendentes (Cartão/PIX) e Normalização do Saldo

O usuário solicitou que as transações de Maquininha e PIX vindas das Ordens de Serviço (OS) que ainda **não entraram no banco** (OFX) fiquem marcadas como 'pendentes para entrar', mas que seus valores **já contabilizem no Saldo global** do sistema. Quando o OFX finalmente entrar (D+1, D+2), ele deve abater esse saldo pendente e virar dinheiro no banco (sem duplicar o valor no fluxo).

## O Problema Atual
1. **Regime de Competência vs Caixa:** Hoje, o painel central Valor Disp. Contas soma o Saldo Bancário (OFX) + Pátio OS (A Receber). Porém, ele **ignora** o dinheiro que o cliente já pagou na Maquininha/PIX mas que o banco ainda não compensou.
2. **Dashboard Diário Errado:** A RPC calculate_daily_conciliation tenta buscar 'Maquininha' a partir de transações source = 'rede', mas como o usuário só importa OFX e OS, esse valor fica sempre zerado. 
3. **Duplicação de Saldo:** Se somarmos as entradas de OFX e as entradas de OS de forma crua, o dia em que a maquininha compensa no banco dobrará o faturamento.

## A Solução (The 'Pending Float' Pattern)
O sistema já possui a mecânica de pareamento (matched_ofx_id). Quando a OS é lida, ela não tem match. Quando o OFX chega, ele faz o match.
Podemos usar isso para criar a métrica **'Pendentes de Compensação'**:

### 1. Atualização no Saldo Global (get_dashboard_metrics)
- Buscar a soma de todas as OSs que possuem pagamentos de cartão/pix mas que ainda não caíram no banco (matched_ofx_id IS NULL).
- Adicionar esse montante (Float) diretamente à variável _a_receber.
- **Efeito Mágico:** O Valor Disp. Contas do cliente mostrará a realidade! Se ele passou 10k na máquina hoje, o Saldo Geral sobe 10k. Quando o OFX cair amanhã, o uto_match vai preencher o matched_ofx_id, removendo os 10k do 'A Receber' e movendo para o 'Saldo Bancário' automaticamente.

### 2. Atualização no Resumo Diário (calculate_daily_conciliation)
- **Faturamento Banco:** Mantém como soma das entradas de OFX do dia.
- **Maquininha (Esperada):** Soma de credit_value + debit_value das OSs com updated_at::date = p_date.
- **PIX (Esperado):** Soma de pix_transfer_value das OSs com updated_at::date = p_date.
- **Previsto:** Será a soma do Faturamento da Loja que se *espera* que entre no banco originado naquele dia = Maquininha + PIX.
- **Diferença:** O usuário entenderá que a diferença diária flutua (pois o banco recebe hoje o que foi passado ontem), mas o saldo global estará perfeitamente travado e não haverá duplicações.

## Perguntas em Aberto
Nenhuma. A estrutura do banco de dados (tabela patio_os e 	ransactions com seus links de match) já suporta 100% dessa funcionalidade de ponta a ponta. Precisamos apenas reescrever as duas funções RPC no banco para ler o patio_os em vez da fonte fantasma 'rede'.
