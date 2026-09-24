# Design — Spec 439

## Arquitetura de Fluxo da RPC Blindada

```
Transação OFX (Inflow)
       ↓
[Fase 0: Filtro Negativo Corporativo]
  ├─ Empréstimo / Capital de Giro → manual_category = 'EMPRÉSTIMO'
  ├─ Seguros / Sinistros → manual_category = 'OUTROS'
  ├─ Rendimentos / Aplicações → manual_category = 'RENDIMENTOS'
  └─ Intercompany (MP, Empório, Holding) → manual_category = 'TRANSFERÊNCIA', matched_os = NULL
       ↓
[Fase 1: Cartões (Rede x OS)]
  └─ Match determinístico por net/gross com parcela de cartão na mesma filial
       ↓
[Fase 2: PIX x OS Estrito]
  ├─ Ignora: Adquirentes (REDE, CIELO, STONE, etc.) e Intercompany (MP, EMPORIO, etc.)
  ├─ Critério 2A: Número explícito da OS contido no FITID ou descritivo
  └─ Critério 2B: Duplo Fator Cumulativo Obrigatório:
        1. pix_transfer_value > 0 na OS
        2. ABS(pix_transfer_value - amount) <= 0.05
        3. Match de Identidade:
           - Se ambos têm CPF/CNPJ: documentos DEVEM ser iguais
           - Se não têm documento: sobreposição de tokens fortes entre counterpart_name e client_name
           - [ELIMINADO]: Busca cega por total_value ou saldo residual
           - [ELIMINADO]: Busca cega por primeiro nome isolado (SPLIT_PART)
       ↓
[Fase 3: Contas a Pagar x Saídas OFX]
  └─ Dispara auto_match_saidas(p_date)
```

---

## Contrato SQL da RPC `auto_match_daily_transactions`

```sql
CREATE OR REPLACE FUNCTION public.auto_match_daily_transactions(p_date text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
...
$$;
```

---

## Cenários de Teste

### Happy Path (PIX de Cliente Genuíno)
1. **Entrada:** Depósito OFX `PIX QR CODE RECEBIDO JÚLIO CÉZAR 23/09 JÚLIO CÉZAR PEREIRA DE SOUZA ARAUJO`, valor `+R$ 2.119,13`, filial `st-08`.
2. **OS #2447:** Filial `st-08`, cliente `JÚLIO CÉZAR PEREIRA`, `pix_transfer_value = 2119.13`.
3. **Execução:**
   - Fase 0: Não é intercompany nem aplicação → segue para Fase 2.
   - Fase 2: Valor bate exatamente com `pix_transfer_value` (2119.13 = 2119.13) e nome bate com tokens fortes (`JULIO`, `CEZAR`, `PEREIRA`).
4. **Resultado:** `ofx_transactions.matched_os_number = '2447'`, `match_status = 'MATCHED'` ✅.

### Edge Case 1 (Transferência Intercompany entre Filiais)
1. **Entrada:** Depósito OFX `RECEBIMENTOS MP AUTO MECANICA POPULAR LTDA.`, valor `+R$ 1.510,00`, filial `st-01`.
2. **OS #619:** Filial `st-01`, cliente `ADEILTON NIVALDO SILVA DOS SANTOS`, `total_value = 1510.00`, `pix_transfer_value = 0`.
3. **Execução:**
   - Fase 0C: Reconhece `%MP AUTO MECANICA%` como entidade Intercompany.
   - Marca como `manual_category = 'Transferência Entre Lojas [Apenas Conciliar]'`, `match_status = 'intercompany_paired'`, `matched_os_number = null`.
   - Fase 2: Bloqueada pelo filtro negativo de intercompany.
4. **Resultado:** `matched_os_number` permanece `null`. OS #619 não é contaminada ✅.

### Edge Case 2 (Pagamento de Oficina Terceira com mesmo Valor)
1. **Entrada:** Depósito OFX `RECEBIMENTOS HD CENTRO AUTOMOTIVO AUTO MECANICA LTDA`, CNPJ `50.903.911/0001-05`, valor `+R$ 5.000,00`, filial `st-08`.
2. **OS #2439:** Filial `st-08`, cliente `EDINEIA TEIXEIRA BRITO`, `pix_transfer_value = 5000.00`.
3. **Execução:**
   - Fase 2: Valor bate (5000.00), mas o CNPJ do remetente (`50.903.911/0001-05`) e o nome (`HD CENTRO AUTOMOTIVO`) não têm nenhuma correspondência com a cliente (`EDINEIA TEIXEIRA BRITO`).
   - Sem correspondência de identidade → `v_os_record := NULL`.
4. **Resultado:** `matched_os_number` permanece `null`, transação cai como pendente para decisão humana ✅.

---

## Critérios de Aceitação Verificáveis

- [ ] Nova RPC `auto_match_daily_transactions` aplicada com sucesso no Supabase sem erros de sintaxe.
- [ ] Vínculos corrompidos de 24/09 (OS #619 e OS #1894 em transações intercompany) saneados para `matched_os_number = null`.
- [ ] Execução de `auto_match_daily_transactions('2026-09-24')` no banco:
  - Mantém vinculados os 6 PIX legítimos de clientes (Júlio Cézar, Thales, Ermani, Laercio, Wellington, Ricardo Alves).
  - Mantém desvinculados HD Centro Automotivo (5k), MP Mecânica Popular (1.510) e MP Jabaquara (1.000).
- [ ] `npm run build` passa sem erros (exit code 0).
