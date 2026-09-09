---
name: frontend-design-3
description: Extensão do frontend-design-pro com foco em formulários, tabelas de dados, feedback do sistema e padrões de UX para fluxos complexos (importação, conciliação, dashboard financeiro).
---

# Frontend Design 3 — Padrões de Formulários, Tabelas & UX Avançada

Extensão operacional de UX e engenharia de interação para telas com densidade de dados e fluxos transacionais. Complementa `frontend-design-pro/SKILL.md` incorporando as regras de inputs e formulários das **Web Interface Guidelines**.

---

## 1. Engenharia de Formulários & Inputs (Padrão Rauno)

### Regras Mandatórias de Formulário:
1. **iOS 16px Guardrail**: O tamanho da fonte de qualquer input DEVE ser de no mínimo 16px no mobile (`text-base md:text-sm`). Previne zoom automático invasivo do Safari no iOS.
2. **Clickable Labels**: O clique no `<label>` DEVE focar o campo. Garanta o par `htmlFor="campo-id"` com `<input id="campo-id">`.
3. **Form Element Wrapper**: Agrupe sempre os campos dentro de `<form onSubmit={handleSubmit}>` para habilitar envio nativo pela tecla `Enter`.
4. **Semantic Input Types**: Use o tipo semântico exato (`type="email"`, `type="tel"`, `type="url"`, `type="number"`) para acionar o teclado virtual apropriado.
5. **Spellcheck & Autocomplete Hygiene**: Adicione `spellcheck="false"` e `autoComplete="off"` em buscas, tokens, códigos fiscais e nomes de usuário.
6. **Input Adornments com Foco**: Ícones de prefixo/sufixo devem ser posicionados de forma absoluta com `pointer-events-none` ou clicáveis transferindo foco para o input.
7. **Immediate Toggles**: Switches e toggles de configuração DEVEM aplicar o efeito de mutação imediatamente sem botão secundário de salvar.

### Exemplo de Input de Alta Precisão:
```tsx
<div className="space-y-1.5">
  <label htmlFor="user-email" className="text-xs font-medium text-zinc-300">
    Email de Contato
  </label>
  <div className="relative">
    <input
      id="user-email"
      type="email"
      required
      spellCheck="false"
      autoComplete="email"
      placeholder="nome@empresa.com.br"
      className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 
                 px-3.5 py-2.5 text-base md:text-sm text-zinc-100 placeholder-zinc-500
                 transition-colors duration-150
                 hover:border-zinc-600
                 focus:border-indigo-500 focus:outline-none 
                 focus:ring-2 focus:ring-indigo-500/30 focus:ring-offset-2 focus:ring-offset-zinc-950
                 disabled:opacity-50 disabled:cursor-not-allowed"
    />
  </div>
  {error && (
    <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
      <span>⚠</span> {error}
    </p>
  )}
</div>
```

---

## 2. Tabelas de Dados Corporativas

### Tabela com Estados Completos:
```tsx
<div className="overflow-x-auto rounded-xl border border-white/10 bg-zinc-900/60">
  <table className="w-full text-left text-sm">
    <thead>
      <tr className="border-b border-white/5 bg-zinc-900/80">
        <th className="px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
          Data
        </th>
        <th className="px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
          Descrição
        </th>
        <th className="px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider text-right">
          Valor
        </th>
      </tr>
    </thead>
    <tbody className="divide-y divide-white/5">
      {/* Loading: Skeletons */}
      {isLoading && Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="animate-pulse">
          <td className="px-4 py-3.5"><div className="h-4 w-20 bg-zinc-800 rounded" /></td>
          <td className="px-4 py-3.5"><div className="h-4 w-48 bg-zinc-800 rounded" /></td>
          <td className="px-4 py-3.5 text-right"><div className="h-4 w-16 bg-zinc-800 rounded ml-auto" /></td>
        </tr>
      ))}

      {/* Empty State */}
      {!isLoading && data.length === 0 && (
        <tr>
          <td colSpan={3} className="py-12 text-center text-zinc-500">
            <p className="text-sm font-medium text-zinc-400">Nenhum registro encontrado</p>
            <p className="text-xs text-zinc-600 mt-1">Importe um extrato ou adicione uma transação.</p>
          </td>
        </tr>
      )}

      {/* Dados Reais */}
      {!isLoading && data.map((row) => (
        <tr key={row.id} className="transition-colors hover:bg-zinc-800/40">
          <td className="px-4 py-3 text-zinc-300">{row.data}</td>
          <td className="px-4 py-3 text-zinc-100 font-medium">{row.descricao}</td>
          <td className="px-4 py-3 text-right font-mono text-zinc-200">{row.valorFormatado}</td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

---

## 3. Feedback do Sistema & Notificações

### Regra de Ouro: Proximity Feedback First
- Prefira **feedback de proximidade** (ex.: checkmark inline ou texto "Copiado!" de 1.5s próximo ao botão clicado) a disparar toasts no topo da tela.
- Quando usar toasts (usando `sonner`), reserve-os exclusivamente para operações globais ou de longa duração:

```tsx
import { toast } from 'sonner'

// Operação com promise (loading -> success/error)
toast.promise(importarArquivo(file), {
  loading: 'Importando transações do extrato...',
  success: (count) => `${count} transações importadas com sucesso!`,
  error: 'Falha ao importar o arquivo. Verifique o formato.',
})
```

---

## 4. Upload de Arquivos (OFX / XLSX / CSV)

Padrão de UX em 3 etapas para importação segura de dados financeiros:

1. **Dropzone Acessível**: Feedback visual claro no estado `isDragging` (borda `border-indigo-500` com `bg-indigo-500/10`).
2. **Preview Antes de Gravar**: Exibir nome do arquivo, tamanho e resumo das linhas/transações identificadas antes do envio final.
3. **Barra de Progresso Determinística**: Indicador de percentual durante processamento com cancelamento se suportado.

---

## 5. Formatação & Convenções Numéricas

- **Moeda (BRL)**: Sempre `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`.
- **Datas**: Sempre `dd/MM/yyyy` com locale pt-BR.
- **Destaque de Saldo**: Positivo em `text-emerald-400`, Negativo em `text-rose-400`, Neutro em `text-zinc-300`.
- **Valores Monospaçados**: Utilize a classe `font-mono tabular-nums` para colunas numéricas alinhadas.

---

## 6. Anti-Patterns Específicos de Formulários e Tabelas

| ❌ Proibido | ✅ Correto |
|---|---|
| Input com fonte menor que 16px no mobile | `text-base md:text-sm` (previne zoom no iOS) |
| Label solto sem `htmlFor` / `id` | Label com `htmlFor` associado ao `id` do input |
| Botão de submit ativo durante requisição | `disabled={isSubmitting}` com spinner de loading |
| Erro genérico em toast sem marcar o campo | Marcar a borda em vermelho e exibir mensagem inline |
| Tabela sem contorno de overflow horizontal | Envolver em `<div className="overflow-x-auto">` |
| Valores numéricos desalinhados em tabelas | Alinhamento à direita (`text-right`) com `tabular-nums` |
