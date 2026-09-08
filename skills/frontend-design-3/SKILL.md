---
name: frontend-design-3
description: Extensão do frontend-design-pro com foco em formulários, tabelas de dados, feedback do sistema e padrões de UX para fluxos complexos (importação, conciliação, dashboard financeiro).
---

# Frontend Design 3 — Extensão de UX Avançada

**Leia `frontend-design-pro/SKILL.md` primeiro. Esta skill complementa com padrões de UX específicos.**

## 1. Formulários e Inputs

### Input Padrão do Projeto
```tsx
<div className="space-y-1.5">
  <label htmlFor="campo" className="text-sm font-medium text-zinc-300">
    Label do Campo
  </label>
  <input
    id="campo"
    type="text"
    className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 
               px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500
               focus:border-indigo-500 focus:outline-none focus:ring-1 
               focus:ring-indigo-500 transition-colors"
    placeholder="Placeholder..."
  />
  {/* Mensagem de erro */}
  {error && (
    <p className="text-xs text-red-400">{error}</p>
  )}
</div>
```

### Validação de Formulário
- Usar `react-hook-form` + `zod` para validação
- Erros devem aparecer inline abaixo do campo
- Submit button deve ser `disabled` durante loading

## 2. Tabelas de Dados

### Tabela Base do Projeto
```tsx
<div className="overflow-x-auto rounded-xl border border-zinc-800">
  <table className="w-full text-sm">
    <thead>
      <tr className="border-b border-zinc-800 bg-zinc-900/50">
        <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wide">
          Coluna
        </th>
      </tr>
    </thead>
    <tbody className="divide-y divide-zinc-800">
      {data.map((row) => (
        <tr key={row.id} className="hover:bg-zinc-800/30 transition-colors">
          <td className="px-4 py-3 text-zinc-100">{row.valor}</td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

### Estados da Tabela
```tsx
// Loading: skeleton rows
{isLoading && Array.from({ length: 5 }).map((_, i) => (
  <tr key={i}><td><div className="h-4 animate-pulse bg-zinc-800 rounded" /></td></tr>
))}

// Empty
{!isLoading && data.length === 0 && (
  <tr><td colSpan={columns} className="py-12 text-center text-zinc-500">
    Nenhum registro encontrado
  </td></tr>
)}
```

## 3. Toast / Notificações

Usar `sonner` para toasts:
```tsx
import { toast } from 'sonner'

// Sucesso
toast.success('Arquivo importado com sucesso!', { duration: 4000 })

// Erro
toast.error('Falha ao importar. Verifique o formato do arquivo.', { duration: 6000 })

// Loading (para operações longas)
const toastId = toast.loading('Importando transações...')
// depois:
toast.success('Concluído!', { id: toastId })
```

## 4. Upload de Arquivos (OFX / XLSX)

**Padrão de UX para importação de arquivos:**

```tsx
// 1. Dropzone com feedback visual
<div
  onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
  onDragLeave={() => setIsDragging(false)}
  onDrop={handleDrop}
  className={cn(
    "rounded-xl border-2 border-dashed p-8 text-center transition-colors cursor-pointer",
    isDragging 
      ? "border-indigo-500 bg-indigo-500/10" 
      : "border-zinc-700 hover:border-zinc-600"
  )}
>
  <p className="text-zinc-400">Arraste um arquivo OFX ou XLSX aqui</p>
  <p className="text-xs text-zinc-600 mt-1">ou clique para selecionar</p>
</div>

// 2. Preview antes de confirmar
// Mostrar: nome do arquivo, tamanho, nº de transações detectadas

// 3. Barra de progresso durante import
<div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
  <div 
    className="h-full bg-indigo-500 transition-all duration-300"
    style={{ width: `${progress}%` }}
  />
</div>
```

## 5. Padrões de Dashboard Financeiro

- **Valores monetários**: sempre `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`
- **Datas**: sempre `format(date, 'dd/MM/yyyy', { locale: ptBR })`
- **Números negativos**: vermelho (`text-red-400`), positivos: verde (`text-emerald-400`)
- **Cards de KPI**: mostrar valor atual + variação percentual + seta direcional

## 6. Anti-Patterns de UX

| ❌ Proibido | ✅ Correto |
|---|---|
| Formulário sem loading state no submit | Desabilitar botão + spinner durante submit |
| Tabela sem estado de empty/loading | Implementar os 3 estados sempre |
| Datas em formato americano | `dd/MM/yyyy` com locale pt-BR |
| Valores monetários sem formatação | `Intl.NumberFormat` ou `currency-formatter` |
| Upload sem preview de confirmação | Mostrar preview antes de confirmar import |
| Erro genérico "Something went wrong" | Mensagem específica do erro em português |
