INSERT INTO workflow_definitions (nome, versao, descricao, definicao_json) VALUES (
  'Emitir Seguro Auto',
  '1.0',
  'Fluxo simplificado de teste: registrar lead -> cotar -> aguardar aprovacao do cliente -> registrar decisao com o CEO IA',
  '{
    "steps": [
      {
        "nome": "Registrar Lead no CRM",
        "tipo": "connector",
        "alvo": "crm",
        "acao": "criar_lead",
        "evento_conclusao": "DocumentProcessed"
      },
      {
        "nome": "Cotar na Seguradora",
        "tipo": "connector",
        "alvo": "seguradoras",
        "acao": "cotar",
        "payload": { "seguradoraId": null },
        "evento_conclusao": "QuoteFinished"
      },
      {
        "nome": "Aguardar Aprovacao do Cliente",
        "tipo": "wait",
        "aguardando_evento": "ClientApproved",
        "acao_expiracao": "cancelar"
      },
      {
        "nome": "Registrar Decisao",
        "tipo": "agent",
        "alvo": "BMF-EXEC-001",
        "objetivo": "Registrar que o cliente aprovou a proposta e confirmar proximos passos",
        "evento_conclusao": "WorkflowFinished"
      }
    ]
  }'::jsonb
);
