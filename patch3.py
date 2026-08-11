import re

with open('src/components/importacoes/CentralImportWizard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Update the rendering of AgentRunnerModal
agent_modal_replacement = """
      <AgentRunnerModal 
        isOpen={isAgentModalOpen} 
        onClose={() => setIsAgentModalOpen(false)} 
        stores={stores}
        onSuccess={handleCloudDataSuccess}
        runLocalFiles={async () => {
          if (pendingFiles.length > 0) {
            await processFiles(pendingFiles, { sessionId });
          }
        }}
      />
"""
content = re.sub(
    r"<AgentRunnerModal\s+isOpen=\{isAgentModalOpen\}\s+onClose=\{\(\) => setIsAgentModalOpen\(false\)\}\s+stores=\{stores\}\s+onSuccess=\{handleCloudDataSuccess\}\s+/>",
    agent_modal_replacement,
    content,
    flags=re.DOTALL
)

# Insert Step 3.5 rendering for Fallback Form
fallback_step_injection = """
        {step === 3.5 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <ManualOsFallbackForm 
              onSubmit={(entries) => {
                setManualOsData(entries);
                setStep(3); // volta pro step de preview pra mapear e ver faturamento
              }}
              onCancel={() => {
                setStep(3); // Pula
              }}
            />
          </div>
        )}
"""
content = content.replace(
    "{step === 3 && (",
    fallback_step_injection + "\n        {step === 3 && ("
)

# Fix step types because we added step 3.5
content = content.replace("useState<1 | 2 | 3 | 4>(1)", "useState<1 | 2 | 3 | 3.5 | 4>(1)")

# Finally, we must update the manual merging of Bot/Fallback OSs into the final snapshot (Task 7)
# But `CentralImportWizard` consolidates values from `results.osFiles` or `results.ofxResults`. 
# We need to add the Bot/Fallback OS to `faturamentoAtual` and `veiculosPatioValor`.
# The bot returns array in `cloudOsData`. Fallback returns in `manualOsData`.
# I'll inject that logic in `CentralImportWizard.tsx` line 672.

# But wait, it's safer to use python to replace the specific block.
math_injection = """
      let faturamentoAtual = 0;
      let veiculosPatioValor = 0;
      let reconciliationsToUpsert: any[] = [];
      
      // Process manual and cloud OS data for Patio & Faturamento
      const processOsItems = (items: any[], isManualFallback: boolean) => {
        items.forEach(c => {
          let sId = c.store_id || 'GLOBAL';
          const totalValue = Number(c.valor_original) || Number(c.valor_total) || 0;
          const openValue = Number(c.valor_em_aberto) || 0;
          const paidValue = isManualFallback ? (Number(c.valor_pago) || 0) : (totalValue - openValue);
          
          if (paidValue > 0) faturamentoAtual += paidValue;
          
          const isPendente = isManualFallback ? (openValue > 0 || (totalValue > paidValue)) : (c.status !== 'FIN' && c.status !== 'CAN');
          if (isPendente) {
            const pendente = isManualFallback ? (totalValue - paidValue) : openValue;
            if (pendente > 0) {
              veiculosPatioValor += pendente;
              if (sId !== 'GLOBAL') {
                const existing = reconciliationsToUpsert.find(r => r.store_id === sId);
                if (existing) {
                  existing.na_loja_os = (existing.na_loja_os || 0) + pendente;
                } else {
                  reconciliationsToUpsert.push({
                    store_id: sId,
                    date: targetDate,
                    na_loja_os: pendente,
                    status: 'validated'
                  });
                }
              }
            }
          }
        });
      };

      if (needsFallback && manualOsData.length > 0) {
         processOsItems(manualOsData, true);
      } else if (!needsFallback && cloudOsData.length > 0) {
         processOsItems(cloudOsData, false);
      }
"""

content = content.replace(
    "let faturamentoAtual = 0;\n      let veiculosPatioValor = 0;\n      let reconciliationsToUpsert: any[] = [];",
    math_injection
)

with open('src/components/importacoes/CentralImportWizard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
