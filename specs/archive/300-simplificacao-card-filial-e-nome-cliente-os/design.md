# Design: Simplificação do Card de Filial e Nome do Cliente na Importação de OS com Match Inteligente (300)

## Arquitetura Técnica

```
[Planilha OS .xls / .xlsx]
      │
      ▼
[useOsImportProcessor.ts / useImportProcessor.ts] ──> Mapeia coluna 'Cliente' -> client_name
      │
      ▼
[Supabase: patio_os (client_name)] ──> Persiste o nome real do cliente
      │
      ├──────────────────────────────────────────┐
      ▼                                          ▼
[useManualMatch.ts]                     [StoreOrdensServicoView.tsx]
      │                                 Exibe nome do cliente e placa
      ▼
[ManualMatchOsModal.tsx]
  ├── Coluna CLIENTE / PLACA com Nome em destaque
  └── Score Inteligente (Fuzzy Token Match de Contraparte PIX ⇄ Cliente OS)
```

---

## Modificações Visuais

### 1. Card de Filial (`conciliacao.index.tsx` & `conciliacao.$lojaId.tsx`)
```tsx
{/* 1. SALDO TOTAL */}
<div>
  <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1">
    SALDO TOTAL
  </span>
  <p className={`font-bold text-sm sm:text-base font-mono ${(log.saldo_banco || 0) < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
    <AnimatedNumber value={log.saldo_banco || 0} format="currency" />
  </p>
</div>
```

### 2. Algoritmo de Similaridade por Nome (`ManualMatchOsModal.tsx`)
```ts
function computeNameMatchScore(txCounterpart: string, clientName: string): number {
  if (!txCounterpart || !clientName) return 0;
  
  const normalize = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, " ").trim();
  const txWords = normalize(txCounterpart).split(/\s+/).filter(w => w.length > 2);
  const clientWords = normalize(clientName).split(/\s+/).filter(w => w.length > 2);
  
  let matchCount = 0;
  for (const cw of clientWords) {
    if (txWords.some(tw => tw.includes(cw) || cw.includes(tw))) {
      matchCount++;
    }
  }
  return clientWords.length > 0 ? (matchCount / clientWords.length) : 0;
}
```

---

## Cenários de Verificação (Quality Gate)
- **Cenário 1 (Card de Filial):** Na listagem de conciliação, as 10 lojas exibem apenas "SALDO TOTAL" com cor verde para saldos positivos e vermelho com sinal para saldos negativos (ex: Planalto -R$ 3.845,74).
- **Cenário 2 (Importação com Nome):** Ao processar planilha de OS, a coluna `Cliente` é extraída e gravada em `patio_os.client_name`.
- **Cenário 3 (Modal de Vinculação com PIX):** Ao abrir o modal de vinculação para `ENTRADA PIX QRS CAIQUE VINI26/08 CAIQUE VINICIOS SALES LIMA`, a OS do cliente Caique Vinicios é exibida no topo com o nome destacado e badge de match inteligente.
