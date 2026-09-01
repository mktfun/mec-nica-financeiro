# Design: Simplificação do Step 3 e Integração de OSs Ausentes no Step 4 (334)

## Arquitetura e Fluxo Visual Redesenhado

### Step 3: Entradas Manuais & Data Base (Layout Clean)
```
┌─────────────────────────────────────────────────────────────────┐
│ 📅 Data Base da Conciliação: [ 01/09/2026 ]                     │
├─────────────────────────────────────────────────────────────────┤
│ 🔢 Entradas Manuais Globais:                                    │
│  [ Odômetro OI (Acumulado) ]  [ Dinheiro MP ]                   │
│  [ A Receber ]                [ Contas a Pagar (Auto) ]         │
├─────────────────────────────────────────────────────────────────┤
│                               [ Avançar para Passo 4 → ]        │
└─────────────────────────────────────────────────────────────────┘
```

### Step 4: Gestão Integrada de OSs & Pagamentos Órfãos
```
┌─────────────────────────────────────────────────────────────────┐
│ Passo 4: Conciliação de OSs e Pagamentos                        │
│ [ Aba 1: Pagamentos Órfãos (Cartão / PIX) ] [ Aba 2: OSs Ausentes do Pátio ] │
├─────────────────────────────────────────────────────────────────┤
│ (Conteúdo da Aba Selecionada com Filtro por Filial)             │
├─────────────────────────────────────────────────────────────────┤
│ [ ← Voltar ]                                   [ Avançar → ]    │
└─────────────────────────────────────────────────────────────────┘
```

## Mutações em Arquivos Existentes [MODIFY]

- `src/components/importacoes/CentralImportWizard.tsx`:
  - Remover blocos de UI do Step 3: Previsão por Loja, `DiagnosticPanel`, `MissingPatioOsEditor` inline e Inspetor JSON.
  - Repassar `missingOsList` e `setMissingOsList` via props para `<Step1UnregisteredPayments />` no Step 4.
- `src/components/importacoes/wizard/Step1UnregisteredPayments.tsx`:
  - Adicionar controle de sub-abas (`activeSubTab: 'payments' | 'missing_os'`).
  - Renderizar `<MissingPatioOsEditor />` quando a sub-aba "OSs Ausentes do Pátio" estiver selecionada.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1 (Step 3 Clean):** Ao passar do Step 2 para o Step 3, a tela exibe exclusivamente a Data Base e os 4 cards de inputs manuais com visual limpo e rápido.
- **Cenário 2 (Step 4 Integrado):** No Step 4, o operador pode alternar entre "Pagamentos Órfãos" e "OSs Ausentes do Pátio", realizar baixas e ajustes em OSs pendentes, e as alterações são mantidas no fechamento.
