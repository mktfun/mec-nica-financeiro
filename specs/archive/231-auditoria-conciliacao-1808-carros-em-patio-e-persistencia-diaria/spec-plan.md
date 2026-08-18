# Spec Plan: Soma de Cartões Não Liquidados, Saldo de Pátio OS e Persistência por Data (231)

## Tasks

- [ ] [IMPORT/BACKEND] Somar as vendas de cartão que não caíram no extrato OFX no mesmo dia no Saldo Total / Caixa Atual.
- [ ] [PATIO/OS] Consolidar o Saldo de Carros em Pátio abatendo automaticamente os pagamentos recebidos no dia.
- [ ] [PERSISTENCE/VIEWS] Isolar e carregar fielmente os dados e a Diferença Final salva de cada data ao navegar pelo seletor de dias em `ResumoDiaPanel.tsx` e `conciliacao.index.tsx`.
- [ ] [QUALITY/GATE] Executar `cmd.exe /c "npm run build"` garantindo 0 erros.
- [ ] [GIT/SYNC] Sincronizar branches `main` e `master` no GitHub.
