# ⚖️ Memória Modular: Conciliação & Matches

## [2026-07-23] — Feature ID: conciliacao-fixes

**Contexto:** Corrigido o batimento da Maquininha REDE ↔ OFX na Aba 2 e a exibição do Faturamento da OS na Aba 1.

**Regra aprendida:** 
- Na Aba 2, os lançamentos de extrato bancário (OFX) devem ser segregados entre créditos de adquirente (`REDE`, `REDECARD`, `MAST`, `VISA`, `ELO`, `PAGAMENTO S.A.`) e lançamentos gerais (PIXs/Transferências). O valor líquido total da maquininha da loja deve ser comparado exclusivamente contra os depósitos de adquirente para determinar se a maquininha está **PAREADA**.
- Na Aba 1, ao buscar `patio_os` por `os_number`, normalize o campo convertendo ambos para string e removendo qualquer prefixo de loja (`String(o.os_number).trim() === String(osNumber).replace(/^[^-]+_/, '').trim()`).

**Risco identificado:** Subtrair o saldo total de entradas do extrato (incluindo PIXs avulsos) do valor da maquininha gera falsos alarmes de *"SOBRA R$ X"*.

**Não fazer:** Nunca misturar entradas de PIX no banco com o cálculo de batimento do líquido da maquininha de cartão.
