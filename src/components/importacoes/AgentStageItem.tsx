import React from 'react';
import { CheckCircle2, Circle, Loader2, AlertCircle, FileText, CreditCard, Landmark, Layers } from 'lucide-react';

export type SubStep = {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'success' | 'error';
};

export type AgentStage = {
  id: string;
  title: string;
  status: 'pending' | 'running' | 'success' | 'error';
  subSteps: SubStep[];
};

interface AgentStageItemProps {
  stage: AgentStage;
}

const STAGE_META: Record<string, { icon: any; role: string }> = {
  os: {
    icon: FileText,
    role: 'Ordens de Serviço & Pátio'
  },
  maquininha: {
    icon: CreditCard,
    role: 'Vendas Rede & Taxas MDR'
  },
  ofx: {
    icon: Landmark,
    role: 'Extratos Bancários OFX'
  },
  salvar: {
    icon: Layers,
    role: 'Consolidação e Gravação do Fechamento'
  }
};

export function AgentStageItem({ stage }: AgentStageItemProps) {
  const isRunning = stage.status === 'running';
  const isSuccess = stage.status === 'success';
  const isPending = stage.status === 'pending';
  const isError = stage.status === 'error';

  const meta = STAGE_META[stage.id] || {
    icon: FileText,
    role: 'Processamento de Dados'
  };

  const IconComponent = meta.icon;

  return (
    <div 
      className={`border rounded-xl transition-all duration-200 overflow-hidden ${
        isRunning 
          ? 'bg-[var(--bg-surface-elevated)] border-[var(--color-primary)]/40 shadow-sm' 
          : isSuccess 
            ? 'bg-[var(--bg-surface)] border-[var(--border-subtle)]' 
            : 'bg-[var(--bg-canvas)] border-[var(--border-subtle)]/60 opacity-60'
      }`}
    >
      {/* Header do Card */}
      <div className="flex items-center justify-between px-4 py-3 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
            isRunning 
              ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)]' 
              : isSuccess 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                : 'bg-zinc-800/40 border-zinc-700/40 text-zinc-400'
          }`}>
            <IconComponent size={15} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h4 className={`font-semibold text-xs tracking-tight ${isSuccess ? 'text-[var(--text-primary)]' : isRunning ? 'text-[var(--text-primary)] font-bold' : 'text-[var(--text-secondary)]'}`}>
                {stage.title}
              </h4>
              {isRunning && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--color-primary)]/15 text-[var(--color-primary)] font-medium">
                  Processando
                </span>
              )}
              {isSuccess && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium">
                  OK
                </span>
              )}
            </div>
            <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
              {meta.role}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isRunning && <Loader2 size={14} className="animate-spin text-[var(--color-primary)]" />}
          {isSuccess && <CheckCircle2 size={14} className="text-emerald-400" />}
          {isPending && <Circle size={14} className="text-zinc-600" />}
          {isError && <AlertCircle size={14} className="text-rose-400" />}
        </div>
      </div>

      {/* Sub-Etapas */}
      {stage.subSteps.length > 0 && (
        <div className="p-3 pl-12 flex flex-col gap-1.5 bg-[var(--bg-canvas)]">
          {stage.subSteps.map((sub) => {
            const effectiveSubStatus = isSuccess ? 'success' : sub.status;
            return (
              <div key={sub.id} className="flex items-center justify-between text-[11px] font-mono">
                <div className="flex items-center gap-2">
                  {effectiveSubStatus === 'pending' && <Circle size={10} className="text-zinc-600" />}
                  {effectiveSubStatus === 'running' && <Loader2 size={10} className="animate-spin text-sky-400" />}
                  {effectiveSubStatus === 'success' && <CheckCircle2 size={10} className="text-emerald-400" />}
                  {effectiveSubStatus === 'error' && <AlertCircle size={10} className="text-rose-400" />}
                  <span className={effectiveSubStatus === 'success' ? 'text-zinc-300' : effectiveSubStatus === 'running' ? 'text-sky-300' : 'text-zinc-500'}>
                    {sub.label}
                  </span>
                </div>
                <span className="text-[9px] text-zinc-500">
                  {effectiveSubStatus === 'success' ? 'Concluído' : effectiveSubStatus === 'running' ? 'Executando' : 'Pendente'}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
