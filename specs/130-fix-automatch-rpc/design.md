# Design: Fix Auto Match RPC (130-fix-automatch-rpc)

## Arquitetura Técnica
A nova RPC vai atuar no mesmo padrão loop do backend original, mas fará o roteamento para as tabelas físicas corretas:
`Frontend (Import Wizard)` → `RPC auto_match_transactions` →
  1. Limpa `matched_os_number` de `ofx_transactions` e `pos_transactions` para a data.
  2. Limpa `matched_ofx_id` de `patio_os`.
  3. Percorre cada entrada em `ofx_transactions`.
  4. Tenta achar uma OS no `patio_os` com valor similar. Se sim, marca ambos.
  5. Senão, tenta achar grupo de transações em `pos_transactions` com valor similar. Se sim, vincula.

## Interfaces TypeScript
Nenhuma mudança no Typescript, a interface já está consumindo os dados da View unificada `transactions`.

## Componentes / Hooks / Funções
- `supabase/migrations/<timestamp>_fix_automatch.sql`: Nova migration substituindo o RPC `auto_match_transactions`.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1:** Importar lote do zero. Deve rodar o RPC sem lançar erro de coluna inexistente e vincular corretamente OS = OFX.
