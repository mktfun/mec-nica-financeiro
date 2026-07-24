-- BMF IA OS — Seed de Testes (Suíte Automatizada)
-- Consolida os dados que antes eram semeados manualmente durante a
-- validação: agente sem permissão de memória de negócio, cliente de
-- teste, e as permissões cruzadas usadas para provar o
-- compartilhamento entre agentes (EA-DOC-003 §6).
--
-- Pré-requisito: agent-runtime/seed_test.sql e
-- workflow-engine/seed_workflow_test.sql já aplicados (criam
-- BMF-EXEC-001, BMF-EXEC-004 e a definição "Emitir Seguro Auto").

-- Agente existente, sem nenhuma permissão de ferramenta concedida —
-- usado para provar que o Tool Broker bloqueia por padrão.
INSERT INTO agentes_ia (codigo, nome, cargo, role_curto, departamento, classe, status_homologacao, ficha_bass)
VALUES ('BMF-EXEC-999', 'Agente Sem Permissao (Teste)', 'Teste', 'TESTE IA', 'Teste', 'B', 'especificado', '{}'::jsonb)
ON CONFLICT (codigo) DO NOTHING;

-- Cliente de teste para os cenários de Business Memory.
INSERT INTO clientes (id, tipo_pessoa, nome_razao_social, cpf_cnpj)
VALUES ('39357839-0d4c-4e76-9fbe-7d12c432e80d', 'PF', 'Cliente Suite de Testes', '222.222.222-22')
ON CONFLICT (id) DO NOTHING;

-- Permissão de memoria_negocio para dois agentes DIFERENTES — o teste
-- prova que a informação registrada por um é lida pelo outro.
INSERT INTO permissoes_ferramentas (agente_id, ferramenta, permissao)
SELECT id, 'memoria_negocio', 'leitura_escrita' FROM agentes_ia WHERE codigo = 'BMF-EXEC-001'
ON CONFLICT DO NOTHING;

INSERT INTO permissoes_ferramentas (agente_id, ferramenta, permissao)
SELECT id, 'memoria_negocio', 'leitura_escrita' FROM agentes_ia WHERE codigo = 'BMF-EXEC-004'
ON CONFLICT DO NOTHING;
