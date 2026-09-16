# Design Técnico — Spec 407: Unificação do Pátio de OSs (SSOT) e Equalização Contábil de 16/09/2026

## 1. Arquitetura de Dados & Hierarquia SSOT

### 1.1. O Pátio Canônico (`patio_os` como Fonte Primária)
```
┌────────────────────────────────────────────────────────┐
│                   TABELA patio_os                      │
│ (33 OSs abertas com saldo > 0 em 16/09 = R$ 83.423,57) │
└──────────────────────────┬─────────────────────────────┘
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
┌─────────────────────────┐ ┌─────────────────────────┐
│ RPC Backend             │ │ PatioOsDetailModal      │
│ get_daily_reconciliat...│ │ (Modal de Detalhamento) │
│ -> raw.na_loja_os:      │ │ -> R$ 83.423,57         │
│    R$ 83.423,57         │ └─────────────────────────┘
└────────────┬────────────┘
             ▼
┌─────────────────────────┐
│ useBackendConciliacao   │
│ (Hook Reativo)          │
│ -> summary.na_loja_os:  │
│    R$ 83.423,57         │
└────────────┬────────────┘
             ▼
┌─────────────────────────┐
│ ResumoDiaPanel (Card 4) │
│ -> R$ 83.423,57         │
└─────────────────────────┘
```

### 1.2. Regras de Precedência no Hook `useBackendConciliacao.ts`
- **Problema Atual:**
  `const finalNaLojaOs = Number(snapshotData?.total_patio ?? snapMeta.total_patio ?? snapMeta.na_loja_os ?? raw.na_loja_os ?? 0);`
  Se `snapshotData.total_patio` contiver um valor defasado/parcial gravado anteriormente (ex.: 66.359,81), ele mascara o valor real da RPC (`raw.na_loja_os = 83.423,57`).
- **Novo Design:**
  ```tsx
  // Se o dia não estiver fechado E auditado, ou se a RPC retornar o somatório real das OSs ativas,
  // priorizamos a apuração física do pátio para garantir SSOT:
  const livePatio = Number(raw.na_loja_os || 0);
  const snapPatio = Number(snapshotData?.total_patio ?? snapMeta.total_patio ?? 0);
  const finalNaLojaOs = livePatio > 0 ? livePatio : snapPatio;
  ```

---

## 2. Componentes Afetados & Mudanças

### 2.1. Frontend Hook: `src/hooks/useBackendConciliacao.ts`
- Modificar o cálculo de `finalNaLojaOs` para priorizar a soma dinâmica da RPC `raw.na_loja_os`.
- Propagar `finalNaLojaOs` nos campos `na_loja_os` e `total_patio` do payload retornado.

### 2.2. Assistente de Importação & Fechamento:
- `src/components/importacoes/wizard/Step4FinalAuditAndClose.tsx`:
  - Não confiar apenas em `results?.osFiles` da sessão temporária para computar `patioSum`.
  - Utilizar `Number(summary?.na_loja_os || 0)` como valor canônico principal de pátio acumulado.
- `src/components/importacoes/CentralImportWizard.tsx`:
  - Assegurar que o pátio de filiais que não tiveram arquivos novos na sessão seja mantido com base nas OSs ativas de `patio_os`.

### 2.3. Sincronização no Banco de Dados (Supabase Data Sync):
- Atualizar a tabela `reconciliations` para a data `2026-09-16`:
  - Filial `st-01` (Dom Pedro): `na_loja_os = 19091.66` (incluindo OS 596 de R$ 8.822,46).
  - Filial `st-09` (Rudge Ramos): `na_loja_os = 19837.25` (incluindo OS 1818 de R$ 4.241,30 e OS 1856 de R$ 4.000,00).
- Atualizar a tabela `daily_snapshots` para `2026-09-16`:
  - `total_patio = 83423.57` (em vez de 66.359,81).

---

## 3. Análise da Diferença Contábil e Parâmetros de Fechamento

### 3.1. Reconciliação Matemática dos 5 Pilares em 16/09:
1. **Caixa Anterior (15/09/2026):** R$ 237.345,54
2. **Caixa Atual (16/09/2026):**
   - Saldo Bancos Positivo: R$ 158.907,77 (OFX R$ 129.709,49 + Rede a compensar R$ 29.198,28)
   - Dinheiro MP: R$ 19.526,00 (ou R$ 28.316,00)
   - A Receber Manual: R$ 6.929,67
   - **Na Loja OS (Pátio SSOT): R$ 83.423,57**
   - Saldo Negativo Itaú: -R$ 23.994,58
   - **Total Caixa Atual:** $158.907,77 + 19.526,00 + 6.929,67 + 83.423,57 - 23.994,58 = \mathbf{R\$\ 244.792,43}$
3. **Fluxo de Caixa:**
   - $\Delta\text{Caixa} = 244.792,43 - 237.345,54 = \mathbf{+R\$\ 7.446,89}$
4. **Valor Disponível para Contas:**
   - Faturamento Líquido: R$ 46.931,21
   - $V_{\text{disp}} = 46.931,21 - 7.446,89 = \mathbf{R\$\ 39.484,32}$
5. **Subtotal de Contas:**
   - Contas Pagas: R$ 40.118,13
   - Juros Rede: R$ 2.332,92
   - Subtotal Contas: $\mathbf{R\$\ 42.451,05}$
6. **Diferença:**
   - $\text{Diferen\c{c}a} = 39.484,32 - 42.451,05 = \mathbf{-R\$\ 2.966,73}$
   *(Se considerado o subtotal com repasse adicional de juros de R$ 44.783,97: $\text{Diferen\c{c}a} = 39.484,32 - 44.783,97 = \mathbf{-R\$\ 5.299,65}$)*

### 3.2. Estratégia de Ajuste e Fechamento:
Apresentar ao usuário com total transparência a decomposição para que ele valide se:
- O Dinheiro MP de 16/09 é R$ 19.526,00 ou R$ 28.316,00.
- As contas pagas são R$ 40.118,13 ou R$ 42.451,05.
- A divergência residual seja equalizada via ajuste contábil ou confirmada como real do dia.
