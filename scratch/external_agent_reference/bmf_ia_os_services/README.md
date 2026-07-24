# BMF IA OS — Serviços (Release 1, Ambiente Local)

Implementação real dos seis serviços especificados em EA-DOC-001/002/003,
C4-DOC-001/002 e LOCAL-AGENT-DOC-001: `orquestrador`, `agent-runtime`,
`integration-hub`, `workflow-engine`, `scheduler` e `knowledge-base`.

## O que já está validado

Além do que já constava na versão anterior deste README (Homologation
Gate, Tool Broker, pipeline do Orquestrador, Escalation Handler), esta
versão adiciona:

- **Workflow Engine**: um workflow de 4 etapas (conector → conector →
  espera → agente) foi executado de ponta a ponta. A instância ficou
  genuinamente **persistida em estado "aguardando"** — inclusive
  sobrevivendo a um reinício completo dos três serviços — até um
  evento `ClientApproved` ser publicado no Event Bus, momento em que o
  motor retomou e concluiu sozinho, sem nenhuma chamada direta.
- **Event Bus formalizado**: Redis Streams com consumer group
  (`workflow-engine`), entrega at-least-once, testado publicando e
  consumindo eventos reais.
- **Business Memory**: um agente (CEO IA) registrou uma informação
  sobre um cliente; um agente **diferente** (CXO IA) leu essa mesma
  informação — provando compartilhamento real entre agentes. Um
  terceiro agente sem permissão foi corretamente bloqueado (403) pelo
  Tool Broker.
- **Scheduler**: um timer único disparou automaticamente e publicou um
  evento real no Event Bus, depois se autodesativou (`ativo = false`).
  O casador de expressões cron foi testado unitariamente.
- **Sandbox**: um conector que trava foi encerrado após timeout
  (~10s × 3 tentativas) e um conector que lança exceção foi isolado —
  em ambos os casos, **o Integration Hub continuou respondendo
  normalmente** no `/health` logo depois, provando isolamento real de
  falha.
- **Connector Manager**: versionamento e rollback de conector
  implementados; conector marcado "com_falha" pelo Sandbox é
  automaticamente recusado em novas chamadas até ser reativado.

## Como rodar

```bash
cp .env.example .env
# edite o .env e preencha ANTHROPIC_API_KEY (opcional)

docker-compose up --build
```

Sobem 9 containers: nginx, orquestrador (8080), agent-runtime (8081),
integration-hub (8082), workflow-engine (8083), scheduler (8084),
**knowledge-base (8085)**, postgres (5432), redis (6379), além de
prometheus e grafana.
O PostgreSQL já roda as 9 migrações automaticamente (`db/migrations`).

## Seed de dados de teste

```bash
docker exec -i bmf_postgres psql -U bmf_admin -d bmf_ia_os < agent-runtime/seed_test.sql
docker exec -i bmf_postgres psql -U bmf_admin -d bmf_ia_os < workflow-engine/seed_workflow_test.sql
docker exec -i bmf_postgres psql -U bmf_admin -d bmf_ia_os < workflow-engine/seed_learning_agent.sql
```

## Testando o Workflow Engine

```bash
# Inicia o workflow de teste "Emitir Seguro Auto"
curl -X POST http://localhost:8083/workflows/Emitir%20Seguro%20Auto/start \
  -H "Content-Type: application/json" -d '{"contexto":{"clienteNome":"Teste Ltda"}}'
# -> retorna a instância com status "aguardando" (parou na etapa de espera)

# Publica o evento que a instância está esperando
curl -X POST http://localhost:8083/events/ClientApproved \
  -H "Content-Type: application/json" -d '{"aprovado":true}'

# Depois de alguns segundos, consulte o status (deve estar "concluido")
curl http://localhost:8083/workflows/instances/<ID_RETORNADO_ACIMA>
```

## Testando a Business Memory

```bash
curl -X POST http://localhost:8081/business-memory/BMF-EXEC-001/<CLIENTE_ID> \
  -H "Content-Type: application/json" \
  -d '{"categoria":"preferencia","conteudo":{"nota":"prefere WhatsApp"},"confianca":"declarada"}'

# Lido por um agente DIFERENTE do que registrou:
curl http://localhost:8081/business-memory/BMF-EXEC-004/<CLIENTE_ID>
```

## Learning Agent IA — Aprendizagem de Processos (PROC-LEARN-DOC-001)

Novo agente **Beatriz Andrade (BMF-GOV-004)**, responsável por transformar
manuais/regras de negócio em rascunhos de Skills — nunca publica sozinho.
Testado de ponta a ponta, incluindo o teste de governança mais importante:
**tentar capacitar um agente antes da aprovação humana é bloqueado (400)**.

