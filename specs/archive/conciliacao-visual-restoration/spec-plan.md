# Spec Plan: RestauraçÁo Estética Total e Animações da ConciliaçÁo (conciliacao-visual-restoration)

## Tasks

- [ ] [FRONTEND] Reconstruir estética e iluminaçÁo ambiente em `src/components/conciliacao/ResumoDiaPanel.tsx`:
  - [ ] Adicionar orbes de iluminaçÁo ambiente radial (`blur-3xl` com opacidade adaptativa no topo/fundo).
  - [ ] Restaurar bordas translúcidas de alto contraste (`border-white/10`) e `backdrop-blur-3xl`.
  - [ ] Adicionar micro-animações escalonadas do Framer Motion em cada pilar e métrica.
  - [ ] Restaurar barra animada de progresso de metas.
- [ ] [FRONTEND] Restaurar dinamismo 3D e efeitos de hover nos cards de loja em `src/routes/conciliacao.index.tsx`:
  - [ ] Envolver cards em `motion.div` com delay progressivo (`index * 0.04`).
  - [ ] Adicionar elevaçÁo com `hover:scale-[1.015]`, borda brilhante e feixe de luz reflexivo (*shine hover*).
  - [ ] Manter as 6 colunas do Módulo 1 com tipografia fluída.
- [ ] [TEST] Verificar compilaçÁo limpa com `npm run build`.
