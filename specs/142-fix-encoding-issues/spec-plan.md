# Spec Plan (Save-State)

## Current Status
- ✅ Diagnóstico Concluído
- ✅ Script Regex Inicial (çã) Rodado em background
- ⏳ Executar varredura profunda com todos os Regex listados no design.md
- ⏳ Executar Build Validation
- ⏳ Reportar fim da execução

## Contexto de IA
Foi decidido isolar o fluxo na Spec 142 de forma segura para não afetar outras letras "Á" com acentuação correta.
O agente deverá agora criar um script Node (`fix-encoding.cjs` no diretório temporário) contendo a lógica de substituição descrita no `design.md`, e rodar esse script usando o terminal, antes de deletar o script. 
Após isso, rodar `npm run build` para garantir sanidade no AST.
