# Spec 070: Redesign do Gráfico "Faturamento × Contas"

## 1. O Problema
Atualmente, o gráfico de barras lateral "Faturamento × Contas" apresenta alguns problemas visuais na interface, conforme imagem enviada:
- **Quebra de Linha nos Nomes das Lojas:** A largura do Eixo Y (YAxis) está muito pequena (`88px`), o que faz com que nomes como "Santo André - HD" quebrem violentamente no meio, ficando feio e difícil de ler.
- **Barras Finas e "Voadoras":** As barras (Faturamento e Contas) estão muito finas e com espaçamentos estranhos.
- **Falta de Destaque:** As cores são chapadas e não trazem o aspecto "Premium e State of the Art" que o resto do Dashboard possui.
- **Gráfico Espremido:** Se houver poucas ou muitas lojas, o cálculo de altura mínima e a disposição dos elementos não está otimizada.

## 2. A Solução (Proposta Premium)
Vamos reconstruir a apresentação deste gráfico para ser uma verdadeira "obra de arte" no painel, incluindo:
1. **Layout do Eixo Y Otimizado:** Aumentar a largura reservada para os nomes (`width={140}` ou mais) e garantir que o texto não sofra *word-wrap* forçado.
2. **Estética das Barras:** Aumentar o `barSize` para deixá-las mais encorpadas, usar cantos arredondados (`radius={[0, 4, 4, 0]}`) com espaçamento milimétrico, e aplicar `fillOpacity={1}`. Adicionar gradientes (via `<defs>`) se o Recharts permitir nesta versão.
3. **Labels Internos:** Adicionar os valores diretamente *na ponta* das barras ou dentro delas (quando houver espaço) para que o usuário bata o olho e já veja o valor sem precisar dar *hover* no mouse.
4. **Custom Tooltip de Elite:** Um tooltip *glassmorphism* super polido, com fundo semitransparente, blur, e formatação elegante para separar Entradas e Saídas na leitura rápida.
5. **Background Grid Discreto:** Linhas de grade verticais muito suaves (opacity 0.05) para guiar os olhos do leitor através das dimensões financeiras.
