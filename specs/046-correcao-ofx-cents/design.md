# Design - Parser OFX

A alteração envolverá o Regex e a manipulação da String do `bankBalance` no helper nativo `src/lib/parsers/ofxParser.ts`.

Nenhuma alteração de Banco de Dados ou Arquitetura de Interface será necessária. O Supabase continuará sendo alimentado pela mesma chamada de rede.

## Script de Purga
A purga pode ser feita pelo mesmo `scripts/purge-bug-17m.ts` (vamos renomeá-lo ou sobrescrevê-lo no Backend Engineer) passando a deletar TODOS os registros de `reconciliations` no dia correspondente ou limpando `reconciliations` que possuam saldos gigantes anormais para a importação de ontem. O mais fácil será deletar TUDO de `reconciliations` do dia 09/06 e 10/06, ou pedir ao backend engineer para dropar os bank_totals que sejam maiores que 100_000. Mas como os saldos variam e há saldo de -4 milhões, uma query SQL como `DELETE FROM reconciliations WHERE abs(bank_total) > 100000;` fará o serviço de limpar todas as sujeiras do bug, garantindo que a base volte a 0 e possa receber a importação correta.
