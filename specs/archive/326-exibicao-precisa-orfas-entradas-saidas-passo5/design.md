# Design: Exibição Precisa e Híbrida de Órfãos Reais no Passo 5 (326)

## Arquitetura de Dados

```
[Upload dos Arquivos OFX + Contas a Pagar + OSs]
                   │
                   ▼
┌────────────────────────────────────────────────────────┐
│ Pré-Matching em Memória (Client-side)                  │
│ • executeExpenseAutoMatching() -> Marca 43 Saídas      │
│ • executeAutoMatchingEngine()  -> Marca Entradas OS    │
└────────────────────────────────────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────────────────┐
│ Passo 5 (Step2NonRevenueJustifications)                │
│                                                        │
│ 1. Consulta DB: pending-ofx-outflows / inflows         │
│ 2. Se DB tiver itens -> usa DB                         │
│ 3. Se DB vazio / preview -> usa memória filtrada:      │
│    • Exclui tx.matched_bill_id (43 saídas casadas)     │
│    • Exclui tx.matched_os_number (entradas casadas)    │
│    • Exclui cabeçalhos Itaú (5 linhas de saldo)        │
│                                                        │
│ RESULTADO NA TELA:                                     │
│ • Aba "Saídas Órfãs (4)":                              │
│   1. [JAB] R$ 9,14 - Tarifa Cobrança                   │
│   2. [MP]  R$ 5.000,00 - CAP Prime / Daniel            │
│   3. [HD]  R$ 1.365,00 - Sispag Fornecedores           │
│   4. [HD]  R$ 1.107,00 - Sispag Fornecedores           │
│                                                        │
│ • Aba "Entradas Órfãs (1)":                            │
│   1. [Loja] R$ Valor - Transferência / Aporte          │
└────────────────────────────────────────────────────────┘
```

---

## Modificações em Arquivos Existentes [MODIFY]

### 1. `src/components/importacoes/wizard/Step2NonRevenueJustifications.tsx`
- Implementar fallback em memória inteligente que respeita os flags `matched_bill_id`, `matched_os_number` e regex de cabeçalhos bancários.
- Garantir que as contagens nos badges (`Saídas Órfãs (X)` e `Entradas Órfãs (Y)`) reflitam os itens visíveis.

### 2. `src/components/importacoes/CentralImportWizard.tsx`
- Acionar `executeExpenseAutoMatching` assim que `contasPagarResults` e `ofxResults` estiverem presentes, garantindo marcação de `matched_bill_id` antes da transição para os steps seguintes.

---

## Cenários de Teste (SCAN → INFER → VERIFY → FIX)

### Cenário 1: Exibição Precisa de 4 Saídas e 1 Entrada para a pasta `31-08`
- **SCAN:** Arquivos de `31-08` carregados no wizard.
- **INFER:** 43 saídas casadas devem estar ocultas; 4 saídas órfãs e 1 entrada órfã devem estar visíveis.
- **VERIFY:**
  - Badge "Saídas Órfãs" exibe `(4)`.
  - Badge "Entradas Órfãs" exibe `(1)`.
  - Nenhuma das 43 contas pagas aparece para reclassificação.
- **FIX:** Exibição exata.

### Cenário 2: Justificativa das 4 saídas residuais
- **SCAN:** Operador classifica a tarifa de R$ 9,14 e as despesas avulsas.
- **INFER:** Ao salvar cada uma, a linha é marcada como salva com badge verde.
- **VERIFY:** Todas as 4 podem ser homologadas antes de avançar para o Passo 6 (Cofre).
- **FIX:** Fluxo de fechamento 100% íntegro.
