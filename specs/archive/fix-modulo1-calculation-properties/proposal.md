# Proposal: CorreçÁo dos Nomes de Propriedade do Módulo 1 na ConciliaçÁo Diária (fix-modulo1-calculation-properties)

## Problema

Ao visualizar a conciliaçÁo diária (`/conciliacao`), o usuário notou que mesmo com **Apurado Sistema = R$ 28.760,81** e **Entradas OFX = R$ 70.499,65**, os cards do Módulo 1 exibiam todos os totais zerados:
- SALDO BANCO ITAÚ: `R$ 0,00`
- SALDO TOTAL: `R$ 0,00`
- CAIXA ATUAL: `R$ 0,00`
- DISPONÍVEL CONTAS: `R$ 0,00`
- RESULTADO FINAL: `R$ 0,00`

### 🔍 Causa Raiz Identificada:
Em `src/routes/conciliacao.index.tsx` (linhas 44-56), o array `storesState` construía os objetos com nomes de propriedades divergentes da interface `StoreSaldoState` definida em `src/lib/modulo1Calculations.ts`:
- O código passava `saldo_banco_itau_ofx` em vez de `saldo_banco_itau`
- O código passava `a_receber_pendente` em vez de `a_receber`
- O código passava `na_loja_os_patio` em vez de `na_loja_os`
- O código omitia `faturamento_atual` e `limite_credito`

Como a funçÁo `calculateModulo1Saldo()` buscava `st.saldo_banco_itau`, `st.a_receber` e `st.na_loja_os`, todas as propriedades retornavam `undefined` (convertidos para `0`), zerando todos os cálculos da página.

## SoluçÁo Proposta

1. **CorreçÁo do Mapeamento de Propriedades em `src/routes/conciliacao.index.tsx`:**
   - Mapear corretamente as chaves esperadas por `StoreSaldoState`:
     - `saldo_banco_itau`: valor depositado no banco (OFX `bankIn` ou acumulado)
     - `a_receber`: soma dos recebíveis pendentes da loja (`receivables`)
     - `na_loja_os`: soma das OSs em aberto no pátio (`patio_os`)
     - `faturamento_atual`: apurado do sistema da loja (`sys`)
     - `limite_credito`: limite configurado na loja (`credit_limit`)

2. **IntegraçÁo do Hook `useModulo1StoresData` ou Cálculo Dinâmico:**
   - Garantir que a consulta recupere também os pendentes de `patio_os` e `receivables` para popular dinamicamente os cartões de A RECEBER e NA LOJA OS.

3. **ValidaçÁo das Fórmulas G13 a G31:**
   - Garantir que `saldo_total_g17 = G13 + G14 + G15 + G16`
   - Garantir que `caixa_atual_g21 = G17 - Limite`
   - Garantir que `disponivel_contas_g29 = G27 - G23`
   - Garantir que `resultado_final_g31 = G29 - Contas`

## Contratos de Dados
- Interface `StoreSaldoState` em `src/lib/modulo1Calculations.ts`

## Features Existentes Impactadas
- `src/routes/conciliacao.index.tsx` (Hero panel da conciliaçÁo)
- `src/components/conciliacao/ResumoDiaPanel.tsx` (exibiçÁo dos cards)

## Risco Principal
Valores negativos no caixa caso o limite de crédito nÁo esteja preenchido.
*MitigaçÁo:* Usar `(store.credit_limit || 0)` com fallback seguro para 0.
