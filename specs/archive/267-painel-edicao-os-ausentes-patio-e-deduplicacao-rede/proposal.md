# Proposal: Motor de OSs Ausentes no Pátio, Sincronização Granular de OSs e Deduplicação da Rede (267)

## Problema

1. **OSs do Pátio Desatualizadas e Falha no Motor de Detecção de OSs Ausentes:**
   - Atualizar apenas o número macro do snapshot não sincroniza as OSs individuais em `patio_os`.
   - No Step 3 da importação, o sistema exibe centenas de OSs vindas dos arquivos importados, mas **oculta as OSs que NÃO vieram nos relatórios de pátio** (veículos que estavam no pátio no fechamento anterior e não constam no arquivo de hoje).
   - O operador fica sem conseguir editar o valor total, valor pago ou dar baixa nas OSs que saíram do pátio, gerando uma divergência persistente no pilar "Na Loja (Pátio)".

2. **Transação Duplicada da Rede e Falso Positivo em Santo André (R$ 2.588,37):**
   - No dia 24/08, a transação da Rede de Santo André (`Bruto: R$ 2.850,00 | Líquido: R$ 2.588,37`) foi importada duas vezes em `pos_transactions`.
   - Isso inflou a soma da Rede para R$ 7.518,62 (quando o correto era R$ 4.930,25).
   - O sistema comparou com os R$ 4.930,25 do OFX e acusou erroneamente que "R$ 2.588,37 não entrou", gerando carry-over falso de valores a compensar e descalibrando os saldos.

## Solução Proposta

1. **Motor & Painel de OSs Ausentes no Step 3 (`CentralImportWizard.tsx`):**
   - Comparar o estoque ativo de `patio_os` contra as OSs importadas nos arquivos de hoje para cada loja.
   - Exibir no Step 3 uma seção de ação imediata: **"⚠️ OSs que Não Vieram nos Relatórios de Hoje (Ajuste Manual)"**.
   - Permitir ao operador:
     - Editar inline o **Valor Total da OS (R$)** e o **Valor Pago (R$)**.
     - Selecionar ação rápida por linha ou em lote: `Dar Baixa (Quitada/Entregue)`, `Permanece no Pátio`, `Ajustar Valor`.
     - Atualizar o saldo em tempo real antes da consolidação.

2. **Sincronização Granular de todas as OSs em `patio_os` (Dia 24/08):**
   - Sincronizar todas as OSs individuais no banco `patio_os` de acordo com a aba `OS` do Excel oficial (Planalto: R$ 27.743,80, Piraporinha: R$ 2.820,00, Mauá: R$ 9.890,50, Santo André: R$ 9.218,73, Rei do Módulo: R$ 11.170,00, Jorge Beretta: R$ 3.515,12, Dom Pedro: R$ 6.954,00, Jabaquara: R$ 6.039,60 -> Totalizando **R$ 88.212,39** exatos).

3. **Limpeza e Blindagem de Deduplicação da Rede (`pos_transactions`):**
   - Deletar a duplicata de R$ 2.588,37 em `pos_transactions` para Santo André.
   - Implementar deduplicação estrita na importação da Rede (chave única baseada em data, loja, valor bruto, valor líquido e NSU/TID) para impedir inserções duplicadas.
   - Garantir que `get_store_pos_triple_reconciliation` retorne Santo André e demais lojas com `nao_entrou_valor = 0` e `status = 'entrou'`.

## Contratos de Dados

- `patio_os`: Atualização individual das OSs por loja com valores totais, pagos e status.
- `pos_transactions`: Remoção de duplicatas e índice único para idempotência.

## Risco Principal

Sobrescrever pagamentos manuais em OSs abertas. Mitigado preservando o histórico de pagamentos já registrados e exibindo o delta visual no editor.
