# Proposal: 112-fix-backend-performance-and-ai (112)

## Problema
A tela de conciliação diária está sofrendo de lentidão extrema ("demora pra porra") e os dados estão chegando vazios ou distorcidos, exibindo somatórios bizarros como 	otal_paid_all: -12441.94. Além disso, o Console está estourando com logs de "Erro na API do Google Gemini (400)" exibindo um array enorme de dados.

A causa raiz desse problema está dividida em duas frentes:
1. **O Peso Inútil da IA**: O hook useBackgroundAiReconciler.ts está rodando em background para tentar parear OSs, enviando requisições gigantescas para o Google Gemini. Mas nós **já possuímos uma RPC determinística (uto_match_transactions)** construída puramente em PostgreSQL que faz o pareamento matematicamente! A Inteligência Artificial tornou-se obsoleta, cara, e está causando os erros 400 que travam o sistema.
2. **Falta de Date Filter no Backend**: As RPCs calculate_daily_conciliation e get_dashboard_metrics estão somando as colunas de PIX e verificando Na Loja OS em **toda a tabela patio_os**, ignorando a data (p_date). Isso causa um Table Scan massivo que paralisa a requisição, além de trazer uma soma que reflete a história inteira da loja, não o dia.
3. **Filtro Estrito em Maquininha**: A importação de extratos está gravando as entradas de cartão com source: 'maquininha' e source: 'rede'. No entanto, a RPC que calcula a maquininha está restrita unicamente a source = 'rede', ignorando transações.

## Solução Proposta
Abolir o uso de Inteligência Artificial para conciliação. Vamos confiar unicamente no código determinístico do backend (SQL). Além disso, consertaremos os limitadores de tempo e fonte nas métricas matemáticas.

## Contratos de Dados
- Nenhuma nova tabela ou coluna será criada. As queries existentes serão otimizadas e limitadas à data selecionada.

## API / Interface
- **Remoção da IA**:
  - Remover a invocação de useBackgroundAiReconciler do arquivo src/routes/conciliacao.index.tsx.
  - Como o usuário agora clica no botão "Parear Transações" (que chama a RPC SQL uto_match_transactions), a AI não é mais necessária rodando em background.
- **Supabase RPC (calculate_daily_conciliation) e (get_dashboard_metrics)**:
  - PIX vai filtrar explicitamente WHERE store_id = store_record.id AND (closed_at::date = p_date OR opened_at::date = p_date) para buscar apenas OS finalizadas/parciais no dia.
  - Maquininha vai mudar de source = 'rede' para source IN ('rede', 'maquininha').

## Features Existentes Impactadas
- **Dashboard Global (Visão Diária)**: Ficará instantâneo.
- **Conciliação (Resumo do Dia)**: Ficará instantâneo.
- **Reconciliador**: Passa a ser 100% determinístico baseado no botão "Parear Transações" (código SQL inviolável), matando as alucinações e os custos com IA.

## Risco Principal
- O maior risco é omitirmos dados de PIX retroativo caso a data seja baseada estritamente em closed_at. Por isso, usaremos opened_at::date = p_date OR closed_at::date = p_date.
