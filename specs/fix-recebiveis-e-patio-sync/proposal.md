# 📋 SDD Proposal: Sincronização de Pátio, Recebíveis e Parcelamento de Boletos

## 1. Problema Diagnosticado

### A. Carros em Pátio — Esclarecimento Definitivo das Diferenças
O usuário apontou divergências entre as planilhas locais do Desktop (`C:\Users\admin\Desktop\conciliacao\09-26\17-09`) e o sistema nas lojas Santo André (-R$ 2.000,00), Rei do Módulo (-R$ 200 a -R$ 380), Dom Pedro (+R$ 20) e Jabaquara (~-R$ 400 a -R$ 2.028).

**Diagnóstico Pericial Comprovado:**
- As planilhas locais na pasta `17-09` possuem carimbo de geração de **08:37 da manhã**.
- O banco de dados do sistema (`patio_os`) já contém a importação consolidada das **19:00 (encerramento do expediente noturno)**.
- **Santo André:** A OS 2439 (EDINEIA TEIXEIRA BRITO) estava aberta às 08:37 com saldo de R$ 2.000,00 pendente. Às 19:00 ela foi quitada e faturada (R$ 6.000 pagos), saindo do pátio com legitimidade contábil.
- **Jabaquara:** A OS 421 (R$ 1.352 pendente) foi concluída durante o dia e a OS 416 recebeu amortização de R$ 2.028 via PIX, reduzindo o saldo de R$ 2.523,58 para R$ 495,58.
- **Rei do Módulo:** A OS 1886 teve amortização de R$ 200 ao longo do dia (saldo caiu de R$ 3.290 para R$ 3.090).
- **Conclusão:** O total de **R$ 74.433,57** (com saldo líquido pendente apurado em banco de **R$ 72.405,57**) está **100% correto** e reflete com exatidão o fechamento noturno das 19h. **NÃO deve ser alterado**.

### B. Tela de Recebíveis Zerada e Sem Lançamentos
- Em `src/routes/recebiveis.tsx` (linha 45), o estado `targetDate` está hardcoded como `'2026-08-25'`:
  `const [targetDate, setTargetDate] = useState<string>(() => '2026-08-25');`
- O hook `useReceivablesByDate(targetDate)` filtra `.lte('date', targetDate)`. Como `targetDate` iniciava em 25/08/2026, a tela abre completamente vazia para qualquer competência de setembro/2026.

### C. Parcelas, Boletos e Valores para Não Dar Diferença em Recebíveis
- **Misto de Pagamento (Entrada + Boleto):** Se uma OS tiver `PIX: 500.00; Boleto: 1500.00`, o recebível deve ser gerado estritamente para os R$ 1.500,00 do boleto (e não sobre o total da OS de R$ 2.000,00), caso contrário haverá duplicidade de receita com o PIX que já entra no extrato bancário do dia.
- **Divisão de Parcelas:** Quando há parcelamento (ex: `Boleto 2x`, `30/60`, `30/60/90`), cada parcela $i$ de $N$ deve ser gerada individualmente com seu respectivo vencimento (`calculateDueDate`) e centavos ajustados na última parcela ($\sum = \text{total do boleto}$).
- **Status de Criação:** Mesmo que a OS esteja com status "Finalizada" (carro liberado da oficina), o título a prazo deve nascer como `status: 'pendente'` e `paid_value: 0`, sendo baixado apenas no recebimento do crédito bancário no OFX via `auto_match_receivables` ou baixa manual.

---

## 2. Solução Proposta

1. **Frontend (`/recebiveis`):**
   - Substituir a inicialização hardcoded de `targetDate` em `src/routes/recebiveis.tsx` para `getDefaultDate()` (data da conciliação corrente).
   - Ajustar o hook `useReceivablesByDate` para que na visualização de títulos em aberto e todas as abas considere títulos vigentes sem cortes acidentais de data.
2. **Ingestão e Processamento de OS (`useOsImportProcessor.ts`):**
   - Refinar a extração de boletos com suporte a formatos compostos (`PIX + Boleto`, `Entrada + Boleto Nx`), isolando o valor líquido a prazo.
   - Gerar parcelas numeradas (`1/N`, `2/N`, ..., `N/N`) com datas úteis via `calculateDueDate`.
   - Garantir que a soma exata das parcelas bata ao centavo com o valor faturado a prazo.
3. **Preservação do Pátio SSOT:**
   - Manter a regra contábil do Pátio em `patio_os` intacta, confirmando os R$ 74.433,57 das 19h como fonte oficial da verdade.

---

## 3. Skills Especializadas Aplicadas

- `frontend-design-pro`: Padrões do Design System Shadcn Zinc-950, micro-interações e empty states.
- `backend-patterns`: Tratamento determinístico de mutações e invalidação de cache do TanStack Query.
- `database`: Utilização das tabelas `receivables`, `patio_os` e da RPC `auto_match_receivables`.

---

## 4. Contratos de Dados

### Tabela `receivables`:
- `store_id`: ID ou UUID da filial.
- `store_name`: Nome formatado da filial.
- `os_number`: Número da OS vinculada.
- `installment`: String de parcela (ex: `'1/2'`, `'2/2'`).
- `description`: Descrição canônica (ex: `'OS #40369 - Boleto (1/1)'`).
- `type`: `'Boleto' | 'Transferência' | 'Cheque' | 'Cartão' | 'Outros'`.
- `value`: Valor nominal da parcela (`numeric(15,2)`).
- `paid_value`: Valor efetivamente recebido (`numeric(15,2)`).
- `status`: `'pendente' | 'recebido' | 'vencido' | 'cancelado'`.
- `date`: Data de emissão/competência (`date`).
- `due_date`: Data de vencimento bancário útil (`date`).
- `matched_ofx_id`: UUID da transação OFX que liquidou o título.

---

## 5. Arquivos Afetados

### [Arquivos Existentes Reutilizados/Modificados]
- `src/routes/recebiveis.tsx`: Correção de `targetDate` para `getDefaultDate()` e sincronização de query.
- `src/hooks/useRecebiveis.ts`: Refinamento de busca e derivação de status temporal.
- `src/hooks/useOsImportProcessor.ts`: Refinamento de cálculo de parcelas de boleto e segregação de pagamentos mistos.
- `src/hooks/useImportProcessor.ts`: Robustez no salvamento de recebíveis (`savePatioOsAndReceivables`).

### [Arquivos Novos]
- Nenhum.

---

## 6. Plano de Rollback

Em caso de divergência ou falha no typecheck/build:
```bash
git checkout -- src/routes/recebiveis.tsx src/hooks/useRecebiveis.ts src/hooks/useOsImportProcessor.ts src/hooks/useImportProcessor.ts
```

---

## 7. Risco Principal e Mitigação

- **Risco:** Duplicidade de parcelas se a mesma OS for importada múltiplas vezes.
- **Mitigação:** A chave de idempotência `store_id + os_number + installment + type` já existente em `savePatioOsAndReceivables` atualiza o registro em vez de duplicar.
