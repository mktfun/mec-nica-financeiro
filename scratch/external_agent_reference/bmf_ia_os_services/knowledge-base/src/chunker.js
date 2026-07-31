/**
 * Chunker (C4-DOC-002, Secao 1)
 * Divide o texto de um documento em trechos (chunks) de tamanho
 * limitado, respeitando fronteiras de parágrafo quando possível, com
 * sobreposição entre trechos consecutivos para não cortar uma frase
 * ao meio na fronteira exata do limite de tamanho.
 *
 * Função pura, sem I/O — testável isoladamente, sem precisar de banco
 * ou de um provedor de embeddings.
 */

function dividirEmChunks(texto, { tamanhoMaximo = 800, sobreposicao = 100 } = {}) {
  if (!texto || !texto.trim()) return [];

  const paragrafos = texto
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks = [];
  let atual = "";

  for (const paragrafo of paragrafos) {
    // Parágrafo sozinho já maior que o limite: quebra por frase.
    if (paragrafo.length > tamanhoMaximo) {
      if (atual) {
        chunks.push(atual.trim());
        atual = "";
      }
      const frases = paragrafo.split(/(?<=[.!?])\s+/);
      let bloco = "";
      for (const frase of frases) {
        if ((bloco + " " + frase).trim().length > tamanhoMaximo && bloco) {
          chunks.push(bloco.trim());
          bloco = bloco.slice(-sobreposicao) + " " + frase;
        } else {
          bloco = bloco ? bloco + " " + frase : frase;
        }
      }
      if (bloco.trim()) atual = bloco.trim();
      continue;
    }

    if ((atual + "\n\n" + paragrafo).length > tamanhoMaximo && atual) {
      chunks.push(atual.trim());
      const overlapTexto = atual.slice(-sobreposicao);
      atual = overlapTexto + "\n\n" + paragrafo;
    } else {
      atual = atual ? atual + "\n\n" + paragrafo : paragrafo;
    }
  }

  if (atual.trim()) chunks.push(atual.trim());
  return chunks;
}

module.exports = { dividirEmChunks };
