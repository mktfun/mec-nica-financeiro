﻿# Proposta: CorreçÁo Matemática do Dashboard e Resumo do Dia (115)

## Entendimento do Problema
O usuário relatou divergências nos cálculos da interface do sistema, apontando especificamente dois problemas:

1. **NA LOJA OS (Pátio)**: Está mostrando ~18k, mas deveria ser ~53k.
   - **Causa**: No get_dashboard_metrics global (RPC), o cálculo está somando diretamente a tabela patio_os. No entanto, como definido nas features anteriores, a métrica de pátio pendente (Na Loja) usa **carry-over** histórico salvo na tabela econciliations (coluna 
a_loja_os). O RPC nÁo estava aplicando essa mesma lógica agregada, resultando na perda de dívida legada (que soma os 53k).
2. **TAXAS/JUROS / DESPESAS OFX**:
   - **Causa**: O usuário apontou que os descontos importados do OFX (as contas negativas, que totalizam 1018) nÁo estÁo aparecendo somados ao card superior no painel de ConciliaçÁo. O painel está exibindo unicamente juros_rede (681,48). As despesas do OFX sÁo de fato repassadas para o cálculo base como contasAPagarAutomatico, mas a interface visual (ResumoDiaPanel.tsx) isolou o card superior apenas para Juros.

## SoluçÁo Proposta

### 1. CorreçÁo no RPC get_dashboard_metrics (Backend)
Iremos atualizar o RPC get_dashboard_metrics para espelhar a lógica de herança de saldo já utilizada no ank_total.
Para calcular o valor agregado de _na_loja, o sistema vai buscar o último 
a_loja_os consolidado de cada loja na tabela econciliations. Só se nÁo houver um snapshot histórico ele fará o fallback para a soma do patio_os.

### 2. Ajuste de UI no ResumoDiaPanel.tsx (Frontend)
Iremos modificar o bloco visual de \TAXAS/JUROS\ no frontend para \DESPESAS / JUROS\.
O valor numérico exibido passará a ser a soma de:
\inputForCalculation.juros_rede + contasAPagarAutomatico\ (que é o Math.abs(totalOfxOut)).
Isso deixará claro para o usuário que tanto as despesas bancárias importadas via OFX quanto as taxas de maquininha estÁo somadas naquele bloco superior, unificando a experiência.

## Riscos
- Modificar o get_dashboard_metrics afeta o gráfico principal, mas essa mudança garante a paridade de cálculo entre a conciliaçÁo individual de lojas (que já faz o carry-over) e o sumário executivo.
