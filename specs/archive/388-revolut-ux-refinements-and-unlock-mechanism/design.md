# Design: Refinamentos Revolut UX, Contraste Cromático e Mecanismo de Desbloqueio de Transações D-1 (388)

## 1. Arquitetura e Fluxo de Dados

```
[Usuário no Extrato (StoreExtratoBancarioView)]
         │
         ├──► Identifica Débito (-) em Rose / Crédito (+) em Emerald
         │
         ├──► Visualiza Nome Limpo (sem repetições do banco e sem badges gigantes)
         │
         ├──► Transação de D-1 que caiu pós-fechamento
         │          │
         │          ├──► Botão [Mover p/ Hoje] 
         │          │         ▼
         │          │     Atualiza target_date = '2026-09-09' em transactions e ofx_transactions
         │          │     Invalida React Query caches
         │          │         ▼
         │          │     Transação computa no Faturamento e Conciliação de Hoje!
         │          │
         │          └──► Botão [Vincular OS] ou [Editar]
         │                    ▼
         │                Abre ManualMatchOsModal / OrphanCategorizationModal
```

## 2. Higienização Inteligente de Títulos (De-duplicação)

```typescript
export function sanitizeTransactionTitle(rawTitle: string, subtitle?: string, fitid?: string): string {
  let cleaned = (rawTitle || '').trim();

  // Caso especial: traço '-' ou vazio com fitid descritivo
  if (!cleaned || cleaned === '-' || cleaned === '—') {
    if (fitid && fitid.includes('juroslimitedaconta')) return 'Juros Limite da Conta Itaú';
    if (fitid && fitid.includes('sispag')) return 'Pagamento Fornecedores (Sispag)';
    if (subtitle) return subtitle.trim();
    return 'Lançamento Bancário';
  }

  // Remove prefixos bancários comuns
  cleaned = cleaned.replace(/^(BOLETO PAGO|PIX ENVIADO|PIX RECEBIDO|RECEBIMENTOS?|PAGAMENTOS?|SISPAG SALARIOS)s+/i, '');

  // Detecta e remove repetições no início do memo bancário do Itaú
  // Ex: 'AUTO PECAS L AUTO PECAS LUDIO...' -> 'AUTO PECAS LUDIO...'
  const words = cleaned.split(/\s+/);
  if (words.length >= 4) {
    for (let len = 1; len <= 3; len++) {
      const prefix = words.slice(0, len).join(' ');
      const rest = words.slice(len);
      if (rest.join(' ').toLowerCase().startsWith(prefix.toLowerCase())) {
        cleaned = rest.join(' ');
        break;
      }
    }
  }

  return cleaned;
}
```

## 3. Esquema de Cores Revolut

- **Débito / Saída:**
  - Avatar: `bg-rose-500/10 border-rose-500/20 text-rose-400` com `<ArrowUpRight size={18} />` ou ícone específico em rose.
  - Valor: `text-rose-400 font-mono font-bold text-sm` (`- R$ 490,50`).
- **Crédito / Entrada:**
  - Avatar: `bg-emerald-500/10 border-emerald-500/20 text-emerald-400` com `<ArrowDownLeft size={18} />` ou `CreditCard` azul para lotes.
  - Valor: `text-emerald-400 font-mono font-bold text-sm` (`+ R$ 3.000,00`).

## 4. Mutações em Arquivos Existentes [MODIFY]

- `src/components/conciliacao/StoreExtratoBancarioView.tsx`:
  - Implementar `sanitizeTransactionTitle`.
  - Ajustar `renderSquircleAvatar` para usar semanticamente rose em todas as saídas e emerald em entradas.
  - Ajustar cor do texto de saídas para `text-rose-400` (alto contraste).
  - Remover os badges gigantes `[CONTA: ...]` e `[TRANSFERÊNCIA ENTRE LOJAS]` da linha do título; movê-los para o subtítulo/metadados.
  - Substituir `🔒 Leitura` estrito por botões interativos `[Mover p/ Hoje]`, `[Vincular OS]` e `[Editar]`.
  - Criar função `handleMoveToTargetDate(txId)` que altera `target_date` e invalida caches.

## 5. Cenários de Verificação

- **Cenário 1 (Visual):** Acessar a tela e constatar que todas as saídas estão destacadas em vermelho/rose e entradas em verde, sem badges concorrendo com o título.
- **Cenário 2 (Desbloqueio):** Na transação de R$ 300 ou R$ 3.000 de ontem, clicar em `[Mover p/ Hoje]` ou `[Vincular OS]` e constatar que o modal de OS abre ou a transação passa a compor o dia de hoje sem erro.
