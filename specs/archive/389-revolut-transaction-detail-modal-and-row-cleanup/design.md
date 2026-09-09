# Design: Janela de Detalhes da Transação (Revolut Card Details Modal) e Limpeza da Linha do Extrato (389)

## Arquitetura e Fluxo de Interação

```
[Extrato Bancário da Filial]
       │
       ▼ (Clique em qualquer linha de transação)
[TransactionDetailModal (Revolut Card Details)]
       │
       ├── Hero: Avatar Squircle + Título Limpo + Valor Grande (+/-) + Data/Hora
       ├── Badges: [D-1 Ontem] [OS #...] [Lote Rede] [Intercompany]
       ├── Ficha Técnica: FITID + CNPJ + Favorecido + Conta + Categoria + Justificativa
       │
       └── Painel de Ações:
             ├── [Mover p/ Hoje] ────────► handleMoveTransactionToToday() -> Invalidação Query
             ├── [Vincular OS] ──────────► Abre ManualMatchOsModal
             ├── [Desvincular OS] ───────► handleUnlink() -> Invalidação Query
             ├── [Editar Categoria] ─────► Abre CategorizeModal
             └── [Fechar] ───────────────► Fecha modal e retorna ao extrato
```

---

## Especificações Visuais do Componente `TransactionDetailModal`

1. **Container do Modal:**
   - Baseado em `Modal` com `size="lg"` (`max-w-2xl`), bordas suaves `border-zinc-800`, superfície `bg-zinc-950/95` e backdrop blur.
2. **Hero Header:**
   - Avatar squircle com 48x48px (`w-12 h-12 rounded-2xl`) com ícone proporcional e cores semânticas Rose/Emerald/Blue.
   - Nome higienizado em `text-lg font-bold text-zinc-100`.
   - Valor fiduciário em `text-3xl font-mono font-extrabold tracking-tight` (`text-emerald-400` ou `text-rose-400`).
   - Linha de data e hora do banco em `text-xs text-zinc-400`.
3. **Card de Auditoria Fiduciária:**
   - Bloco em `bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 space-y-3`.
   - Itens em grid 2 colunas:
     - Origem do Registro (`Extrato Bancário Itaú OFX`).
     - FITID bancário com botão de cópia de 1-clique (`Copy` / `Check`).
     - Favorecido / Razão Social completa do fornecedor ou cliente.
     - Documento (CNPJ ou CPF formatado).
     - Conta contábil vinculada (se identificada).
     - Justificativa cadastrada (se houver).
4. **Action Panel (Rodapé do Modal):**
   - Botões com altura `h-10`, fontes legíveis, ícones descritivos e estados de hover nobres.
   - Destaque visual para `[Mover p/ Hoje]` em tom roxo (`bg-purple-600 hover:bg-purple-500 text-white font-medium`) com spinner em caso de mutação.
   - Botão secundário `[Vincular OS]` em tom azul (`bg-blue-600 hover:bg-blue-500 text-white`).
   - Botão `[Editar Categoria]` em tom neutro elevado (`bg-zinc-800 hover:bg-zinc-700 text-zinc-200`).

---

## Mutações em Arquivos Existentes [MODIFY]

### `src/components/conciliacao/StoreExtratoBancarioView.tsx`
- Importar `TransactionDetailModal` de `./TransactionDetailModal`.
- Criar estado: `const [selectedDetailTx, setSelectedDetailTx] = useState<any | null>(null);`.
- No renderizador de transações:
  - Adicionar `cursor-pointer group hover:bg-zinc-800/40 rounded-xl px-3.5 py-3 transition-colors active:scale-[0.99]` no container.
  - Adicionar `onClick={() => setSelectedDetailTx(tx)}`.
  - Remover a div `flex items-center justify-end gap-1.5 min-w-[70px]` com os botões inline.
  - Inserir um ícone sutil `ChevronRight size={15} className="text-zinc-600 group-hover:text-zinc-300 group-hover:translate-x-0.5 transition-all shrink-0 ml-2"` após o valor fiduciário.
- No final do JSX:
  - Renderizar `<TransactionDetailModal />` conectado com `selectedDetailTx`.

---

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)

### Cenário 1: Inspeção de Transação e Limpeza da Linha
- **SCAN:** Entrar na tela `http://localhost:8080/conciliacao/st-06?date=2026-09-09`.
- **INFER:** Nenhuma linha de transação deve conter botões soltos espremendo os valores monetários.
- **VERIFY:** A linha exibe estritamente o avatar, a razão social limpa, a linha discreta de metadados, o valor de alto contraste (`+ R$ 300,00` ou `- R$ 490,50`) e o chevron discreto.

### Cenário 2: Abertura da Janela e Ações Fiduciárias
- **SCAN:** Clicar na transação de D-1 (ex: `+ R$ 300,00` ou `- R$ 490,50`).
- **INFER:** Uma janela modal nobre (Revolut Card Details) deve abrir centralizada, exibindo todos os metadados técnicos e o painel de ações.
- **VERIFY:** Ao clicar em `[Mover p/ Hoje]`, a transação é movida para hoje, a janela fecha/atualiza e o faturamento de hoje é recomposto. Ao clicar em `[Vincular OS]`, o modal de OS abre perfeitamente.
