# Design: Redesign Minimalista de Pátio e Faturamento (353)

## Arquitetura Visual e Simplificação

### 1. Step 1.5 — Gestão de Pátio Descomplicada
```
┌────────────────────────────────────────────────────────────────────────┐
│ 🚗 Gestão de Pátio (Sem Planilhas)                 [ 📝 Manual ] [ 📷 OCR ] │
├────────────────────────────────────────────────────────────────────────┤
│ [Filial: Matriz Santo André ▼]   3 OSs no pátio   |   Total: R$ 4.250,00│
│                                                                        │
│  OS      CLIENTE/PLACA       VALOR       PAGAMENTO                     │
│  ───────────────────────────────────────────────────────────────────── │
│  #14201  Gol ABC-1234        R$ 850,00   [PIX] [Cartão] [Dinheiro] [🟡]│
│  #14205  Civic DEF-5678      R$ 1.200,00 [PIX] [Cartão] [Dinheiro] [🟡]│
│                                                                        │
│  ➕ Adicionar OS:                                                      │
│  [ Nº OS ] [ Cliente / Carro ] [ R$ Valor ] [ Forma: PIX ▼ ] [ + Add ] │
└────────────────────────────────────────────────────────────────────────┘
```

### 2. Step 3 — 4 Cards Manuais Padronizados
```
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│ FATURAMENTO (OI) │ │ DINHEIRO MP      │ │ A RECEBER        │ │ CONTAS A PAGAR   │
│ [ 945.230,00   ] │ │ [ 1.450,00     ] │ │ [ 0,00         ] │ │ [ 12.890,00    ] │
│ 💡 Sugerido:     │ │ Ontem: R$ 1.450  │ │ Pendente         │ │ 8 contas         │
│ R$ 945.230 [Usar]│ │                  │ │                  │ │                  │
└──────────────────┘ └──────────────────┘ └──────────────────┘ └──────────────────┘
```

---

## Mutações em Arquivos Existentes [MODIFY]

### 1. `src/components/importacoes/patio/PatioManualStoreGrid.tsx`
- Reduzir padding, remover headers repetidos e unificar a visualização de filiais com um `<select>` ou pills compactas.
- Formulário inline compacto de 1 linha.
- Tabela com visual leve e botões de pagamento 1-clique sóbrios.

### 2. `src/components/importacoes/CentralImportWizard.tsx`
- Simplificar a apresentação do Step 1.5.
- No Step 3: Remover a árvore de 4 subcards da calculadora e unificar a sugestão calculada diretamente no primeiro card (Odômetro/Faturamento) com botão discreto `[ ⚡ Usar Sugestão ]`.

---

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)

### Cenário 1: Fechamento sem Planilha de OS
- **Ação:** Entrar no Step 1.5, selecionar a filial, dar baixa rápida clicando em `PIX` ou adicionar uma OS manual. Avançar para o Step 3 e clicar em `[ ⚡ Usar Sugestão ]`.
- **Resultado Esperado:** O input de faturamento é preenchido instantaneamente e a tela permanece limpa e sem poluição visual.
