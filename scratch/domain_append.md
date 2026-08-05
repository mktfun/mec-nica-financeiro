## [2026-08-05] — [Feature ID: 089]

**Contexto:** O saldo anterior (Caixa Inicial) da conciliação estava propenso a amnésia e efeito cascata caso dias anteriores não tivessem sido importados. O OFX traz essa verdade na transação com `<MEMO>SALDO ANTERIOR`.

**Regra aprendida:** O `<SALDO ANTERIOR>` extraído do OFX também precisa de verificação anti-centavos, pois seu `<TRNAMT>` pode vir sem vírgulas em contas do Itaú (ex: `1931431`). Use a mesma lógica de divisão por 100 do `bank_total`. Na conciliação, deve-se usar esse `previous_balance` originado do OFX para que o dia feche independente de o usuário ter pulado importações de dias anteriores.

**Risco identificado:** Basear o Saldo Anterior em snapshots de fechamento de conciliação de ontem quebra todo o sistema em cascata se o usuário pular um dia. O OFX blinda isso.

**Não fazer:** Nunca recalcule Saldo Anterior via soma de tabelas se ele já vem escrito de forma absoluta no próprio documento bancário importado.
