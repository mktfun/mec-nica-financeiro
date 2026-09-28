# 📐 Design Document — Spec 443: Redesign & Anti-Slop no Vínculo de PIX e REDE a OS

## 1. Visão Geral da Arquitetura Visual
O redesenho de `ManualMatchOsModal.tsx` substitui o antigo padrão de "mini planilha comprimida" por uma arquitetura fiduciária **Master-Detail em Split View (60% / 40%)**, inspirada nos princípios de Craft do Rauno Freiberg e nos melhores padrões do Midday e Linear para interfaces financeiras em Dark Mode Zinc-950.

### Hierarquia de Elevação e Cores (Zinc-950 Design System Lock):
- **Superfície Modal:** `bg-zinc-950 border border-zinc-800 shadow-2xl`
- **Banner da Transação:** `bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4`
- **Cards da Lista (Master):** `bg-zinc-900/40 hover:bg-zinc-900 border border-zinc-800/60 rounded-xl p-3`
  - **Estado Selecionado:** `bg-zinc-900 border-emerald-500/50 shadow-sm ring-1 ring-emerald-500/20`
- **Painel de Confirmação (Detail):** `bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between`
- **Tipografia:**
  - Valores monetários: `font-mono tabular-nums font-bold`
  - Placas de veículos: `font-mono tracking-wider uppercase text-xs px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700`
  - Números de OS: `font-mono text-sm font-bold text-zinc-100`

---

## 2. Componentes e Estrutura da Interface

### 2.1. Top Banner — O Lançamento Fiduciário
Substitui o antigo card entulhado por um resumo calmo e objetivo:
- **Lado Esquerdo:**
  - Chip identificador semântico:
    - Se PIX/OFX: `PIX • Transferência Bancária` (Badge sutil em tom esmeralda discreto)
    - Se Cartão/REDE: `Cartão • REDE` (Badge sutil em tom índigo/âmbar discreto)
  - Titular / Contraparte em destaque: `transaction.counterpart_name || transaction.title` (`text-sm font-semibold text-zinc-100`)
  - Linha auxiliar com data e identificadores técnicos (`Data: DD/MM/AAAA` • `NSU: XXX` / `Aut: YYY` se houver)
- **Lado Direito:**
  - Rótulo uppercase: `VALOR RECEBIDO` (`text-[10px] uppercase font-mono text-zinc-400`)
  - Valor: `R$ 450,00` (`text-2xl font-bold font-mono text-emerald-400`)

---

### 2.2. Seletor de Modo (Segmented Control)
Substitui botões com emojis por um seletor sóbrio:
- `[ Ordens de Serviço em Aberto (X) ]`
- `[ Cadastrar Nova OS ]`

---

### 2.3. Painel Master (Esquerda — 60% da largura)
- **Barra de Pesquisa com Autofocus:**
  - Campo de busca integrado com ícone `Search`, placeholder: `"Buscar por nº da OS, cliente ou placa..."`.
  - Contador dinâmico de resultados encontrados.
- **Lista de Candidatas Respirável (Scroll Suave):**
  - Cada OS é renderizada como um card confortável (altura mínima ~68px, sem quebras toscas de texto):
    - **Header do Card:** `#1045` • Placa em destaque (`ABC-1234`) • Forma de pagamento prevista (`PIX` ou `Cartão`).
    - **Corpo:** Nome completo do cliente (`João da Silva Pereira`) sem truncamento arbitrário de 10 caracteres.
    - **Rodapé:** Total da OS (`Total R$ 1.500,00`) e Saldo em Aberto (`Aberto: R$ 450,00`).
    - **Badge de Sugestão:**
      - Se bater valor e nome: `Sugestão: Mesmo cliente e valor` (`bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px]`)
      - Se bater valor: `Sugestão: Mesmo valor` (`bg-blue-500/10 text-blue-400 border border-blue-500/30 text-[10px]`)
      - Zero emojis, zero ícones de faísca (`Sparkles`).
  - **Auto-seleção Inteligente:** Se houver candidato com pontuação de match alta (exato valor ou nome), ele é pré-selecionado automaticamente na abertura do modal, permitindo vincular imediatamente.

---

### 2.4. Painel Detail (Direita — 40% da largura)
Espelho fiduciário transparente que mostra a matemática exata antes de qualquer mutação no banco:
- **Ficha da OS Selecionada:**
  - Número da OS, Cliente e Placa.
- **Espelho Contábil (Receipt de Amortização):**
  - Saldo Atual da OS: `R$ 450,00`
  - Valor a Amortizar: `- R$ 450,00` (verde)
  - ── Divisor sutil (`border-zinc-800`) ──
  - Novo Saldo Remanescente: `R$ 0,00`
  - Status Resultante:
    - Se `R$ 0,00`: Badge `Quitação Integral (OS Baixada no Pátio)`
    - Se `> 0,00`: Badge `Pagamento Parcial (Resta R$ X,XX no Pátio)`
- **Ação Principal CTA:**
  - Botão largo de alto contraste:
    `[ Confirmar Vínculo na OS #XXXX ]`
  - Ao clicar, exibe estado de loading e desabilita cliques múltiplos.
- **Ação Secundária (Dinheiro no Balcão):**
  - Link/botão sutil e secundário para liquidar residual em dinheiro caso o cliente tenha pago parte em espécie.

---

### 2.5. Aba "Cadastrar Nova OS" (Formulário Limpo)
- Layout em grid 2 colunas:
  - Filial (select)
  - Número da OS (input com validação)
  - Nome do Cliente (preenchido com a contraparte do PIX/cartão)
  - Placa do Veículo (uppercase, font-mono)
  - Forma de Pagamento
  - Opção de Liquidação Integral (100% quitada com este valor) vs Parcial (digita valor total maior).
- Botão direto: `[ Cadastrar OS e Vincular Pagamento ]`.
- Zero discursos pré-fabricados ou textos teóricos ("Garantia Contábil...").

---

## 3. Catálogo Anti-Slop (Checklist de Eliminação)

| Elemento Anterior | Status | Substituto na Nova Interface |
|---|---|---|
| Emojis `🔍`, `➕`, `🎉` | ❌ Eliminados | Ícones semânticos Lucide (`Search`, `Plus`, `FileText`, `CheckCircle`) |
| Badges com `<Sparkles>` | ❌ Eliminados | Badges sutis e profissionais de sugestão (`Sugestão: Mesmo valor`) |
| Bloco "Garantia Contábil" | ❌ Eliminado | Espelho contábil visual direto no painel direito |
| Tabela de 7 colunas comprimida | ❌ Eliminada | Lista Master-Detail em Split View (60% / 40%) |
| Linhas com cores de arco-íris | ❌ Eliminadas | Superfícies elevadas Zinc-950 com seleção via anel sutil esmeralda |
| Duplo botão espremido por linha | ❌ Eliminado | Ação primária destacada no painel de confirmação |
