import sys

with open('src/components/importacoes/CentralImportWizard.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_content = """      // 4. Salvar Daily Snapshot (Valores Globais)
      addLog("Calculando fechamento diario (auto-save)...", "info");
      
      let saldoNegativoItau = 0;
      let totalBancarioIn = 0;
      let totalOfxOut = 0;

      results.ofxResults.forEach(ofx => {
        if (ofx.bankBalance !== undefined && ofx.bankBalance < 0) {
          saldoNegativoItau += Math.abs(ofx.bankBalance);
        }
        ofx.transactions.forEach((t: any) => {
          if (t.type === 'in') totalBancarioIn += t.amount;
          if (t.type === 'out') totalOfxOut += Math.abs(t.amount);
        });
      });

      let jurosRedeTotal = 0;
      results.redeResults.forEach(r => {
        if (r.success) {
          r.transactions.forEach(t => {
             jurosRedeTotal += t.interest || 0;
          });
        }
      });

      let faturamentoAtual = 0;
      let veiculosPatioValor = 0;
      let reconciliationsToUpsert: any[] = [];
      
      results.osFiles.filter(r => r.success).forEach(r => {
        let storePatioValor = 0;
        let sId = mapping[r.storeAlias] || 'GLOBAL';

        r.osArray.forEach(os => {
           const delta = (os as any).delta_paid !== undefined ? (os as any).delta_paid : os.paid_value;
           if (delta > 0) faturamentoAtual += delta;
           
           const isPendente = os.status?.toLowerCase().includes('em_aberto') || os.status?.toLowerCase().includes('pago_parcial');
           if (isPendente) {
              const valorPendente = (os.total_value || 0) - (os.paid_value || 0);
              if (valorPendente > 0) storePatioValor += valorPendente;
           }
        });
        
        veiculosPatioValor += storePatioValor;
        if (sId !== 'GLOBAL') {
          reconciliationsToUpsert.push({
            store_id: sId,
            date: targetDate,
            na_loja_os: storePatioValor,
            status: 'validated'
          });
        }
      });

      if (reconciliationsToUpsert.length > 0) {
        addLog("Gravando valores de patio (reconciliations)...", "info");
        await supabase.from('reconciliations').upsert(reconciliationsToUpsert, { onConflict: 'store_id,date' });
      }

      const totalRecebiveis = manualDinheiroMp + manualAReceber;
      const caixaAtual = totalBancarioIn + totalRecebiveis;

      addLog("Auto-salvando Fechamento do Dia...", "info");
      try {
        const payload = {
          date: targetDate,
          caixa_atual: caixaAtual,
          faturamento: faturamentoAtual,
          dinheiro_mp: manualDinheiroMp,
          total_recebiveis: totalRecebiveis,
          total_patio: veiculosPatioValor,
          saldo_bancario: totalBancarioIn,
          a_receber_manual: manualAReceber,
          faturamento_outros_valor: 0,
          contas_a_pagar: totalOfxOut,
          provisao: 0,
          saldo_negativo_itau: saldoNegativoItau,
          juros_rede: jurosRedeTotal,
          notes: 'Valores calculados via Importacao',
        };
        await saveSnapshot.mutateAsync(payload);
        addLog("Historico de conciliacao atualizado automaticamente!", "success");
      } catch (snapErr) {
        console.warn("Erro ao salvar daily_snapshot:", snapErr);
        addLog("Aviso: Falha ao gravar fechamento do dia.", "warning");
      }
"""

start_idx = -1
end_idx = -1
for i, line in enumerate(lines):
    if '// 4. Salvar Daily Snapshot (Valores Globais)' in line:
        start_idx = i
    if 'Pareando transações importadas com Ordens de Serviço' in line and start_idx != -1:
        end_idx = i
        break

if start_idx != -1 and end_idx != -1:
    lines = lines[:start_idx] + [new_content + '\n'] + lines[end_idx:]
    with open('src/components/importacoes/CentralImportWizard.tsx', 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print('SUCCESS')
else:
    print('FAILED TO FIND INDICES')
