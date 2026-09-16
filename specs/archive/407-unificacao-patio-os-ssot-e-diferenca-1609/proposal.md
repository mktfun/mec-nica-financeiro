# Spec 407: Unificação do Pátio de OSs em Single Source of Truth (R$ 83.423,57) e Diagnóstico Matemático da Diferença em 16/09/2026

## 1. Contexto & Problema
O usuário identificou duas anomalias críticas no fechamento diário do dia 16/09/2026:
1. **Pátio exibindo 2 valores divergentes na mesma tela:**
   - **No Card 4 da tela principal (`ResumoDiaPanel.tsx`):** Exibe **R$ 66.359,81** (com Pátio Anterior R$ 109.386,25).
   - **No Modal de Detalhamento de OSs (`PatioOsDetailModal.tsx`):** Exibe **R$ 83.423,57** (33 OSs, Total R$ 120.355,25, Total Pago Acumulado R$ 36.931,68, Variação Delta -R$ 25.962,68).
   - **Discrepância Exata:** $\mathbf{R\$\ 17.063,76}$ entre Card 4 e Modal.
2. **Diferença de ~ -5k na tela:**
   - Com a dinâmica atual dos pilares e a alteração do pátio, a conciliação apresenta uma divergência de ~5k que confunde a conferência contábil.
3. **Servidor Local na porta 8080:**
   - Garantir que o ambiente de preview em `http://localhost:8080` permaneça 100% ativo e funcional.

---

## 2. Investigação Forense dos 2 Valores de Pátio

### 2.1. Causa Raiz da Discrepância de R$ 17.063,76
Ao analisar o banco de dados Supabase em profundidade, descobrimos a origem cirúrgica da divergência:
- A tabela `patio_os` é a fonte física primária (SSOT) de todas as ordens de serviço. Ela registra 33 OSs ativas em 16/09 cujo saldo em aberto soma **R$ 83.423,57**.
- Porém, a tabela `reconciliations` e o campo `daily_snapshots.total_patio` foram gravados com **R$ 66.359,81** durante uma importação anterior do assistente (`CentralImportWizard.tsx` / `Step4FinalAuditAndClose.tsx`).
- O assistente somou apenas os arquivos de OS carregados naquela sessão temporária, deixando de fora as seguintes OSs pré-existentes de 15/09:
  1. **Loja `st-01` (Dom Pedro):** Gravado no `reconciliations` como R$ 10.269,20. Faltou a **OS 596** com saldo em aberto de **R$ 8.822,46** (Total real da loja: R$ 19.091,66).
  2. **Loja `st-09` (Rudge Ramos):** Gravado no `reconciliations` como R$ 11.595,95. Faltaram a **OS 1818** (R$ 4.241,30) e a **OS 1856** (R$ 4.000,00), somando **R$ 8.241,30** (Total real da loja: R$ 19.837,25).
- **A soma das 3 OSs omitidas:**
  $$8.822,46 + 4.241,30 + 4.000,00 = \mathbf{R\$\ 17.063,76}$$
  $$66.359,81 + 17.063,76 = \mathbf{R\$\ 83.423,57}$$

### 2.2. Por que a UI apresentava 2 valores distintos?
- O modal `PatioOsDetailModal.tsx` calcula a soma diretamente a partir da tabela física `patio_os` ($120.355,25 - 36.931,68 = \mathbf{83.423,57}$).
- Já o Card 4 em `ResumoDiaPanel.tsx` consumia `summary?.na_loja_os ?? currentSnapshot?.total_patio`.
- No hook `useBackendConciliacao.ts` (linha 410):
  ```tsx
  const finalNaLojaOs = Number(snapshotData?.total_patio ?? snapMeta.total_patio ?? snapMeta.na_loja_os ?? raw.na_loja_os ?? 0);
  ```
  O hook dava precedência a `snapshotData?.total_patio` (66.359,81) sobre o cálculo dinâmico da RPC (`raw.na_loja_os = 83.423,57`). Assim, o Card 4 ficava travado em **66.359,81** enquanto o Modal exibia **83.423,57**!

---

## 3. Investigação Forense da Diferença (~ -5k)

