# Plano de execução — Spec 443: Restaurar Fechamento por Filial, Rede a Compensar e Vínculo Rede × OS

- [x] Completed — [AUDITORIA; database] Correlacionar log/prints com execução, data, versão e lote; capturar definições efetivas das RPCs, schema/RLS, resumo bruto dinâmico/congelado e dados da OS #4427. Verificar por consultas somente leitura e relatório com contagens/IDs.
- [x] Completed — [CONTRATO; backend-patterns] Formalizar payload completo por loja/global com versão, revisão, origem, contagens e integridade; reutilizar tipos reais e validar com Zod.
- [x] Completed — [BACKEND/DB; database] Unificar cálculo de a compensar, parcial/estornos e data de corte, preservando escopo de vendas e histórico. Migration nova baseada no SQL implantado; verificar invariantes SQL, soma filial/global e eliminar corte de 40k.
- [x] Completed — [MATCH OS; database, backend-patterns] Consolidar regras da spec 440 entre rotas e diagnosticar OS #4427; vínculo informativo de OS já paga, por parcela bruta única, sem dupla baixa nem alteração bancária.
- [x] Completed — [LIQUIDAÇÃO; backend-patterns, database] Corrigir identidade das alocações Rede × OFX, remover crédito sintético e quitação por valor/substrings, preservar liquidações legítimas e datas.
- [x] Completed — [FECHAMENTO; database, backend-patterns] Publicar snapshot completo apenas após persistência/motores/verificação, com revisão e proteção de concorrência; unificar ramos da Central com fechar_dia.
- [x] Completed — [FRONTEND; frontend-design-pro] Remover corte de 40 mil e sobreposição financeira local no caminho afetado; renderizar backend validado, distinguir zero de campo ausente, corrigir selos e guarda de lojas parciais, ajustar rótulo bruto/líquido.
- [x] Completed — [LOGS; backend-patterns] Registrar retorno real das escritas, revisão/data/lote/versão, totais persistidos e motivos de recusa do matcher; eliminar mensagem incondicional de sucesso/100%.
- [x] Completed — [RECUPERAÇÃO; database] Fazer backup e dry-run apenas das datas/lojas/lotes comprovados, comparar resumo/snapshot e propor revisão auditável; verificar valores oficiais, justificativas, vínculos e abertura do dia seguinte preservados antes de aplicar reparação.
- [x] Completed — [VALIDAÇÃO/GATE; sdd-apply] Executar matriz de regressão do design, testes e npm run build; conferir integridade e parada obrigatória (Hard Stop).