```bash
# Redigir um rascunho a partir de um texto já extraído (ex.: via OCR)
curl -X POST http://localhost:8083/skills/draft \
  -H "Content-Type: application/json" \
  -d '{"nomeProcesso":"Consultar Clientes","textoDocumento":"..."}'

# Ver a fila de rascunhos pendentes de revisão humana
curl http://localhost:8083/skills/drafts

# Aprovar (CGO IA / corretor humano)
curl -X POST http://localhost:8083/skills/<ID>/approve -H "Content-Type: application/json" -d '{}'

# Capacitar um agente na Skill aprovada (não é retreinamento — é RBAC)
curl -X POST http://localhost:8083/skills/<ID>/grant/BMF-EXEC-001 -H "Content-Type: application/json" -d '{}'

# Rejeitar, com motivo
curl -X POST http://localhost:8083/skills/<ID>/reject \
  -H "Content-Type: application/json" -d '{"motivo":"..."}'
```

Seed: `workflow-engine/seed_learning_agent.sql` (cria e homologa o agente).

## Knowledge Base Service — Fechando o Maior Gap Técnico do Projeto

Os 5 componentes especificados desde o C4-DOC-002 (Document Ingestor,
Chunker, Embedder, Vector Search, RAG Assembler) — nunca implementados
até agora — estão em `knowledge-base/`, testados contra pgvector real.

**Por que isso importa para alucinação**: as travas de contexto
(Context Compressor, limites de Business Memory, poda do Workflow
Engine) atacam o *sintoma* (contexto mal administrado). O Knowledge
Base Service ataca a *causa*: dá ao agente uma fonte de verdade
documental para responder, em vez de depender só da memória do modelo.
O RAG Assembler instrui explicitamente o agente a dizer "não sei" se a
base não tiver a resposta, em vez de inventar.

```bash
# Ingerir um documento (cria v1, ou nova versão se a referência já existir)
curl -X POST http://localhost:8085/documents \
  -H "Content-Type: application/json" \
  -d '{"referenciaLogica":"manual://quiverpro/novo-orcamento","tipo":"manual","ownerDepartamento":"Comercial","texto":"..."}'

# Buscar por similaridade
curl -X POST http://localhost:8085/search -H "Content-Type: application/json" -d '{"query":"como cotar seguro auto","k":5}'

# Perguntar com resposta aterrada em documento (RAG)
curl -X POST http://localhost:8085/rag/query \
  -H "Content-Type: application/json" \
  -d '{"pergunta":"Como faço um novo orçamento?","codigoAgente":"BMF-EXEC-001"}'
```

**Versionamento real, testado**: ingerir a mesma `referenciaLogica`
duas vezes cria v2 automaticamente, marca v1 como `superado`, registra
em `documentos_historico`, e a v1 **some da busca** — confirmado
buscando pelo texto original e recebendo só a v2 de volta.

**Embeddings**: sem `VOYAGE_API_KEY` (parceira de embeddings
recomendada pela Anthropic), roda em modo simulado — vetores
determinísticos por hash, que testam a mecânica de armazenamento e
busca corretamente, mas **não têm significado semântico real**. Para
RAG semântico de verdade em produção, configure `VOYAGE_API_KEY`.

**Learning Agent agora consome o Knowledge Base diretamente**: `POST
/skills/draft` aceita `documentoOrigemId` no lugar de `textoDocumento`
— o rascunho é gerado direto do documento já ingerido, mantendo
rastreabilidade completa (`documento_origem_id`) sem exigir que
ninguém recolha e reenvie o texto bruto.

## Context Compressor — Prevenção de Contexto Sem Limite

Gap identificado em conversa com o Conselho Executivo: a memória de
Sessão (Redis) crescia sem nenhum mecanismo de resumo — quanto mais
longa a conversa, maior o prompt enviado à IA a cada chamada, sem
limite. Resolvido em `agent-runtime/src/contextCompressor.js`, com o
mesmo papel que o `context_compressor.py` cumpre no projeto de
referência (Hermes Agent, ver LOCAL-AGENT-DOC-001).

**Como funciona**: quando o histórico de uma conversa ultrapassa
`CONTEXT_COMPRESSOR_LIMITE` mensagens (padrão: 20), as mais antigas são
substituídas por 1 única mensagem de resumo gerado por IA; as
`CONTEXT_COMPRESSOR_MANTER` mensagens mais recentes (padrão: 6)
permanecem verbatim. Testado com múltiplos ciclos de compressão
consecutivos, confirmando que **nunca acumula mais de 1 mensagem de
resumo**, mesmo após repetidas compressões.

