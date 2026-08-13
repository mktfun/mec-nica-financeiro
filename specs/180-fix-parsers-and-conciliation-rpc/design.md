# Design: Fix Import Parsers & RPC (180)

## Arquitetura Técnica
A arquitetura permanece a mesma, corrigiremos o comportamento das engrenagens existentes:
- **OFX Upload** → `ofxParser` → `hashUtils` (com mapa de contagem interno) → DB
- **Marco Zero Upload** → `marcoZeroParser` (Filtro numérico universal e rotulação exata) → DB
- **Painel de Conciliação** → Invoca RPC `calculate_daily_conciliation` (Lendo `counterpart_name` em vez de `description`) → Retorna Dados Limpos

## Interfaces TypeScript
*Nenhuma mudança estrutural necessária.* As assinaturas atuais suportam plenamente os ajustes internos de função.

## Componentes / Hooks / Funções
- **`src/lib/parsers/ofxParser.ts`**: Alterado para controlar índice de duplicação temporal (Nonce) e suprimir formatação hacky de valores bancários.
- **`src/lib/parsers/marcoZeroParser.ts`**: Alterado para suportar floats US via detecção de casa decimal.
- **`supabase/migrations/<TIMESTAMP>_fix_rpc_columns.sql`**: Nova migration contendo apenas a reconstrução do corpo da função `calculate_daily_conciliation`.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1 (RPC):** Carregar o Painel de Conciliação com OFX inserido → RPC é chamada sem `column description does not exist` → Carrega o status `approved` na tela.
- **Cenário 2 (Hash):** Mandar OFX de PIX com dois itens idênticos → DB salva duas linhas ao invés de sobrepor uma, mantendo total faturado igual à soma.
- **Cenário 3 (Centavos):** OFX com valor `150` salva como `150.00` e não `1.50`.
- **Cenário 4 (Marco Zero US):** Upload de planilha Export US `1000.50` salva como 1000.5 e não 100050.
