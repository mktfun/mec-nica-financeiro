# Proposta: Redesign Visual & Descompressão do Painel de Resumo do Dia (Spec 237)

## 1. Diagnóstico de UX / UI (Causa do "Aperto e Sobrecarga")

Ao analisar a tela atual enviada na captura:

1. **Os 5 Pilares Estão Espremidos:** Em telas convencionais ou notebooks (1366px - 1440px), 5 cards forçados em colunas estreitas deixam os títulos, ícones e sub-linhas amassados. No Card 1 (`Saldo Bancos + Cartões`), a linha de `OFX` e `+ Maq` quebra e sobrepõe o texto, criando poluição visual.
2. **Textos e Micro-rótulos Repetitivos:** Frases como *"Preenchido na importação"*, *"Boletos/Descontos manuais"*, *"OSs do Pátio pendentes"*, *"Descontado saldo negativo (Itaú)"* e *"Caixa atual vs Conciliação Anterior"* ocupam espaço visual precioso sem agregar valor no dia a dia.
3. **Assimetria Pesada na Consolidação:** A seção inferior divide 2/3 para uma grade densa de 5 métricas cinzas e 1/3 para um card gigante vermelho/verde que parece uma caixa isolada e pesada.

---

## 2. Conceito do Redesign (Design System Clean, Espaçoso e Executivo)

Transformaremos o painel em um **Cockpit Financeiro Executivo de Alto Nível**, com respiração, hierarquia clara e visual limpo:

### 🌟 2.1 Os 5 Pilares com Respiração & Tipografia Nobre
- **Títulos Diretos & Claros:** `Saldo em Banco`, `Dinheiro Físico`, `A Receber`, `Pátio (OSs)`, `Contas a Pagar`.
- **Valores em Destaque:** Tipografia `font-mono` com números nítidos e legíveis.
- **Sub-linhas Organizadas:**
  - **Card 1 (Saldo):** Dois mini-chips alinhados e limpos: `OFX: R$ 186.496,03` | `💳 A Compensar: + R$ 4.704,48` (com botão âmbar clicável que abre o modal de detalhamento).
  - **Card 5 (Contas):** Sub-linhas limpas `Juros Rede: R$ 5.433,13` | `Saídas OFX: R$ 78.548,63`.
- **Eliminação de Rótulos Poluentes:** Os textos secundários óbvios são removidos ou movidos para tooltips discretos no hover.

### 🏛️ 2.2 Cockpit de Fechamento Integrado e Balanceado
Em vez de uma caixa pesada e espremida, reorganizamos a esteira em **3 colunas fluidas e harmoniosas**:

1. **Bloco 1: Caixa & Variação**
   - `Caixa Atual`: Total consolidado com badge sutil do saldo bancário.
   - `Fluxo de Caixa`: Delta em relação ao dia anterior com indicador visual de subida/descida.
2. **Bloco 2: Operação & Contas**
   - `Faturamento do Dia`: Valor líquido apurado com pill `Ver Detalhes ↗`.
   - `Disponível para Contas`: Capacidade de pagamento do dia.
3. **Bloco 3: Cartão de Balanço do Fechamento (Clean & Moderno)**
   - Exibe o `Subtotal de Contas` (Juros + Contas Manuais).
   - Exibe a `Diferença Final` em destaque nítido, mas integrado com harmonia ao design (badge de conformidade $\pm \text{R\$ 50}$ e status imediato `CONCILIADO` ou `DIVERGÊNCIA IDENTIFICADA`).

---

## 3. Critérios de Aceite

1. ✅ Os 5 cards superiores respiram confortavelmente sem sobreposição de textos, quebras feias de linha ou números colidindo.
2. ✅ As sub-linhas de Maquininha e OFX ficam perfeitamente alinhadas e com visual clean.
3. ✅ A área de consolidação do dia fica elegante, balanceada e sem excesso de textos técnicos repetitivos.
4. ✅ Modo de edição (`Editar Fechamento`) continua 100% funcional com inputs intuitivos e seguros.
