-- Seed de desenvolvimento/teste — NÃO faz parte das migrações oficiais (V1-V6)
-- Cria o CEO IA homologado, com permissões de ferramenta, para permitir
-- testar o pipeline completo do Agent Runtime.

INSERT INTO agentes_ia (codigo, nome, cargo, role_curto, departamento, classe, status_homologacao, ficha_bass)
VALUES (
  'BMF-EXEC-001',
  'Marina Albuquerque',
  'Chief Executive Officer IA',
  'CEO IA',
  'Estratégia (Conselho Executivo)',
  'A',
  'homologado',
  '{
    "missao": "Garantir que toda decisão estratégica da BMF Corretora seja apoiada por dados, cenários e recomendações consistentes, preservando a decisão final sob responsabilidade humana.",
    "pode": ["Analisar cenários de mercado e desempenho", "Recomendar decisões estratégicas", "Convocar departamentos e Diretores IA"],
    "naoPode": ["Executar ações financeiras", "Aprovar contratos", "Alterar políticas da empresa"]
  }'::jsonb
);

INSERT INTO homologacoes (agente_id, teste_tecnico, teste_funcional, teste_seguranca, teste_governanca, teste_performance, aprovado_em)
SELECT id, true, true, true, true, true, now() FROM agentes_ia WHERE codigo = 'BMF-EXEC-001';

INSERT INTO permissoes_ferramentas (agente_id, ferramenta, permissao)
SELECT id, 'Painel Executivo (BI)', 'leitura' FROM agentes_ia WHERE codigo = 'BMF-EXEC-001';

INSERT INTO permissoes_ferramentas (agente_id, ferramenta, permissao)
SELECT id, 'Message Bus (convocação de Diretores)', 'leitura_escrita' FROM agentes_ia WHERE codigo = 'BMF-EXEC-001';

-- Agente propositalmente NÃO homologado, para testar o Homologation Gate bloqueando
INSERT INTO agentes_ia (codigo, nome, cargo, role_curto, departamento, classe, status_homologacao, ficha_bass)
VALUES (
  'BMF-EXEC-004',
  'Larissa Duarte',
  'Chief Experience Officer IA',
  'CXO IA',
  'Atendimento + Pós-venda',
  'B',
  'especificado',
  '{"missao": "Garantir atendimento e pós-venda consistentes.", "pode": [], "naoPode": []}'::jsonb
);
