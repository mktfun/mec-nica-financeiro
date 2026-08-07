# Proposal: Resiliência Anti-Hang, Consulta Local Inteligente Primeiro e Prova E2E (fix-ai-timeout-and-local-first)

## Problema Identificado com Evidência Empírica
1. **IA Congelava/Morria após dizer "Um instante":**
   - **Causa Raiz Comprovada:** Ao consultar a OS `22551`, o `consulta_resumo_os` local falhou em encontrar a OS porque tentou filtrar por `store_id = 'mhe_maua'` exato enquanto a OS no banco local possui `store_name = 'ReiDoOleoMaua'` (`store_id = '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f'`).
   - Ao nÁo encontrar no local, a IA tentou chamar a ferramenta externa `consulta_os_detalhe_completo` para o servidor `bot.tork.services`. O servidor externo **sofreu timeout indeterminado**, travando a requisiçÁo HTTP da Edge Function Deno e fazendo a resposta da IA "morrer" sem responder nada ao usuário.
2. **Falta de Fallback Rápido de Timeout:**
   - As ferramentas externas em `tools-oficina.ts` executavam `fetch()` sem limite de tempo (`AbortSignal.timeout`), permitindo que falhas externas travassem todo o chat.
3. **Necessidade de Prova E2E e RenderizaçÁo do Passo a Passo:**
   - O usuário necessita da comprovaçÁo da resposta completa da IA na tela (com OS `22551`, valor R$ 520,00, status Aberta) e do passo a passo das ferramentas.

## SoluçÁo Proposta
1. **Ferramenta Local Inteligente (`tools-local.ts`):**
   - Refatorar `consulta_resumo_os`: Se `osNumber` for fornecido, buscar primeiramente por `os_number = osNumber` de forma direta. Se houver filtro de loja, verificar correspondência por `store_id` OU `store_name` (usando `ilike`). Isso garante retorno instantâneo (< 50ms) dos dados locais da OS `22551`.
2. **ProteçÁo Rigorosa de Timeout nas Ferramentas Externas (`tools-oficina.ts`):**
   - Adicionar `signal: AbortSignal.timeout(5000)` (timeout estrito de 5 segundos) em todos os `fetch()` de ferramentas externas.
   - Em caso de timeout/erro, capturar o erro e retornar `{ aviso: "API externa da oficina oscilou/timed out. Apresentando dados locais obtidos com sucesso." }`, impedindo que a IA trave.
3. **InstruçÁo de Autonomia e Prioridade Local no System Prompt (`ai-chat/index.ts`):**
   - Reforçar que a IA DEVE prioritariamente usar o banco local e entregar os dados imediatamente se encontrados, sem depender de APIs externas caso o local já satisfaça a consulta.
4. **Deploy e ValidaçÁo E2E com Prova Visual:**
   - Deploy da Edge Function `ai-chat`.
   - Executar teste Playwright E2E em `http://localhost:8080/agente` enviando a pergunta da OS `22551`, capturando a resposta final formatada da IA e provando o funcionamento 100%.

## Contratos de Dados
- Tabela `patio_os`: `os_number: '22551'`, `total_value: 520`, `store_name: 'ReiDoOleoMaua'`, `status: 'em_aberto'`.

## Risco Principal
Garantir que a resposta da IA flua do início ao fim sem travamentos mesmo se qualquer serviço externo falhar.
