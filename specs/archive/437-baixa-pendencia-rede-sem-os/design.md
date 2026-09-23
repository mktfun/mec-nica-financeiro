# 📐 SDD Design: Spec 437 — Resolução de Pendências de Vendas em Cartão Rede Sem OS (Vínculo & Baixa Justificada)

## 1. Arquitetura de Fluxo Ponta a Ponta
```
[Venda em Cartão da Rede sem OS (pos_transactions)]
      │
      ├──> Ação A: "Vincular OS" 
      │       └──> Abre ManualMatchOsModal (source: 'rede', storeId, amount)
      │               ├── Opção 1: Seleciona OS existente do Pátio
      │               │       └──> RPC link_manual_rede_to_os(pos_id, os_number, store_id, amount)
      │               │               └──> Atualiza patio_os.paid_value + pos_transactions.matched_os_number
      │               └── Opção 2: Cria nova OS rápida (ex: OS não faturada no ERP)
      │                       └──> RPC create_and_link_manual_os('rede', pos_id, store_id, os_number, ...)
      │                               └──> Insere patio_os + vincula pos_transactions
      │
      └──> Ação B: "Dar Baixa / Justificar"
              └──> Abre OrphanCategorizationModal (transactionType: 'in', amount, targetDate)
                      └──> categorizeOrphan(...)
                              └──> Atualiza pos_transactions (manual_category, manual_justification)
                              └──> Se impactar receita: Upsert em daily_revenue_adjustments
```

## 2. Design System & Padrões Visuais (Zinc-950)
Seguindo rigorosamente o `DESIGN.md`:
- **Nível de Elevação 1 (Card/Linha):** Fundo `bg-card` com borda `border-border/40`.
- **Badges Semânticos:**
  - Cartão com OS Vinculada: Badge `text-blue-400 bg-blue-500/10 border-blue-500/30` com botão de desvincular em hover/menu.
  - Cartão com Justificativa Avulsa: Badge `text-purple-400 bg-purple-500/10 border-purple-500/30` exibindo a categoria (ex: `Venda de Balcão` ou `Pendente`).
  - Cartão Pendente Sem OS: Alerta sutil `text-amber-400 bg-amber-500/10 border-amber-500/30` com botões de ação:
    - Botão primário: `<Button size="xs" variant="outline" className="text-blue-400 border-blue-500/30 hover:bg-blue-500/10 gap-1">` com ícone `<Link2 size={12} /> Vincular OS`.
    - Botão secundário: `<Button size="xs" variant="ghost" className="text-zinc-400 hover:text-zinc-200 gap-1">` com ícone `<FileEdit size={12} /> Justificar`.
- **Micro-interações:** Transições suaves ≤ 200ms com Framer Motion e tooltips explicativos.

## 3. Interfaces TypeScript Reais

```typescript
// Interface da transação de cartão enriquecida em StoreCartaoMaquininhaView
export interface PosCardRow {
  id: string;
  store_id: string;
  bandeira: string;
  payment_method: string;
  rede_bruto: number;
  taxa_brl: number;
  taxa_percent: number;
  rede_liquido: number;
  os_number: string;
  has_os: boolean;
  raw_os_number: string | null;
  manual_category: string | null;
  manual_justification: string | null;
  os_data: {
    id?: string;
    os_number: string;
    client_name: string;
    vehicle: string;
    total_value?: number;
    paid_value?: number;
    status?: string;
  } | null;
  settlement_status: string;
  is_settled: boolean;
  occurred_at?: string;
}

// Parâmetros para vincular transação de cartão existente
export interface LinkManualRedeParams {
  p_pos_id: string;
  p_os_number: string;
  p_store_id: string;
  p_amount?: number;
}
```

## 4. Cenários Obrigatórios

### 4.1. Happy Path: Loja Mauá — Venda de Cartão de R$ 4.051,00 sem OS no ERP
1. O operador acessa a aba "1. Cartão / Maquininha" da filial Mauá no dia 21/09/2026.
2. Na tabela, visualiza a transação de R$ 4.051,00 (Mastercard) com status "Sem OS Vinculada".
3. O operador clica em **"Vincular OS"**.
4. O modal `ManualMatchOsModal` abre pré-configurado para a filial Mauá com valor de R$ 4.051,00.
5. O operador busca a OS `22613` que estava com pendência e clica em **"Vincular à OS"**.
6. A RPC `link_manual_rede_to_os` é executada com sucesso.
7. A tela revalida o cache: a transação agora exibe o badge `OS #22613`, o cliente `ALDECIR DA SILVA SALES` e o status de faturamento/pátio é equalizado.

### 4.2. Edge Case: Venda de Balcão na Maquininha que Não Teve OS Aberta
1. O cliente comprou um aditivo ou palheta no balcão e passou R$ 140,70 na maquininha sem abertura de OS na oficina.
2. Na aba "Cartão / Maquininha", a linha acusa "Sem OS Vinculada".
3. O operador clica em **"Dar Baixa / Justificar"**.
4. O modal `OrphanCategorizationModal` abre. O operador seleciona `Venda de Balcão`, insere a justificativa *"Venda direta de peças no balcão"* e marca para impactar receita.
5. A função `categorize` salva `manual_category` e `manual_justification` em `pos_transactions` e cria o ajuste em `daily_revenue_adjustments`.
6. A linha na tabela passa a exibir o badge roxo `Venda de Balcão`, eliminando a pendência visual da conciliação.

## 5. Critérios de Aceitação Verificáveis
1. **Zero classes arbitrárias:** Apenas classes utilitárias semânticas Tailwind / Zinc-950 (`bg-card`, `border-border/40`).
2. **Build TypeScript limpo:** `npm run build` passa sem nenhum erro de tipagem.
3. **Paridade com PIX:** Todas as vendas de cartão sem OS passam a ter botões de "Vincular OS" e "Dar Baixa / Justificar".
4. **Desvinculação funcional:** OSs vinculadas via cartão podem ser desvinculadas através de confirmação na interface.
5. **Revalidação de cache:** Ao vincular ou justificar, as tabelas de cartões, pátio e conciliação revalidam instantaneamente sem necessidade de F5 manual.
