# Decisão do Conselho Técnico: Motor de Reconciliação Rede x OFX, Deduplicação e Alertas de Ingestão

**Data:** 11/09/2026  
**Status:** Consenso Aprovado  
**Escopo:** Pipeline ETL de Ingestão (CentralImportWizard), Motor Bipartido Determinístico (Greedy 1:1 + Lote MDR), Validação de Cobertura (OFX/OS/Rede) e Persistência Segura.

---

## 1. Personas e Posições (Rodada 1)

### O Pragmático
- **Diagnóstico:** O usuário precisa de uma experiência à prova de falhas: se ele subir o mesmo arquivo duas vezes por engano, o sistema não pode quebrar ou duplicar lançamentos. Deve alertar "Arquivo duplicado detectado" e usar apenas uma instância. Se a planilha da Rede tiver movimentação zero (R$ 0,00), descarta sumariamente.
- **Diretriz:** A lógica de matching fornecida pelo usuário em Python é simples, limpa e determinística. Devemos implementá-la diretamente em TypeScript como um motor bipartido (Previsto vs Realizado), sem dependência de LLM, com 3 vetores claros: `conciliados`, `nao_entrou` e `orfaos_banco`.

### O Cético
- **Diagnóstico:** As maiores falhas anteriores ocorreram por:
  1. Concorrência e desalinhamento temporal: tentar rodar matching antes da persistência no banco terminar ou buscando dados no banco que ainda não foram sincronizados.
  2. Extratos OFX que contêm transações de outros dias ou que misturam saídas e tarifas com entradas da adquirente.
  3. Ausência de validação de cobertura: o usuário fechava a conciliação sem saber se faltava o OFX de Mauá ou a OS de Piraporinha.
- **Diretriz:** O motor deve rodar em memória sobre os dados parseados e sanitizados antes de gravar, garantindo que `pos_transactions` já nasça com `settlement_status` correto (`entrou` ou `nao_entrou`).

### O Arquiteto
- **Diagnóstico:** Devemos estruturar em 3 camadas desacopladas e testáveis:
  1. **Sanitizador e Validador de Ingestão (`centralImportManager.ts` & Wizard):**
     - Deduplicação inteligente de arquivos (por hash/nome/loja).
     - Filtro de corte para Rede sem movimento (`totalNet <= 0`).
     - Scanner de Cobertura das 10 lojas ativas: exibe badges e alertas caso falte OFX ou OS de alguma filial.
  2. **Motor de Reconciliação Bipartido (`reconciliadorRedeOfx.ts`):**
     - Implementação pura da especificação:
       - Estágio 1: Greedy 1:1 ($\text{Data} \land |\text{Valor}| \le 0.01$).
       - Estágio 2: Lote por Bandeira / Estabelecimento com Tolerância MDR.
       - Segregação nos 3 vetores canônicos (`conciliados`, `nao_entrou`, `orfaos_banco`).
  3. **Persistência Transacional Idempotente:**
     - Grava `pos_transactions` com os status definitivos e os FITIDs do banco associados.
     - Proteção absoluta via chaves únicas (`dedup_hash` e `fitid`).

### O Advogado do Diabo
- **Diagnóstico:** No mundo real, a adquirente credita valores agrupados por bandeira/dia (ex: R$ 20.450,67 em Dom Pedro ou R$ 10.002,23 no Rei do Módulo) enquanto as vendas no relatório da Rede são transações individuais (micro-vendas). Se fizermos apenas 1:1 individual, vendas que somam um lote bancário cairiam como `nao_entrou`.
- **Diretriz:** O algoritmo deve combinar o Greedy 1:1 (para quando a adquirente credita por lote de bandeira ou venda individual) com o agrupamento por Lote de Repasse (`creditDate` + `bandeira`), exatamente como previsto na especificação de tolerância/MDR.

---

## 2. Refutação Cruzada e Alinhamento (Rodada 2)

- **O Pragmático aceita:** O agrupamento por lote de repasse é indispensável para evitar falsos "não entrou" em lojas onde o banco recebe um depósito consolidado diário.
- **O Cético concorda:** Executar o motor diretamente em memória durante o fluxo de importação elimina 100% dos bugs de race condition com o banco.
- **O Arquiteto consolida:** O usuário terá visibilidade total antes de confirmar: um painel de avisos informará "Extratos faltando: [X, Y]", "Arquivos duplicados ignorados: [Z]" e "Rede sem movimento descartada: [W]".

---

## 3. Síntese e Decisão Executiva (Rodada 3)

1. **Pipeline de Ingestão Sanitizado:**
   - **Deduplicação de OFX:** Detecta se a mesma conta/período foi importada mais de uma vez. Avisa o usuário e mantém apenas o arquivo mais completo/recente.
   - **Deduplicação de OS:** Detecta se a mesma filial teve a planilha de OS enviada duas vezes. Avisa o usuário e mantém apenas uma.
   - **Filtragem de Rede sem movimento:** Arquivos com total líquido igual a zero são descartados automaticamente, gerando notificação informativa ("Rede Loja X sem vendas - ignorada").
   - **Deduplicação de Rede:** Se a mesma loja enviar dois relatórios para o mesmo dia, emite alerta e considera apenas um.
   - **Matriz de Cobertura:** Exibe no Wizard a relação das 10 lojas ativas:
     - 🟢 OFX OK / 🔴 OFX Faltando
     - 🟢 OS OK / 🔴 OS Faltando
     - 🟢 Rede OK / ⚪ Sem Movimento
2. **Motor de Reconciliação Bipartido:**
   - Implementado em TypeScript puro espelhando a classe canônica `ReconciliadorRedeOFX`.
   - Produz os 3 vetores: `conciliados`, `nao_entrou`, `orfaos_banco`.
   - Aplica tolerância MDR para diferenças explicadas por taxas ou antecipações.
3. **Persistência Idempotente:**
   - Gravação definitiva com status `entrou` e `nao_entrou` diretamente no lote do wizard.