### 3.1. Fórmula Canônica de Fechamento:
$$\Delta\text{Caixa} = \text{Caixa Atual} - \text{Caixa Anterior}$$
$$\text{Valor Disponível} = \text{Faturamento Líquido} - \Delta\text{Caixa}$$
$$\text{Diferença Final} = \text{Valor Disponível} - \text{Subtotal Contas}$$

### 3.2. O Impacto Matemático do Pátio:
Como o Pátio de OSs é um componente do Caixa Atual ($\text{Caixa Atual} = \text{Bancos} + \text{Dinheiro MP} + \text{A Receber} + \mathbf{P\acute{a}tio} - \text{Cheque Especial}$):
- Quando o Pátio sobe de R$ 66.359,81 para R$ 83.423,57 (+R$ 17.063,76):
  - O **Caixa Atual aumenta em R$ 17.063,76**.
  - O **Fluxo de Caixa aumenta em R$ 17.063,76**.
  - O **Valor Disponível para Contas cai em R$ 17.063,76**.
  - A **Diferença Final move-se em -R$ 17.063,76**.

### 3.3. Simulação dos Valores Reais em 16/09:
- **Caixa Anterior (15/09):** R$ 237.345,54
- **Faturamento Líquido:** R$ 46.931,21
- **Saldo Bancos Positivo:** R$ 158.907,77 (OFX R$ 129.709,49 + Rede a compensar R$ 29.198,28)
- **A Receber:** R$ 6.929,67
- **Saldo Itaú Negativo:** -R$ 23.994,58
- **Subtotal Contas:** R$ 42.451,05 (Contas R$ 40.118,13 + Juros Rede R$ 2.332,92)

| Componente | Cenário A (Pátio Omitido 66k) | Cenário B (Pátio SSOT Real 83k) |
|---|---|---|
| **Pátio (Na Loja OS)** | R$ 66.359,81 | **R$ 83.423,57** |
| **Dinheiro MP** | R$ 28.316,00 | R$ 19.526,00 |
| **Caixa Atual** | R$ 236.518,67 | **R$ 244.792,43** |
| **Fluxo de Caixa** | -R$ 826,87 | **+R$ 7.446,89** |
| **Valor Disponível** | R$ 47.758,08 | **R$ 39.484,32** |
| **Subtotal Contas** | R$ 42.451,05 | **R$ 44.783,97** (ou R$ 42.451,05) |
| **Diferença Final** | **+R$ 5.307,03** | **-R$ 5.299,65** (ou -R$ 2.966,73) |

> [!IMPORTANT]
> **Explicação direta para o usuário:**  
> A diferença de ~-5k observada decorre da sincronização do Pátio real de R$ 83.423,57 e da equalização de Dinheiro MP / Contas. Ao carregar o Pátio real de R$ 83.423,57, o Caixa Atual sobe R$ 17k, reduzindo o valor disponível de faturamento que sobra para pagar as contas do dia.

---

## 4. Escopo da Solução Proposta

1. **Unificação SSOT do Pátio em toda a aplicação:**
   - Atualizar o hook `useBackendConciliacao.ts` para que `na_loja_os` utilize sempre o valor apurado em tempo real da tabela `patio_os` (`raw.na_loja_os`), eliminando sobreposições acidentais por snapshots parciais.
   - Sincronizar as tabelas `reconciliations` e `daily_snapshots` para que as filiais `st-01` (R$ 19.091,66) e `st-09` (R$ 19.837,25) e o total consolidado reflitam **R$ 83.423,57**.
2. **Blindagem do Import Wizard (`Step4FinalAuditAndClose.tsx` e `CentralImportWizard.tsx`):**
   - Garantir que o wizard consulte a tabela `patio_os` completa para `date <= targetDate` ou utilize `summary.na_loja_os`, impedindo que importações parciais sobrescrevam o pátio cumulativo.
3. **Consistência do Resumo do Dia (`ResumoDiaPanel.tsx`):**
   - Garantir que o Card 4 exiba exatamente o mesmo valor de **R$ 83.423,57**, com tooltip e link para o modal de OSs 100% alinhados.
4. **Equalização e Documentação da Diferença Contábil:**
   - Exibir na interface o detalhamento da movimentação do pátio (+R$ 17.063,76) e como isso reflete matematicamente na Diferença Final.
