# Research: Diagnóstico Profundo de ConciliaçÁo e Ajustes de Saldo

## Escopo do Problema
O usuário relatou três problemas graves no fluxo financeiro:
1. **ImportaçÁo Nula:** Ao importar lotes de OFX e Maquininha pela tela da "Universal Dropzone", os dados sÁo mapeados na UI, mas nÁo entram no banco, resultando em "Extrato Bancário: R$ 0,00".
2. **Divergência Cega:** A tela Global de ConciliaçÁo aponta divergências (ex: R$ 385,00) baseadas na diferença crua (`Apurado Sistema - Extrato Bancário`) sem detalhar a composiçÁo do Apurado Sistema. O usuário fica sem saber quais OSs causam a divergência.
3. **Falso-Positivo de 60 mil (Ajuste de Saldo):** O botÁo de "Ajustar Saldo Real da Conta" gera uma transaçÁo manual com subtítulo `Ajuste de Saldo Inicial`. Como nÁo possui `os_number` atrelado, o motor do dashboard classifica essa transaçÁo como `Entradas sem OS vinculada` e a rotula imediatamente como uma "Divergência Crítica". Além disso, importar dados retroativos *após* esse ajuste distorce o saldo atual.

## Análise de Código (Findings)

### 1. Falso-Positivo no Ajuste de Saldo (Dashboard da Loja)
- **Local:** `src/routes/loja.$lojaId.tsx:212`
- **Código:** `const txSemOS = transactions.filter((tx: any) => tx.type === 'in' && !tx.os_number);`
- **Diagnóstico:** A transaçÁo do tipo "in" inserida pelo Ajuste de Saldo possui `subtitle: 'Ajuste de Saldo Inicial'`, mas nÁo possui `os_number`. Isso aciona a heurística de inconsistência financeira. 
- **SoluçÁo:** Filtrar transações de ajuste explícito: `tx.subtitle !== 'Ajuste de Saldo Inicial'`.
- **PrevençÁo de CorrupçÁo Retroativa:** Orientar o fluxo ideal no Frontend: sempre importar todos os extratos retroativos ANTES de ajustar o saldo atual, ou usar o botÁo já existente `Zerar Ajustes` e lançar o ajuste de saldo final no fechamento do dia.

### 2. O Dropzone que Esquece de Salvar (WizardImportacao)
- **Local:** `src/components/importacoes/WizardImportacao.tsx`
- **Diagnóstico:** O componente foi arquitetado para guiar a experiência de mapeamento de Lojas (De-Para), mas o evento final do Step 3 aciona o handler `onSuccess()` sem despachar nenhuma mutaçÁo pro Supabase (`useProcessImportedData`). A "Central de Fechamento Massivo" virou apenas uma UI decorativa para OFX e Maquininhas.
- **SoluçÁo:** Substituir `onSuccess` pelo acionamento do `useProcessImportedData` (ou análogo) que pegue o estado `extractedItems` e insira as transações nas devidas tabelas (extrato para OFX/Maquininha).

### 3. Divergência Cega (ConciliaçÁo Global)
- **Local:** `src/routes/conciliacao.tsx`
- **Diagnóstico:** O card da loja apenas exibe: `Apurado Sistema (sys)` vs `Extrato Bancário (bank)` e a `Divergência`. NÁo diz quais transações originaram o `sys`.
- **SoluçÁo:** Implementar um pequeno botÁo "Ver ComposiçÁo" que, via Tooltip ou expander, liste as OSs processadas no dia ou leve ao Dashboard da Loja na aba "Físico / Sistema", proporcionando rastreabilidade visual do R$ 385.
