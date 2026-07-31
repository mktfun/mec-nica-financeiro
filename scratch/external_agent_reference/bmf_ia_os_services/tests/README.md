# BMF IA OS — Suíte de Testes Automatizados

Testes de integração real (não mocks) contra os 6 serviços rodando —
HTTP, PostgreSQL e Redis de verdade. É a versão automatizada exata dos
testes manuais feitos durante o desenvolvimento (curl, um a um).

## Pré-requisitos

1. Os 6 serviços rodando (local ou `docker-compose up`)
2. Migrações V1-V8 aplicadas
3. Seeds aplicados, na ordem:
   ```bash
   psql $DATABASE_URL -f ../agent-runtime/seed_test.sql
   psql $DATABASE_URL -f ../workflow-engine/seed_workflow_test.sql
   psql $DATABASE_URL -f ../workflow-engine/seed_learning_agent.sql
   psql $DATABASE_URL -f seed.sql
   ```

## Rodar

```bash
cd tests
node --test --test-reporter=spec
```

Requer Node.js 22+ (usa o runner de testes nativo `node:test` e o
`fetch` global — nenhuma dependência de teste precisa ser instalada).

## O que cada arquivo cobre

| Arquivo | O que testa |
|---|---|
| `agent-runtime.test.js` | Homologation Gate, Tool Broker, Business Memory (compartilhamento entre agentes + RBAC) |
| `orquestrador.test.js` | Pipeline completo (classificação → roteamento → execução), Escalation Handler |
| `integration-hub.test.js` | Dispatch de conector, Webhook Receiver, **Sandbox** (isolamento de falha e travamento), Connector Manager (versionamento/rollback) |
| `workflow-engine.test.js` | Estado persistente, retomada por evento real do Event Bus, conclusão do workflow |
| `learning-agent.test.js` | Learning Agent IA (BMF-GOV-004): rascunho de Skill, bloqueio de capacitação pré-aprovação, aprovação, capacitação/revogação de agente, rejeição com motivo |
| `context-compressor.test.js` | Compressão automática de sessão longa, preservação de mensagens recentes verbatim, e garantia de que múltiplos ciclos de compressão nunca acumulam mais de 1 resumo |
| `knowledge-base.test.js` | Document Ingestor, Chunker, Embedder, Vector Search e RAG Assembler: ingestão, versionamento (v1 superada e excluída da busca), busca por similaridade, resposta aterrada em documento real |
| `scheduler.test.js` | Timer único disparando e se autodesativando |

## Variáveis de ambiente (opcional)

Por padrão os testes assumem os serviços em `localhost` nas portas
padrão (8080-8084). Para apontar a outro ambiente:

```bash
ORQUESTRADOR_URL=http://staging:8080 \
AGENT_RUNTIME_URL=http://staging:8081 \
INTEGRATION_HUB_URL=http://staging:8082 \
WORKFLOW_ENGINE_URL=http://staging:8083 \
SCHEDULER_URL=http://staging:8084 \
node --test .
```

## Nota sobre velocidade

O teste do Sandbox (conector que trava) usa o timeout real de
`SANDBOX_TIMEOUT_MS` do Integration Hub. Para rodar a suíte mais
rápido, suba o Integration Hub com um timeout curto:

```bash
SANDBOX_TIMEOUT_MS=1000 node ../integration-hub/src/index.js
```

O teste do Scheduler usa o endpoint `/admin/tick` para forçar a
checagem imediatamente, em vez de esperar até 60 segundos pelo
próximo ciclo natural.

O teste do Context Compressor usa `CONTEXT_COMPRESSOR_LIMITE=6` e
`CONTEXT_COMPRESSOR_MANTER=2` (em vez dos padrões de produção,
20 e 6) para disparar a compressão em poucas chamadas:

```bash
CONTEXT_COMPRESSOR_LIMITE=6 CONTEXT_COMPRESSOR_MANTER=2 node ../agent-runtime/src/index.js
```
