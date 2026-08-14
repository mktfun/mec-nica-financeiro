# Design 193 - UI do Simulador

## Layout das Colunas em `financeiro.tsx`
Para acomodar todas as 4 simulações sem a tabela ficar com 20 colunas, faremos colunas "Stackadas" (empilhadas).

**1. BASE DE CUSTOS**
- Produto | CMV | C. Fixo | Embal. | Custo Var. (Base)

**2. PREÇO META (SUGERIDO)**
- Mesa | iFood | App 99 | Keeta (Valores em R$ cravados)

**3. SIMULADOR (A PRATICAR)**
- Mesa | iFood | App 99 | Keeta
- **Dentro de cada célula (Stack):**
  ```tsx
  <div>
    <input value={preco_simulado} className="w-16 p-1 border rounded" />
    <span className="text-[10px] text-emerald-400">Mg: 15.5% 🟢</span>
  </div>
  ```

## Estado (State)
- A tabela `products` ou o State `edits` precisará armazenar os 4 preços. Atualmente temos `price` (Mesa) e `preco_definido` (Delivery Único).
- **Ação**: Expandiremos o state `edits` no componente `ProductPricingRow` para permitir a digitação nos 4 canais localmente. Ao salvar, se o banco não tiver as colunas, podemos adaptá-las depois, mas a simulação na tela funcionará perfeitamente e instantaneamente.
