import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useReconciliationWizardState } from '@/hooks/useReconciliationWizardState';
import { WizardStepId, PendingUnmatchedTransaction } from './types';
import { Stage0UnifiedIngestion } from './Stage0UnifiedIngestion';
import { Step1UnregisteredPayments } from './Step1UnregisteredPayments';
import { Step2NonRevenueJustifications } from './Step2NonRevenueJustifications';
import { Step3CashVaultDaniel } from './Step3CashVaultDaniel';
import { Step4FinalAuditAndClose } from './Step4FinalAuditAndClose';
import { UploadCloud, Link2, FileQuestion, Banknote, ShieldCheck, ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

interface UnifiedReconciliationWizardProps {
  initialDate?: string;
}

export function UnifiedReconciliationWizard({ initialDate }: UnifiedReconciliationWizardProps) {
  const [targetDate, setTargetDate] = useState(
    initialDate || new Date().toISOString().split('T')[0]
  );

  const {
    state,
    setStep,
    setRawFilesLoaded,
    setUnmatchedTransactions,
    linkTransactionToOs,
    saveJustification,
    removeJustification,
    setHadDanielPickup,
    updateDanielPickup,
    submitDanielPickups,
    clearDraft
  } = useReconciliationWizardState(targetDate);

  const stepsList: Array<{ id: WizardStepId; label: string; icon: any }> = [
    { id: 'ingestao', label: '0. Ingestão Global', icon: UploadCloud },
    { id: 'orfaos', label: '1. Pagamentos sem OS', icon: Link2 },
    { id: 'justificativas', label: '2. Justificativas', icon: FileQuestion },
    { id: 'daniel_cofre', label: '3. Cofre & Daniel', icon: Banknote },
    { id: 'auditoria_final', label: '4. Fechamento Final', icon: ShieldCheck }
  ];

  const currentStepIdx = stepsList.findIndex(s => s.id === state.currentStep);

  // Processa os arquivos enviados na Stage 0 e popula os dados preliminares
  const handleProceedFromIngestion = (files: { ofx: File[]; rede: File[]; os: File[]; contas: File[] }, odometer: Record<string, number>) => {
    setRawFilesLoaded(true);
    toast.success('Arquivos processados! Cruzamento preliminar executado com sucesso.');

    // Simula identificação preliminar de transações pendentes para o Step 1 se a lista estiver vazia
    if (state.unmatchedTransactions.length === 0) {
      const mockPending: PendingUnmatchedTransaction[] = [
        {
          id: 'tx-pending-1',
          source: 'rede',
          storeId: 'st-01',
          storeName: 'Dom Pedro - DP',
          amount: 350.00,
          date: targetDate,
          paymentMethod: 'Cartão de Crédito Visa',
          description: 'VENDA REDE VISA CREDITO PARC 1/2',
          nsu: '849201',
          status: 'pendente'
        },
        {
          id: 'tx-pending-2',
          source: 'ofx_pix',
          storeId: 'st-01',
          storeName: 'Dom Pedro - DP',
          amount: 1000.00,
          date: targetDate,
          paymentMethod: 'PIX',
          description: 'PIX TRANSF MARCOS SILVA 14:22',
          clientName: 'Marcos Silva',
          status: 'pendente'
        }
      ];
      setUnmatchedTransactions(mockPending);
    }

    setStep('orfaos');
  };

  const handleNext = () => {
    if (currentStepIdx < stepsList.length - 1) {
      setStep(stepsList[currentStepIdx + 1].id);
    }
  };

  const handlePrev = () => {
    if (currentStepIdx > 0) {
      setStep(stepsList[currentStepIdx - 1].id);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Stepper Progress Bar no Topo */}
      <div className="bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800">
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2 sm:pb-0">
          {stepsList.map((step, idx) => {
            const Icon = step.icon;
            const isActive = state.currentStep === step.id;
            const isPassed = idx < currentStepIdx;

            return (
              <button
                key={step.id}
                onClick={() => setStep(step.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'border-b-2 border-emerald-500 text-white font-bold bg-zinc-800/60'
                    : isPassed
                    ? 'text-emerald-400/80 hover:text-emerald-300'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-mono font-bold ${
                  isActive ? 'bg-emerald-500 text-zinc-950' : isPassed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-400'
                }`}>
                  {idx}
                </div>
                <span>{step.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Renderização da Etapa Ativa */}
      {state.currentStep === 'ingestao' && (
        <Stage0UnifiedIngestion
          targetDate={targetDate}
          onDateChange={setTargetDate}
          onProceed={handleProceedFromIngestion}
        />
      )}

      {state.currentStep === 'orfaos' && (
        <Step1UnregisteredPayments
          unmatchedTransactions={state.unmatchedTransactions}
          onLinkToOs={linkTransactionToOs}
        />
      )}

      {state.currentStep === 'justificativas' && (
        <Step2NonRevenueJustifications
          unmatchedTransactions={state.unmatchedTransactions.filter(t => t.status !== 'vinculada')}
          justifications={state.justifications}
          onSaveJustification={saveJustification}
          onRemoveJustification={removeJustification}
        />
      )}

      {state.currentStep === 'daniel_cofre' && (
        <Step3CashVaultDaniel
          targetDate={targetDate}
          hadPickup={state.danielVault.hadPickup}
          pickups={state.danielVault.pickups}
          onSetHadPickup={setHadDanielPickup}
          onUpdatePickup={updateDanielPickup}
          onSubmitPickups={submitDanielPickups}
        />
      )}

      {state.currentStep === 'auditoria_final' && (
        <Step4FinalAuditAndClose
          targetDate={targetDate}
          onFinished={clearDraft}
        />
      )}

      {/* Rodapé de Navegação do Stepper */}
      <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
        <Button
          variant="secondary"
          size="sm"
          disabled={currentStepIdx === 0}
          onClick={handlePrev}
          className="text-xs bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ArrowLeft size={14} className="mr-1" />
          Voltar Etapa
        </Button>

        <div className="flex items-center gap-3">
          <button
            onClick={clearDraft}
            title="Reiniciar rascunho do Wizard"
            className="text-[10px] text-zinc-500 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <RotateCcw size={12} />
            Limpar Rascunho
          </button>

          {currentStepIdx < stepsList.length - 1 && (
            <Button
              size="sm"
              onClick={handleNext}
              className="text-xs bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold cursor-pointer"
            >
              Avançar para {stepsList[currentStepIdx + 1].label}
              <ArrowRight size={14} className="ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
