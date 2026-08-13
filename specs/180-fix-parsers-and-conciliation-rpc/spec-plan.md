# Spec Plan: Fix Import Parsers & RPC (180)

## Tasks

- [x] [BACKEND] Criar migration contendo a correção da RPC `calculate_daily_conciliation`, alterando `description ILIKE` para `counterpart_name ILIKE '%...%' OR fitid ILIKE '%...%'`.
- [x] [FRONTEND] Atualizar `ofxParser.ts` para introduzir o controle sequencial de Hashes (usando Map no escopo da função para rastrear duplicatas `rawMemo + amount + dateStr` e aplicar sufixo `_X` garantindo idempotência e preservando idênticos).
- [x] [FRONTEND] Remover a divisão perigosa por 100 no `ofxParser.ts` caso o arquivo não tenha separadores.
- [x] [FRONTEND] Atualizar `marcoZeroParser.ts` para reconhecer formatação decimal gringa (Regex `/^\d+\.\d{2}$/`) dentro de `cleanNumber`.
- [x] [FRONTEND] Substituir os `includes` genéricos por checagem exata ou ancorada na busca de Labels do `marcoZeroParser.ts`.
- [x] [TEST] Re-testar a rotação do Painel (Cenário 1) e garantir carregamento limpo da Dashboard diária.
