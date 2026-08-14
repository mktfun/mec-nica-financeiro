# Plano de Execução: Spec 202

## Tasks

- [x] [FRONTEND/REACTIVE] Refatorar `src/components/importacoes/DailyImportView.tsx` com ciclo de estados reativos (Upload inicial -> Previews com abas de OFX/OS/Rede/Matches -> Ajuste de OSs Órfãs -> Inputs Manuais com Trava -> Inspetor JSON em tempo real -> Painel de Progresso e Logs).
- [x] [FRONTEND/MATCHES] Integrar o motor de auto-match no preview gerando a lista de casamentos (OS vs OFX / OS vs Cartão) e logs visuais antes do submit.
- [x] [FRONTEND/INSPECTOR] Adicionar o Inspetor JSON colapsável `<details>` com visual de código (`font-mono text-xs bg-zinc-950 text-emerald-400 border border-zinc-800`) e botão de cópia do payload.
- [x] [FRONTEND/INPUTS] Implementar trava de edição para os inputs manuais de Dinheiro, A Receber, Contas e Odômetro.
- [x] [QUALITY/GATE] Executar `cmd.exe /c "npm run build"` garantindo TypeScript limpo e bundling 100% verde.
- [x] [TEST] Testar o fluxo completo: upload de arquivos, visualização de previews de OFX/OS/Rede, inspeção do JSON, edição de OSs órfãs, trava de inputs e gravação com barra de progresso.
