# Design: Odometer Faturamento Logic, Read-Only Locks & UI Cleanup (197)

## Arquitetura Técnica

```
[ Usuário: ResumoDiaPanel ] ──(isEditing: false)──▶ [ Visualização Estática dos 5 Pilares + Consolidação ]
               │
      (Clica em "Editar Fechamento")
               │
               ▼
[ Modo de Edição (isEditing: true) ]
  ├── 1. Faturamento Acumulado Hoje (Input Odômetro) ──▶ Faturamento Líquido = Hoje - Ant
  ├── 2. Dinheiro MP (Input Manual)
  ├── 3. A Receber (Input Manual)
  └── 4. Contas Manual (Input Manual)
               │
  ├── [ Cancelar ] ──▶ Reverte dados locais aos valores persistidos no DB e sai do modo edição
  └── [ Salvar ]   ──▶ Grava snapshot (faturamento = leitura acumulada) e fecha edição
```

## Interfaces TypeScript

```typescript
export interface OdometerConciliacaoState {
  faturamentoAcumuladoHoje: number;
  dinheiroMp: number;
  aReceber: number;
  contasManual: number;
  isEditing: boolean;
}
```

## Componentes / Hooks / Funções

1. **`src/lib/modulo1Calculations.ts`:**
   - Assegurar cálculo estrito:
     ```typescript
     const faturamento_fat_ant = Number(input.faturamento_anterior || 0);
     const faturamento_acumulado = Number(input.faturamento_atual || 0);
     const faturamento_periodo = faturamento_fat_ant > 0 
       ? (faturamento_acumulado - faturamento_fat_ant) 
       : faturamento_acumulado;
     const valor_disp_contas = faturamento_periodo - fluxo_cx;
     ```

2. **`src/components/conciliacao/ResumoDiaPanel.tsx`:**
   - Gerenciamento de estado `isEditing: boolean`.
   - Modos de exibição:
     - `isEditing === false`: `<AnimatedNumber value={...} format="currency" />` dentro de caixas informativas em Dark UI sólido, sem nenhum `<input>` ativo.
     - `isEditing === true`: `<input type="number" ... />` com feedback visual imediato e botões `Salvar` e `Cancelar`.
   - Faturamento Acumulado Hoje editável no painel, mostrando o `Ant: R$ ...` e o `Líquido Calculado: R$ ...`.

3. **`src/components/importacoes/CentralImportWizard.tsx`:**
   - Remoção dos steppers lineares redundantes do topo.
   - Encapsulamento de logs técnicos crus em um painel/drawer colapsável `<details>` ou accordion monospaced discreto.
   - Destaque nos cards das lojas com badges de status claros.

## Fluxo de UI (Frontend)
1. **Navegação Diária:**
   - O usuário abre `/conciliacao/` e seleciona uma data.
   - Todos os cartões são carregados como cartões informativos de leitura (sem inputs abertos).
2. **Edição do Fechamento:**
   - O usuário clica em `Editar Fechamento`.
   - Os cartões de entrada tornam-se inputs com foco claro.
   - Ao alterar o `Faturamento Acumulado Hoje`, o painel recalcula instantaneamente o `Faturamento Líquido do Dia` subtraindo o `Ant`.
   - Clicar em `Salvar Alterações` persiste no Supabase e bloqueia a edição.
   - Clicar em `Cancelar` descarta edições não salvas.
3. **Importação:**
   - O usuário abre o modal de importação. A tela apresenta diretamente os cards de upload das lojas sem steppers poluídos no topo nem blocos de log despejados na tela principal.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1 (Cálculo Odômetro):**
  - *Estado Inicial:* Dia anterior tinha Faturamento Acumulado de R$ 257.011,03.
  - *Ação:* Operador insere Faturamento Acumulado Hoje de R$ 291.165,95.
  - *Resultado Esperado:* Faturamento Líquido exibe R$ 34.154,92. Valor Disp. Contas usa R$ 34.154,92. Snapshot salva R$ 291.165,95.
- **Cenário 2 (Trava de Edição):**
  - *Estado Inicial:* Painel em modo leitura (`isEditing === false`).
  - *Ação:* Visualizar a tela.
  - *Resultado Esperado:* Nenhum input visível, valores exibidos como texto estilizado. Clicar em "Editar Fechamento" abre os inputs. Clicar em "Cancelar" reverte valores.
- **Cenário 3 (Modal de Importação Limpo):**
  - *Estado Inicial:* Abrir o modal de importação centralizada.
  - *Ação:* Verificar visual.
  - *Resultado Esperado:* Sem steppers redundantes no topo; logs técnicos recolhidos em painel colapsável.
