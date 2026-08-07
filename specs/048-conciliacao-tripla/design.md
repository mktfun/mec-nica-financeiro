# Design - ConciliaçÁo Tripla e Juros

## UI / UX (VisÁo 2026)
1. **Configurações de Juros:**
   - Adicionar à aba `/configuracoes` uma nova seçÁo (Card de vidro, *Liquid Glass*) chamada "Políticas de Taxas".
   - Formulário para definir: Forma de Pagamento (ex: Crédito) x Acréscimo (%).
2. **Tela de Detalhes da Loja (`/loja/$lojaId`):**
   - No topo, um Header Minimalista exibindo a loja e o dia.
   - Um Grid ou Tabela estilo *Data Grid* com colunas bem delineadas:
     - `Info`: Nome do Cliente / OS.
     - `Valor Original (OS)`
     - `Valor Calculado (c/ Juros)`
     - `Registrado Maquininha (D+1)`
     - `Caiu no Extrato (OFX)`
     - `Status` (Badges Pill: Match Perfeito, Pendente, Falha).

## Modelagem de Dados (Supabase)
1. Tabela `interest_rates` (Nova):
   - `id` (UUID)
   - `payment_method` (string - ex: 'CartÁo de Crédito 10x')
   - `rate_percentage` (numeric - ex: 15.0)
   - `created_at`
2. **Ajuste na Lógica de InserçÁo de Transactions:**
   - As transações oriundas das OSs já guardam o `payment_method`.
   - O algoritmo de match (no front-end ou banco) fará um `LEFT JOIN` ou cruzamento no JavaScript buscando o valor que consta na maquininha.

## Fluxo Lógico do Algoritmo "Triple Match":
Para um determinado `target_date`:
1. Busca todas as `transactions` da Loja onde `target_date = X` (ou `occurred_at = X`).
2. Agrupa elas usando heurísticas de aproximaçÁo (valores idênticos após aplicaçÁo de juros).
3. Transações de `source='ofx'` tentam achar pares em `source='maquininha'` e `source='patio'`.
