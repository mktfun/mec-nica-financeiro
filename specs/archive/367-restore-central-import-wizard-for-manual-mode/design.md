# Technical Design — Spec 367: Restauração do CentralImportWizard no Modo Manual

## 1. Arquitetura de Componentes

### `src/routes/importacoes.tsx`
No bloco `activeTab === 'diario'`:
```tsx
{/* 1. MODO CONVERSACIONAL COM IA (HYDRA) */}
{search.mode === 'ai' && (
  <div className="space-y-4">
    <ReconciliationChatWorkspace
      targetDate={selectedDate || new Date().toISOString().split('T')[0]}
      onReturnToSelector={() => navigate({ search: (prev) => ({ ...prev, mode: undefined }) })}
      onSwitchToClassicView={() => navigate({ search: (prev) => ({ ...prev, mode: 'manual' }) })}
    />
  </div>
)}

{/* 2. MODO MANUAL (IMPORTAÇÃO EM MASSA / WIZARD CENTRAL CLÁSSICO) */}
{search.mode === 'manual' && (
  <div className="space-y-4">
    <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
      <Button
        type="button"
        variant="outline"
        onClick={() => navigate({ search: (prev) => ({ ...prev, mode: undefined }) })}
        className="h-8 px-3 text-xs border-zinc-700 text-zinc-300 hover:bg-zinc-800 rounded-xl flex items-center gap-1.5"
      >
        <ArrowLeft size={14} /> Voltar à Seleção de Modo
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => navigate({ search: (prev) => ({ ...prev, mode: 'ai' }) })}
        className="h-8 px-3 text-xs border-indigo-500/30 text-indigo-300 hover:bg-indigo-950/30 rounded-xl flex items-center gap-1.5"
      >
        <Cpu size={14} className="text-indigo-400" /> Abrir Workspace Conversacional com IA
      </Button>
    </div>
    <CentralImportWizard 
      onCancel={() => navigate({ search: (prev) => ({ ...prev, mode: undefined }) })}
      initialDate={selectedDate || new Date().toISOString().split('T')[0]}
    />
  </div>
)}

{/* 3. SELETOR INICIAL DE MODALIDADE (DEFAULT) */}
{!search.mode && (
  <FechamentoModeSelector
    selectedDate={selectedDate || new Date().toISOString().split('T')[0]}
    onDateChange={(newDate) => navigate({ search: (prev) => ({ ...prev, date: newDate }) })}
    onSelectMode={(chosenMode) => {
      navigate({
        search: (prev) => ({
          ...prev,
          mode: chosenMode
        })
      });
    }}
  />
)}
```

### `src/components/importacoes/bifurcacao/FechamentoModeSelector.tsx`
O Card 1 reflete a realidade da importação em massa:
- Ícone: `UploadCloud` ou `Layers`
- Badges: `Sem IA · Import em Lote · Clássico`
- Título: `Modo Manual (Importação em Massa)`
- Descrição clara sobre arrastar todos os arquivos juntos.

---

## 2. Riscos e Mitigações
- **Risco:** Perda de estado caso o usuário dê refresh.
  - **Mitigação:** O parâmetro `?mode=manual&date=YYYY-MM-DD` é mantido na URL via query params do TanStack Router, preservando a tela no F5.
- **Risco:** Regressão no `CentralImportWizard`.
  - **Mitigação:** O `CentralImportWizard` não sofreu mutações destrutivas e já estava compilando normalmente.
