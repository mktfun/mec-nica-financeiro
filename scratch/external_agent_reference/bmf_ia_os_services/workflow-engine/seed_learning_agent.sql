-- Seed do Learning Agent IA (BMF-GOV-004) — PROC-LEARN-DOC-001
-- Homologado propositalmente, para permitir testar o pipeline de
-- redacao de rascunhos sem depender de um ciclo de homologacao
-- separado (o Homologation Gate ja foi validado em outros agentes).

INSERT INTO agentes_ia (codigo, nome, cargo, role_curto, departamento, classe, status_homologacao, ficha_bass)
VALUES (
  'BMF-GOV-004',
  'Beatriz Andrade',
  'Analista de Processos e Capacitação IA',
  'Learning Agent IA',
  'Governança',
  'B',
  'homologado',
  '{
    "missao": "Transformar manuais, procedimentos operacionais e regras de negócio fornecidos pelo cliente em rascunhos de Skills, Connectors e políticas operacionais compatíveis com a arquitetura do BMF IA OS, e gerenciar a capacitação controlada dos demais agentes quando esses rascunhos forem aprovados.",
    "pode": [
      "Ler e extrair conteúdo de documentos",
      "Produzir especificação operacional de 11 campos",
      "Redigir rascunho de workflow_definitions (Skill) em JSON",
      "Identificar necessidade de novo Connector e redigir sua especificação",
      "Submeter rascunho à revisão humana e ao CGO IA"
    ],
    "naoPode": [
      "Publicar uma Skill diretamente em produção sem aprovação humana e do CGO IA",
      "Escrever ou alterar código de execução de Connector",
      "Alterar ficha_bass de outro agente além do Módulo 6 (Conhecimento)",
      "Reprocessar documento rejeitado sem instrução humana explícita do motivo"
    ]
  }'::jsonb
)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO homologacoes (agente_id, teste_tecnico, teste_funcional, teste_seguranca, teste_governanca, teste_performance, aprovado_em)
SELECT id, true, true, true, true, true, now() FROM agentes_ia
WHERE codigo = 'BMF-GOV-004'
AND NOT EXISTS (SELECT 1 FROM homologacoes h WHERE h.agente_id = agentes_ia.id);

-- Permissão de ferramenta: redigir_skill (usada pelo Tool Broker para
-- controlar quem pode invocar a capacidade de rascunho de Skill)
INSERT INTO permissoes_ferramentas (agente_id, ferramenta, permissao)
SELECT id, 'redigir_skill', 'leitura_escrita' FROM agentes_ia WHERE codigo = 'BMF-GOV-004'
ON CONFLICT DO NOTHING;
