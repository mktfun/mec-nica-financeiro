# Proposal: AutomaçÁo Híbrida de ImportaçÁo e Fix do Agente IA (059-oficina-bot-automation)

## Problema
O Agente de IA sofre timeouts frequentes ao tentar consultar dados externos (Contas a Pagar, OS, Agenda) devido à lentidÁo inerente do scraping (Playwright na VPS leva ~15s por requisiçÁo). Além disso, a importaçÁo de dados para conciliaçÁo ainda é manual (via Excel/CSV).
O usuário quer automatizar a importaçÁo base (OS e Contas a Pagar), mantendo a integridade dos dados e sem sobrecarregar a VPS ou causar bloqueios no "Oficina Inteligente". Há também a restriçÁo temporal crítica: OSs nÁo finalizadas mudam constantemente (peças adicionadas, valores alterados).

## SoluçÁo Proposta
Uma **Arquitetura Híbrida** combinando SincronizaçÁo em Massa (apenas resumos) e Consultas de Detalhe Sob Demanda (com Cache Inteligente).

1. **SincronizaçÁo Diária de Resumos (Automática/BotÁo):**
   - CriaçÁo de uma Edge Function `sync-oficina` que varre a API do bot puxando as "Listas/Relatórios" (visÁo geral das OSs do dia e Contas a Pagar da semana).
   - O bot na VPS nÁo entrará OS por OS. Ele raspará apenas as grids de relatórios para preencher as tabelas `oficina_os_resumo` e `oficina_contas`. Isso substitui a importaçÁo manual de planilhas.
   - *Pré-requisito Crítico DevOps:* O bot na VPS precisa ter a lógica de raspagem atualizada para os novos seletores do DOM do Oficina Inteligente (vencimentos e status estÁo vindo vazios atualmente).

2. **RefatoraçÁo das Tools da IA (`tools-oficina.ts`) - Cache Condicional:**
   - O timeout da IA será ampliado de `5000ms` para `45000ms` (45 segundos) para suportar o tempo do Playwright.
   - **Contas a Pagar:** A IA lerá primariamente a tabela `oficina_contas` sincronizada, garantindo resposta imediata.
   - **Consulta de OS (Detalhes Profundos):** A IA vai buscar o detalhe da OS na tabela de cache local.
     - Se nÁo existir ou o status **NÁO FOR FINALIZADO**, a IA fará a requisiçÁo *live* para o bot (sob demanda).
     - Quando o bot retornar o detalhe completo da OS, a Edge Function fará o UPSERT no cache.
     - Se a OS estiver `FINALIZADO`, ela fica "congelada" no cache. Se for solicitada novamente amanhÁ, retorna do cache em 0.1s.

## Contratos de Dados
- **Tabelas Supabase Envolvidas:** 
  - `oficina_os_cache` (ID, os_number, loja, payload_json completo, status_cache, updated_at).
  - `oficina_contas` (ID, id_interno, loja, fornecedor, valor, vencimento, tipo, status).
- **Mutações:** Upserts baseados em `loja + id_interno` ou `loja + os_number`.

## Risco Principal
**Falha no Robô (VPS):** Como a estrutura de cache condicional depende do status da OS, se o robô raspar o status vazio (como está ocorrendo agora), o cache nÁo conseguirá "congelar" a OS corretamente, resultando em requisições lentas constantes. O conserto do bot na VPS é absolutamente imperativo.
