# Proposal: Suporte Transparente a Importação de Extratos Bancários em PDF (Itaú)

## 1. Problema
Anteriormente, o sistema aceitava apenas extratos bancários no formato `.ofx`. Quando o usuário recebia ou baixava extratos em `.pdf` do Banco Itaú Empresas e os subia na importação centralizada, o sistema os tratava indiscriminadamente como Mapa de Metas, gerando falhas e forçando conversões manuais ou retrabalho.

## 2. Solução
1. Detecção automática de Extratos Bancários Itaú em PDF no pipeline de importação central (`centralImportManager.ts`).
2. Parser especializado (`itauPdfParser.ts`) que extrai Razão Social, CNPJ, Agência, Conta Corrente, Saldos (Anterior, Final, Limite) e lançamentos com data, valor, tipo, contraparte, documento e FITID determinístico.
3. Ingestão direta como `NormalizedOfxResult` em `results.ofxResults` com deduplicação contínua contra arquivos OFX da mesma conta.
4. Resolução automática de lojas em `CentralImportWizard.tsx` por nome de arquivo e razão social.
