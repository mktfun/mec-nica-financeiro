# Original User Request

## Initial Request — 2026-07-24T19:45:38Z

O objetivo deste projeto é realizar um teste de estresse de ponta a ponta gerando e importando dados fictícios em massa para todas as lojas, validando o motor de conciliação silenciosa com IA, verificando a geração de telemetria em `/agente` e executando a limpeza dos dados de teste no final.

Working directory: c:\Users\admin\.gemini\antigravity\scratch\mec-nica-financeiro
Integrity mode: development

## Requirements

### R1. Geração e Inserção de Dados Fictícios de Teste
Gerar massa de dados fictícios completa para todas as lojas registradas (Ordens de Serviço patio_os, lançamentos de Maquininha transactions source=rede, e extratos bancários transactions source=ofx) simulando movimentação financeira realista com pares exatos, pares parciais e exceções.

### R2. Teste e Validação do Motor de Conciliação e IA
Executar o cálculo de conciliação e validar se o motor de IA (useBackgroundAiReconciler / generateTripleMatchSuggestions) é acionado silenciosamente em background, gerando os registros de telemetria em ai_execution_logs com contagem de tokens, custo em USD/BRL e logs de raciocínio.

### R3. Limpeza Automática dos Dados de Teste
Após a verificação e emissão do relatório de auditoria, purgar 100% dos dados fictícios gerados no banco de dados (conciliation_matches, transactions, patio_os, reconciliations, import_logs, import_batches), retornando a base ao estado limpo original.

## Acceptance Criteria

### Teste de Importação e Conciliação Silenciosa com IA
- Inserção bem-sucedida de registros de teste para todas as lojas sem falhas de integridade ou chave estrangeira.
- Confirmação de que o motor de IA executou em background e gerou registros de telemetria em ai_execution_logs.
- Validação de que matches com nota >= 90% foram gravados em conciliation_matches.
- Limpeza total dos dados fictícios ao final do procedimento de teste.

## Follow-up — 2026-07-27T11:18:42Z

Olá! Por favor, retorne o status atual e o relatório do teste de estresse com dados fictícios para todas as lojas, incluindo a verificação dos logs de telemetria da IA e a limpeza final dos dados.

## Follow-up — 2026-07-27T11:19:19Z

Excelente! Por favor, prossiga com a conclusão da validação da telemetria de IA (R2) e em seguida execute a limpeza total dos dados de teste (R3), emitindo o relatório final.

## Follow-up — 2026-07-27T11:21:02Z

Perfeito! Aguardo a confirmação da conclusão da Milestone 3 (limpeza total) e a emissão do relatório final de auditoria.

## Follow-up — 2026-07-31T08:45:17Z

O projeto consiste na implementação da **Central de Agentes IAS**, um hub de orquestração integrando Graphify (motor de contexto em grafo) e Claritas (registro de políticas/prompts), incluindo sistemas de RAG automatizado, memória de longo prazo e ciclos de reflexão, além da correção de layout do menu lateral do Agente IA. O trabalho será dividido em duas fases estruturais.

Working directory: `c:/Users/admin/.gemini/antigravity/scratch/financeiro`
Integrity mode: development

## Requirements

### Parte 1: UI Fix & Hub de Orquestração Base
**R1. Ajuste de Layout do Sidebar (Agente IA):** Mover o título "Oficina GPT" para o topo do menu lateral (acima de "Nova Conversa"), remover do header principal, e fixar os botões de "Configurações" e "Logs do Sistema" no final do menu lateral.
**R2. Hub Central IAS (Integração Graphify + Claritas):** Criar os conectores base do hub onde os bots (AntiGravity, Oficina GPT) consumirão o Graphify como "context engine" (código, dados, playbooks) e o Claritas como "policy/prompt registry".

### Parte 2: Arquitetura Cognitiva (Memória, RAG e Reflexão)
**R3. Memória Dual:** Implementar a separação entre memória transacional (sessões, conversas) e memória estrutural (rules, prompts, configs de Claritas), ambas indexáveis via Graphify.
**R4. RAG Automatizado e Auditável:** O pipeline de RAG deve consultar caminhos no grafo e passar por filtros definidos pelos prompts do Claritas antes de devolver contextos para pipelines críticos (finanças, vendas, etc).
**R5. Camada de Reflexão (Critical Thinking):** Registrar feedbacks de respostas (success vs. dead-ends) usando "Graphify reflect", aplicando heurísticas de verificação derivadas do Claritas nas saídas dos LLMs.
**R6. Testes Controlados na Edge Function:** Fazer chamadas controladas para testar a implementação da IA e o bot da oficina. Exemplo de chamada: "quais os detalhes da OS 22549 no rei do oleo".

## Acceptance Criteria

### UI & Hub (Parte 1)
- [ ] O componente `agente.tsx` renderiza o título "Oficina GPT" no sidebar e mantém os botões "Configurações/Logs" ancorados no final (mt-auto) sem sobreposição pelo scroll do histórico.
- [ ] Módulos conectores para `Graphify` e `Claritas` instanciados no código, expostos para injeção de dependência nos bots existentes.

### Cognição & RAG (Parte 2)
- [ ] Inserção de uma nova sessão salva corretamente a estrutura em banco separando o contexto transacional do estrutural.
- [ ] Pipeline RAG retorna não apenas a resposta, mas o "caminho do grafo" percorrido para justificar as fontes da informação.
- [ ] Respostas do LLM passam por uma função de validação/reflexão que intercepta e aplica as políticas do Claritas (verificável via logs do pipeline).
- [ ] O teste via edge function consegue receber e interpretar um comando real ("detalhes da OS 22549...") respondendo via RAG/Graphify.
