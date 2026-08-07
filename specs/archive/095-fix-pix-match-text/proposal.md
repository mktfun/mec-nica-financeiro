# Proposal: O Mistério do PIX Fantasma (095)

## O que está acontecendo?
O Wipeout foi resolvido e a Maquininha agora está imortalizada. No entanto, o seu PIX sumiu do cálculo do Faturamento (ficando zerado), o que joga o valor inteiro do PIX esperado para a "Diferença".

Fui direto na matemática do cálculo do PIX e descobri o culpado.

### O Culpado 1: Filtro de Texto Restrito
No arquivo `useConciliacao.ts`, existe um bloco de código que vasculha o Extrato Bancário (OFX) atrás de PIX para somar no Faturamento. O problema é que ele faz isso **procurando por palavras específicas**:
```typescript
const txt = `${t.title} ${t.subtitle}`.toUpperCase();
return txt.includes('PIX') || txt.includes('TRANSF') || txt.includes('TED') || txt.includes('DOC');
```
Se o banco Itaú mandou a transaçÁo escrita como "DEP DINH", "CRED TEF", ou qualquer outra sigla que nÁo seja exatamente "PIX", o sistema a ignora completamente. Ele zera a contagem de PIX, joga o Faturamento pra baixo e acusa a Diferença.

### O Culpado 2: A Matemática do Front-End vs Banco de Dados
Na feature anterior (093), como o banco de dados estava sofrendo do "Efeito Wipeout", nós mudamos a tela para usar essa matemática solta baseada em texto (`pix_os`). Mas agora que o Wipeout foi consertado na 094, a verdade do Banco de Dados (`faturamento_real_ofx`) voltou a funcionar perfeitamente! E a verdade do Banco de Dados pega qualquer entrada vinculada (com *Match*), nÁo importando se o banco escreveu "PIX" ou "ABACAXI" no extrato.

## SoluçÁo Proposta
1. **Remover o Filtro de Texto (Backend):** Em `useConciliacao.ts`, qualquer transaçÁo do tipo Entrada (`in`) do OFX deve ser considerada apta a parear com o PIX esperado da OS, independentemente do que o banco escreveu no título. Afinal, dinheiro entrando é dinheiro entrando.
2. **Voltar para a Verdade Absoluta (Frontend):** No painel `conciliacao.index.tsx`, a fórmula do Faturamento vai deixar de usar o `pix_os` (que tem o bug de texto) e vai passar a usar o `faturamento_real_ofx`, que é a amarraçÁo real e salva no banco de dados.
   A fórmula ficará: `Faturamento = Maquininha + faturamento_real_ofx`.
