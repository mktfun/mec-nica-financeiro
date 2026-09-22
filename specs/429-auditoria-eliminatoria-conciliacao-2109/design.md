# SDD Design — Spec 429: Auditoria Eliminatória e Saneamento da Conciliação 21/09

## 1. Arquitetura de Fluxo dos Dados

```
Arquivos Locais (21-09)
 ├── 10 OFX (Saldos + e -) ─────────► Pilar 1 (Saldo Bancos + Cofre + Rede)
 ├── 8 Rede XLSX (A Compensar & Juros) ──► Pilar 1 (+50.300,11) & Pilar 4 (+3.473,84)
 ├── 1 BuscaContasAPagar.xls ────────► Pilar 4 (Contas Manual 73.509,19)
 ├── 1 Mapa de Metas PDF ────────────► Faturamento (Odômetro Líquido: 69.064,82)
 └── 10 OS Conferencia.xls ─────────► Pilar 3 (Pátio OS Ativas: 56.603,96)
                                              │
                                              ▼
                                   Caixa Atual = R$ 231.021,74
                                              │
         Caixa Anterior (18/09 SSOT) ─────────┴──► Fluxo de Caixa = Caixa Atual - Caixa Ant.
                                                          │
         Faturamento + Justificativas ────────────────────┴──► Valor Disp. Contas
                                                                     │
         Subtotal Contas (Base + Juros) ─────────────────────────────┴──► Diferença Final (<= R$ 50)
```

---

## 2. Cenários Obrigatórios

### Happy Path
1. O snapshot de 18/09/2026 tem seu `caixa_atual` sincronizado para **R$ 235.727,47** (refletindo o print validado com o cofre de R$ 1.960,00).
2. O dia 21/09 carrega `caixa_anterior = 235.727,47`.
3. O `fluxo_caixa` de 21/09 é apurado corretamente:
   $$231.021,74 - 235.727,47 = -4.705,73$$
4. O `valor_disp_contas` é atualizado para:
   $$69.064,82 - (-4.705,73) = 73.770,55$$
5. Com a verificação de Dinheiro MP e eventuais justificativas de créditos OFX, a `diferenca_final` é saneada dentro da margem de tolerância ($\le \pm 50,00$) ou exatamente R$ 0,00.

### Edge Case
- Se o usuário confirmar que o Dinheiro MP permaneceu em R$ 28.316,00 (sem aporte adicional de R$ 2.800,00), o Caixa Atual passa para R$ 228.221,74, e o Fluxo de Caixa se ajusta para -R$ 7.505,73, elevando o Valor Disponível Contas para R$ 76.570,55, reduzindo a diferença final a apenas -R$ 412,48 (ou R$ 0,00 com os créditos OFX elegíveis).

---

## 3. Critérios de Aceitação Verificáveis

1. **Terminal Gate:** `npm run build` executa sem erros de TypeScript e compilação (exit code 0).
2. **Conexão dos Pilares:**
   - Saldo Bancos Positivo: R$ 125.754,69
   - Saldo Cheque Especial: R$ 43.242,69
   - Cartões a Compensar: R$ 50.300,11
   - Juros Rede: R$ 3.473,84
   - Contas Manual: R$ 73.509,19
   - Faturamento Líquido: R$ 69.064,82
   - Na Loja OS: R$ 56.603,96
3. **Equilíbrio do Fechamento:** Diferença Final equalizada no snapshot de 21/09 com status `approved` ou dentro da tolerância ($\pm 50,00$).

---

## 4. Cenários de Teste

1. **[SCAN -> VERIFY] Batimento dos Arquivos:**
   - Verificar se as somas dos 10 OFX, 8 Rede XLSX, 1 Contas e 10 OS correspondem rigorosamente aos dados do sistema (concluído com êxito).
2. **[INFER -> FIX] Saneamento da Cadeia de Caixas:**
   - Atualizar 18/09 no Supabase e disparar recalculo reativo em 21/09.
