# Design: Simplificação e Foco do Step 3 do Wizard de Importação nos Inputs Manuais (337)

## Arquitetura e Fluxo de Dados

```
[Arquivos Ingeridos e Mapeados (Step 1 e 2)]
                    ↓
[Step 3: Ingestão Global & Inputs Manuais do Dia]
  ├── Resumo Macro: Total OSs | Maquininha (Rede) | Extratos OFX
  ├── Inputs Manuais: Odômetro OI | Dinheiro MP | A Receber | Contas a Pagar
  ├── Trava de Segurança (isManualLocked) & Data Base
  └── Inspetor JSON Payload
                    ↓ (Clique: "Processar e Conciliar com IA →")
[handleConfirm / Motor Automático de Conciliação]
  ├── Inserção em Lote (Transactions, Receivables, Patio OS, Daily Bills)
  ├── RPC auto_match_transactions & auto_match_saidas
  ├── Reconciliação Pericial Gemini (llm-matcher)
  └── Cálculo Daily Reconciliation
                    ↓
[Esteira Focada de Resolução do Fechamento]
  ├── Step 4: Vínculo 1-Clique de Pagamentos sem OS (Step1UnregisteredPayments)
  ├── Step 5: Justificativas de Entradas & Saídas Órfãs (Step2NonRevenueJustifications)
  ├── Step 6: Conferência do Cofre das Lojas / Daniel (Step3CashVaultDaniel)
  └── Step 7: Auditoria Final dos 5 Pilares & Selamento (Step4FinalAuditAndClose)
```

## Interfaces TypeScript
Os tipos existentes no `CentralImportWizard.tsx` permanecem inalterados:
```typescript
export interface ImportLogEntry {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

export interface MissingPatioOsEdit {
  id: string;
  os_number: string;
  plate: string;
  store_id: string;
  store_name: string;
  original_total_value: number;
  original_paid_value: number;
  original_status: string;
  total_value: number;
  paid_value: number;
  status: string;
  opened_at?: string;
  days_open?: number;
}
```

## Mutações em Arquivos Existentes `[MODIFY]`

### `src/components/importacoes/CentralImportWizard.tsx`
- **Linhas 2207–2347:**
  - Remover renderização de `<MissingPatioOsEditor />`
  - Remover renderização de `<DiagnosticPanel />`
  - Remover header e aviso anti-zero de previsão por loja
  - Remover loop de cards por loja `{stores.map(...)}`
  - Remover banner de contas analíticas `{results.contasPagarResults && ...}`
- **Linhas 2350–2445:**
  - Manter container de valores manuais com grid responsivo de 4 cards no padrão Dark UI Zinc-950
- **Imports:**
  - Limpar imports não utilizados (`Layers`, etc.) mantendo a compilação estrita

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)

### Cenário 1: Visualização Limpa e Focada do Step 3
- **Estado Inicial:** Operador realizou o upload dos arquivos OFX, Rede, OS e Contas e confirmou o mapeamento (Step 2).
- **Ação:** Avançar para o Step 3.
- **Resultado Esperado:**
  - A tela exibe os 3 cards macro de resumo (Total OS, Maquininha, Saldo OFX).
  - A tela NÃO exibe a tabela massiva de OSs ausentes nem os 10 cards repetitivos de filiais.
  - A tela exibe diretamente o painel de **Valores Manuais do Dia** com os 4 inputs (`Odômetro Hoje`, `Dinheiro MP`, `A Receber`, `Contas a Pagar`), o seletor de Data Base e o botão destacado "Processar e Conciliar com IA →".

### Cenário 2: Execução do Motor de Conciliação e Avanço
- **Estado Inicial:** Inputs manuais preenchidos e travados.
- **Ação:** Clicar em "Processar e Conciliar com IA →".
- **Resultado Esperado:**
  - O modal do Agente / Processamento roda normalmente sem erros.
  - Todas as transações, OSs e contas são gravadas e o assistente transiciona fluidamente para o Step 4 (Vínculo de Pagamentos sem OS).
