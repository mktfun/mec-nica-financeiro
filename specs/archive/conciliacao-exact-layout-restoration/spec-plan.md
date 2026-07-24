# Spec Plan: Restauração Exata do Visual Original da Conciliação (conciliacao-exact-layout-restoration)

## Tasks

- [ ] [FRONTEND] Restaurar container limpo e sóbrio em `src/components/conciliacao/ResumoDiaPanel.tsx`:
  - [ ] Remover orbes radiais 3D de fundo.
  - [ ] Restaurar estilo original: `relative rounded-2xl border backdrop-blur-3xl shadow-sm transition-colors duration-500 overflow-hidden`.
  - [ ] Manter os cartões das métricas da Aba Saldo sem sombras pesadas.
- [ ] [FRONTEND] Restaurar estilo original dos cards de loja em `src/routes/conciliacao.index.tsx`:
  - [ ] Restaurar `Card className="p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-6 transition-all hover:scale-[1.01] hover:bg-white/10 hover:border-white/20 cursor-pointer shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] border border-white/5 backdrop-blur-md"`.
  - [ ] Restaurar contêiner interno com `bg-black/20 p-4 rounded-xl border border-white/5 flex-1 font-sans tabular-nums text-xs`.
  - [ ] Manter as 6 colunas do Módulo 1 com tipografia Inter.
- [ ] [TEST] Verificar compilação limpa com `npm run build`.