```bash
# Variáveis de ambiente (opcionais, com padrão sensato):
CONTEXT_COMPRESSOR_LIMITE=20   # mensagens antes de comprimir
CONTEXT_COMPRESSOR_MANTER=6    # mensagens recentes mantidas verbatim

# Inspecionar a sessão bruta de uma conversa (útil para depuração):
curl http://localhost:8081/agents/BMF-EXEC-001/sessions/<CONVERSA_ID>
```

A resposta de `POST /agents/:codigo/execute` sempre inclui um campo
`compressaoContexto`, informando se a compressão foi disparada
naquela chamada.

## Limites Adicionais de Contexto — Business Memory e Workflow Engine

Dois gaps relacionados, identificados na mesma conversa que originou o
Context Compressor, resolvidos junto:

**Business Memory sem limite de busca** (`agent-runtime/src/businessMemory.js`):
a leitura agora é sempre limitada (padrão 20 registros, mais recentes
primeiro), configurável via `BUSINESS_MEMORY_LIMITE` ou pelo parâmetro
de query `?limite=N`. A resposta sempre informa `total` (contagem real,
sem limite) e `truncado` (se o que foi devolvido é um recorte) — quem
consome a API sabe se está vendo tudo ou uma fatia.

```bash
curl "http://localhost:8081/business-memory/BMF-EXEC-001/<CLIENTE_ID>?limite=10"
# -> { "registros": [...10 itens...], "total": 47, "limite": 10, "truncado": true }
```

**Contexto do Workflow Engine crescendo sem limite** (`workflow-engine/src/contextPruning.js`):
cada etapa concluída soma ao `contexto` da instância; agora, valores
individuais grandes são truncados (padrão 2000 caracteres) e, quando o
número de etapas guardadas ultrapassa o limite (padrão 10), as mais
antigas são removidas do objeto de contexto — permanecem rastreáveis
em `workflow_steps` (Postgres), mas saem do que é passado para o
próximo step/prompt. As chaves removidas ficam listadas em
`contexto._stepsOmitidos`, para auditoria.

```bash
WORKFLOW_CONTEXT_MAX_STEPS=10        # etapas mantidas no contexto ativo
WORKFLOW_CONTEXT_MAX_VALOR_CHARS=2000  # tamanho máximo de um valor antes de truncar
```

Diferente do Context Compressor (que resume conversa em linguagem
natural via IA), aqui a estratégia é truncar e sinalizar — mais barata
e apropriada para dados estruturados de conector/tool, sem atrasar
cada etapa do workflow com uma chamada extra de IA.

## Suíte de Testes Automatizada

Todos os cenários (Homologation Gate, Tool Broker, Business Memory,
pipeline do Orquestrador, Escalation Handler, Sandbox, Connector Manager,
Workflow Engine, Scheduler, Learning Agent, Context Compressor,
limites de contexto, **Knowledge Base Service/RAG**) têm testes
automatizados em `tests/`.
**53 testes, 53 passando**, contra os 6 serviços reais.

```bash
cd tests
node --test --test-reporter=spec
```

Veja `tests/README.md` para pré-requisitos e detalhes.

## O que ainda é placeholder ou backlog (por decisão explícita)

- **Conectores externos** (CRM, seguradoras, e-signature): continuam
  simulados até haver credenciais reais — igual à versão anterior.
- **Embeddings semânticos reais**: o Knowledge Base Service está
  implementado e testado (ver seção acima), mas sem `VOYAGE_API_KEY`
  configurada, a busca é mecanicamente correta e não semanticamente
  significativa — necessário para RAG de produção, não apenas para
  testar o pipeline.
- **Marketplace de conectores**: depende de decisão de negócio do
  Conselho Executivo (EA-DOC-003 §3) sobre abrir a plataforma a
  terceiros — nenhum código foi escrito para isso.
- **Workers especializados (GPU/OCR/Document)**: o mecanismo de
  distribuição (Event Bus com consumer groups) está pronto e testado;
  os workers em si não foram criados por não haver carga real de
  OCR/GPU para processar ainda — adicionar um novo tipo de worker é
  consumir o mesmo Event Bus com um novo `consumerName`, sem alterar
  nenhum componente central.
- **Learning Engine**: a captura de correção humana usa a mesma tabela
  `memoria_agentes` (tipo `aprendizado`) já existente; o motor que
  analisa padrões acumulados e propõe ajustes de Skill não foi
  construído — é um projeto à parte, deliberadamente fora deste ciclo
  (EA-DOC-002 §10).

