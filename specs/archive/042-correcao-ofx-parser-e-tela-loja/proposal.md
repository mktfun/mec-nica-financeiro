# Spec 042 — CorreçÁo OFX Parser + Tela Financeira da Loja

## Problema
Após a implantaçÁo da Spec 041 (OFX como fonte da verdade), três problemas emergiram:

### 1. Parser OFX importa saldo informativo como transaçÁo real
O arquivo OFX dos bancos brasileiros (Sicredi, Itaú, BB) frequentemente emite entradas do tipo CREDIT com MEMO "SALDO ANTERIOR" ou "SALDO TOTAL DISPONÍVEL DIA". Esses registros sÁo **saldo de extrato**, nÁo transações. EstÁo inflando artificialmente Entradas e divergências.

### 2. OFX nÁo mapeia conta bancária → Loja
O parser usa `"BANCO - CONTA"` como `storeName`. O Wizard de OFX nÁo tem passo de mapeamento (como o de Despesas tem). Resultado: todas as transações caem sem `store_id` e o gráfico exibe conta bancária ao invés do nome da loja.

### 3. Tela da Loja exibe "Entradas sem OS Vinculada" (paradigma antigo)
Com a nova filosofia de OFX como fonte da verdade, entradas bancárias NÁO devem ser vinculadas a uma OS. A seçÁo de divergências precisa ser redesenhada para mostrar: **OFX (Banco) vs Sistema (Pátio + Maquininha - Despesas)**.

## BDD Scenarios

### Cenário: Filtro de saldo do OFX
- **Given:** O arquivo OFX tem um bloco `<STMTTRN>` com MEMO "SALDO ANTERIOR" e TRNTYPE "CREDIT"
- **When:** O usuário faz upload do OFX no Wizard
- **Then:** Esse registro é ignorado e NÁO aparece na lista de transações a importar

### Cenário: Mapeamento de conta bancária para loja
- **Given:** O OFX tem ACCTID "3385988047"
- **When:** O Wizard processa o arquivo (Passo 2)
- **Then:** Aparece uma tela de mapeamento idêntica à de Despesas onde o usuário seleciona qual loja corresponde a essa conta bancária. O mapeamento é memorizado no localStorage.

### Cenário: Tela da Loja sem divergências falsas
- **Given:** O usuário importou OFX de R$ 124.248,94 para a Loja Jorge Bereta
- **When:** Ele abre a tela financeira da loja
- **Then:** A seçÁo "Divergências" mostra: Extrato Banco R$ 124.248,94 | Apurado Sistema R$ X | Diferença R$ Y. Sem mençÁo a "OS Vinculada".
